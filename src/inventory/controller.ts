import { knightEncounterActive } from '../rooms/post-show/knight-choreography.ts';
import { tennaEndingPhases } from '../battle/tenna/ending.ts';
import { isPelletCast } from '../battle/noelle/pellets.ts';
import { isProceedScene } from '../battle/noelle/proceed.ts';
import { canUseBattleAction } from '../battle/shared/availability.ts';
import { itemDefinitions, maxHP, partyNames } from '../game/config.ts';
import type { Elements } from '../game/dom.ts';
import type { GameState } from '../game/types.ts';
import { itemIds } from './identifiers.ts';
interface Dependencies {
  readonly state: GameState;
  readonly friendsWaiting: () => boolean;
  readonly $: Elements;
  readonly choiceDialogOpen: () => boolean;
  readonly toast: (t: string) => void;
}
/** Exploration and battle share inventory; action rules decide when an item can be consumed. */
export function createInventory(dependencies: Dependencies) {
  const state = dependencies.state;
  function memberInParty(name: string) {
    return (
      name === 'Kris' ||
      (name === 'Flowey' ? state.story.joined : state.story.teamJoined && !dependencies.friendsWaiting())
    );
  }
  function awayDescription(name: string) {
    return dependencies.friendsWaiting() && ['Ralsey', 'Susie'].includes(name)
      ? 'Waiting in Glitch World'
      : 'Not in party yet';
  }
  function updateInventoryMenu() {
    const carried = itemIds.filter((id) => (state.inventory.items[id] || 0) > 0);
    if (!state.selectedItem || !carried.includes(state.selectedItem)) state.selectedItem = '';
    dependencies.$('inventoryItem').replaceChildren();
    for (const id of carried) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.item = id;
      button.textContent = itemDefinitions[id].name + ' × ' + state.inventory.items[id];
      button.setAttribute('aria-pressed', String(state.selectedItem === id));
      if (state.selectedItem === id) button.className = 'primary';
      button.onclick = () => {
        state.selectedItem = id;
        updateInventoryMenu();
        dependencies.$('inventoryFeedback').textContent = '';
        (id === 'tpElixir' ? dependencies.$('useCandyButton') : dependencies.$('candyTarget')).focus();
      };
      dependencies.$('inventoryItem').append(button);
    }
    if (!carried.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No items yet.';
      dependencies.$('inventoryItem').append(empty);
    }
    dependencies.$('healingItemControls').hidden = !state.selectedItem;
    if (!memberInParty(state.candyTarget)) state.candyTarget = 'Kris';
    dependencies.$('partyHPList').replaceChildren();
    dependencies.$('candyTarget').replaceChildren();
    for (const name of partyNames) {
      const row = document.createElement('p');
      row.className = 'helptext';
      row.textContent =
        name +
        ' · HP: ' +
        state.partyHP[name] +
        ' / ' +
        maxHP +
        (memberInParty(name) ? '' : ' · ' + awayDescription(name));
      const bar = document.createElement('progress');
      bar.value = state.partyHP[name];
      bar.max = maxHP;
      bar.setAttribute('aria-label', name + ' HP');
      row.append(document.createElement('br'), bar);
      dependencies.$('partyHPList').append(row);
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name + (memberInParty(name) ? '' : ' (' + awayDescription(name) + ')');
      option.disabled = !memberInParty(name);
      dependencies.$('candyTarget').append(option);
    }
    dependencies.$('candyTarget').value = state.candyTarget;
    const hp = state.partyHP[state.candyTarget],
      item = state.selectedItem ? itemDefinitions[state.selectedItem] : undefined,
      tpItem = state.selectedItem === 'tpElixir';
    dependencies.$('itemHealingTarget').hidden = tpItem;
    dependencies.$('inventoryHP').textContent = state.candyTarget + ' HP: ' + hp + ' / ' + maxHP;
    dependencies.$('inventoryHPBar').value = hp;
    dependencies.$('inventoryHPBar').max = maxHP;
    dependencies.$('inventoryHPBar').setAttribute('aria-label', state.candyTarget + ' HP');
    dependencies.$('inventoryContents').textContent = carried.length
      ? 'Kris carries ' +
        carried.map((id) => itemDefinitions[id].name + ' × ' + state.inventory.items[id]).join(', ') +
        '.'
      : 'Kris has no items.';
    dependencies.$('inventoryItemDescription').textContent = item
      ? item.name +
        ' · ' +
        (tpItem && state.bossEncounter?.kind === 'dark'
          ? 'Gain 5% TP. Grazing stays at 1% TP in this battle.'
          : item.description)
      : carried.length
        ? 'Select an item to see what it does.'
        : 'Collect items to use them here.';
    const waitingForTurn = state.bossEncounter && !canUseBattleAction(state.bossEncounter, 'item');
    dependencies.$('useCandyButton').disabled =
      !item || (tpItem ? !state.bossEncounter : hp >= maxHP) || !!waitingForTurn;
    dependencies.$('useCandyButton').textContent = tpItem
      ? !state.bossEncounter
        ? 'Use TP Elixir during battle'
        : waitingForTurn
          ? 'Wait for your party’s turn'
          : 'Use TP Elixir'
      : waitingForTurn
        ? 'Wait for your party’s turn'
        : hp >= maxHP
          ? state.candyTarget + ' has full HP'
          : item
            ? 'Use ' + item.name + ' on ' + state.candyTarget
            : 'Use item';
  }
  function toggleInventory() {
    if (knightEncounterActive(state) && state.bossEncounter?.kind !== 'knights') return;
    if (['minigame', 'minigameIntro', ...tennaEndingPhases].includes(state.bossEncounter?.phase ?? ''))
      return;
    if (state.bossEncounter?.finalAttackComplete && state.bossEncounter.phase !== 'victory') return;
    if (isProceedScene(state.bossEncounter) || isPelletCast(state.bossEncounter)) return;
    if (state.death || state.holeFall || state.padJump || dependencies.choiceDialogOpen()) return;
    if (dependencies.$('inventoryDialog').open) {
      dependencies.$('inventoryDialog').close();
      return;
    }
    if (
      dependencies.$('helpDialog').open ||
      dependencies.$('saveDialog').open ||
      dependencies.$('objectEditDialog').open
    ) {
      dependencies.toast('Close the current menu, then press O for inventory.');
      return;
    }
    state.keys.clear();
    state.player.moving = false;
    state.selectedItem = '';
    updateInventoryMenu();
    dependencies.$('inventoryFeedback').textContent = '';
    dependencies.$('inventoryDialog').showModal();
  }
  return { updateInventoryMenu, toggleInventory, memberInParty };
}
