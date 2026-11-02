import { isPelletCast } from '../battle/noelle/pellets.ts';
import { isProceedScene } from '../battle/noelle/proceed.ts';
import { canPartyAct, canUseBattleAction } from '../battle/shared/availability.ts';
import { setupBattleControls } from '../battle/shared/controls.ts';
import { createEncounter, useBattleItem } from '../battle/shared/rules.ts';
import { createDialogue } from '../dialogue/controller.ts';
import { setupEditor } from '../editor/editor.ts';
import { rememberProject } from '../editor/history.ts';
import { downloadGame } from '../export/export-game.ts';
import { createInventory } from '../inventory/controller.ts';
import { useHealingItem } from '../inventory/healing.ts';
import { isPartyName } from '../inventory/identifiers.ts';
import { createPersistence } from '../persistence/controller.ts';
import { readInitialProject } from '../persistence/initial-project.ts';
import { readProgressSlots, validProgress } from '../persistence/progress.ts';
import type { ProgressSave } from '../persistence/types.ts';
import { createRenderer } from '../rendering/renderer.ts';
import { createTennaSprite } from '../rooms/backstage/tenna-sprite.ts';
import { createTennaEntrance } from '../rooms/backstage/tenna-story.ts';
import { createCore } from '../rooms/core/controller.ts';
import { createFountain } from '../rooms/fountain/controller.ts';
import { createGlitchArrival } from '../rooms/glitch-studio/arrival.ts';
import { createJackSprite } from '../rooms/monochrome-chamber/jackenstein.ts';
import { createQueenSprite } from '../rooms/queen-terminal/queen-sprite.ts';
import { clone } from '../world/clone.ts';
import { upgradeProject } from '../world/upgrades.ts';
import { validBuild, validColor, validProject } from '../world/validation.ts';
import { freshInventory, freshPartyHP, itemDefinitions, maxHP, tiles } from './config.ts';
import { context2D, element } from './dom.ts';
import { createEncounters } from './encounters.ts';
import { createHud } from './hud.ts';
import { createInput } from './input.ts';
import { createInteractions } from './interactions.ts';
import { present } from './invariants.ts';
import { createGameLoop } from './loop.ts';
import { createMovement } from './movement.ts';
import { createParty } from './party.ts';
import { createRoomController } from './room-controller.ts';
import { createGameState } from './state.ts';
import { createTravel } from './travel.ts';
// The game loop connects the rooms, player, story, saving, and drawing.
export function startGame() {
  // This plain object holds the changing game values, shared with the editor and drawings.
  // state is the game's notebook. Its values change while you play.
  const $ = element;
  const canvas = $('game'),
    ctx = context2D(canvas);
  const tennaPortrait = document.createElement('canvas');
  tennaPortrait.width = tennaPortrait.height = 64;
  createTennaSprite(context2D(tennaPortrait)).portrait();
  const jackPortrait = document.createElement('canvas');
  jackPortrait.width = jackPortrait.height = 64;
  createJackSprite(context2D(jackPortrait)).portrait();
  const queenPortrait = document.createElement('canvas');
  queenPortrait.width = queenPortrait.height = 64;
  createQueenSprite(context2D(queenPortrait)).portrait();
  const project = readInitialProject($('projectData').textContent ?? '');
  const state = createGameState(project);
  // Lazy service references connect controllers without circular imports or
  // reading neighboring controllers before startup has finished wiring them.
  const {
    save,
    buildSnapshot,
    finishBuildEdits,
    roomSavePoints,
    nearSavePoint,
    removeSavePoint,
    openProgressMenu,
    restoreProgress,
    savedPartyAlive,
  } = createPersistence({
    get $() {
      return $;
    },
    get state() {
      return state;
    },
    get endStroke() {
      return endStroke;
    },
    get current() {
      return current;
    },
    get toast() {
      return toast;
    },
    get remember() {
      return remember;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get isImportantCutscene() {
      return isImportantCutscene;
    },
    get announce() {
      return announce;
    },
    get resetBossEncounter() {
      return resetBossEncounter;
    },
    get closeDialogue() {
      return closeDialogue;
    },
    get preparePartyForRoom() {
      return preparePartyForRoom;
    },
    get collides() {
      return collides;
    },
    get positionPlayer() {
      return positionPlayer;
    },
    get resetFollower() {
      return resetFollower;
    },
    get updateRoomUI() {
      return updateRoomUI;
    },
    get storyUI() {
      return storyUI;
    },
    get canvas() {
      return canvas;
    },
    get partyStageForRoom() {
      return partyStageForRoom;
    },
  });
  const { updateInventoryMenu, toggleInventory, memberInParty } = createInventory({
    get $() {
      return $;
    },
    get state() {
      return state;
    },
    get friendsWaiting() {
      return friendsWaiting;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get toast() {
      return toast;
    },
  });
  const {
    friendsWaiting,
    ensureGlitchWaiting,
    roomWaitingFriends,
    partyStageForRoom,
    preparePartyForRoom,
    fountainFriends,
    partyFriends,
    nearFountainFriend,
    recruitFriends,
  } = createParty({
    get state() {
      return state;
    },
    get cellOpen() {
      return cellOpen;
    },
    get current() {
      return current;
    },
    get findStart() {
      return findStart;
    },
    get routeToPlayer() {
      return routeToPlayer;
    },
    get storyUI() {
      return storyUI;
    },
    get toast() {
      return toast;
    },
    get announce() {
      return announce;
    },
  });
  const {
    routeToPlayer,
    recruitFlowey,
    resetFollower,
    updateFollower,
    floweyPosition,
    nearFlowey,
    cellOpen,
    findStart,
    positionPlayer,
    collides,
    roomSpikes,
    updateSpikeContact,
    roomTrees,
  } = createMovement({
    get fountainFriends() {
      return fountainFriends;
    },
    get state() {
      return state;
    },
    get current() {
      return current;
    },
    get storyUI() {
      return storyUI;
    },
    get toast() {
      return toast;
    },
    get announce() {
      return announce;
    },
    get friendsWaiting() {
      return friendsWaiting;
    },
    get ensureGlitchWaiting() {
      return ensureGlitchWaiting;
    },
    get memberInParty() {
      return memberInParty;
    },
  });
  const { storyUI } = createHud({
    get $() {
      return $;
    },
    get state() {
      return state;
    },
    get friendsWaiting() {
      return friendsWaiting;
    },
    get current() {
      return current;
    },
  });
  const { changeRoom, roomBackground, updateRoomUI, setMode, roomNpcs } = createRoomController({
    get $() {
      return $;
    },
    get state() {
      return state;
    },
    get current() {
      return current;
    },
    get findStart() {
      return findStart;
    },
    get toast() {
      return toast;
    },
    get offerBossEntry() {
      return offerBossEntry;
    },
    get resetBossEncounter() {
      return resetBossEncounter;
    },
    get preparePartyForRoom() {
      return preparePartyForRoom;
    },
    get positionPlayer() {
      return positionPlayer;
    },
    get closeDialogue() {
      return closeDialogue;
    },
    get resetFollower() {
      return resetFollower;
    },
    get scheduleEncounter() {
      return scheduleEncounter;
    },
    get selectTool() {
      return selectTool;
    },
    get updateNpcUI() {
      return updateNpcUI;
    },
    get storyUI() {
      return storyUI;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get endStroke() {
      return endStroke;
    },
    get save() {
      return save;
    },
    get canvas() {
      return canvas;
    },
  });
  const { bindGameInput } = createInput({
    get $() {
      return $;
    },
    get canvas() {
      return canvas;
    },
    get state() {
      return state;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get dirKeys() {
      return dirKeys;
    },
    get talk() {
      return talk;
    },
    get importantKinds() {
      return importantKinds;
    },
    get advanceDialogue() {
      return advanceDialogue;
    },
    get closeDialogue() {
      return closeDialogue;
    },
    get isImportantCutscene() {
      return isImportantCutscene;
    },
    get skipDialogue() {
      return skipDialogue;
    },
    get inspectObject() {
      return inspectObject;
    },
    get endStroke() {
      return endStroke;
    },
  });
  const {
    nearbyNpc,
    speakToNpc,
    interactTrafficStop,
    nearbyCandyTree,
    takeTreeCandy,
    inspectJackLever,
    inspectObject,
  } = createInteractions({
    get $() {
      return $;
    },
    get state() {
      return state;
    },
    get npcAt() {
      return npcAt;
    },
    get current() {
      return current;
    },
    get openDialogue() {
      return openDialogue;
    },
    get toast() {
      return toast;
    },
    get announce() {
      return announce;
    },
    get roomTrees() {
      return roomTrees;
    },
    get storyUI() {
      return storyUI;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get advanceDialogue() {
      return advanceDialogue;
    },
    get inspectGoldenDoor() {
      return inspectGoldenDoor;
    },
    get nearHole() {
      return nearHole;
    },
    get offerHoleJump() {
      return offerHoleJump;
    },
    get nearSavePoint() {
      return nearSavePoint;
    },
    get openProgressMenu() {
      return openProgressMenu;
    },
    get interactFountain() {
      return interactFountain;
    },
  });
  const {
    facingFountain,
    interactFountain,
    startFountainDive,
    updateDive,
    divePose,
    openFountainScene,
    openBusterAfter,
  } = createFountain({
    get current() {
      return current;
    },
    get state() {
      return state;
    },
    get npcAt() {
      return npcAt;
    },
    get openDialogue() {
      return openDialogue;
    },
    get announce() {
      return announce;
    },
    get changeRoom() {
      return changeRoom;
    },
    get toast() {
      return toast;
    },
    get storyUI() {
      return storyUI;
    },
  });
  const {
    openDialogue,
    talk,
    renderDialogue,
    isImportantCutscene,
    skipDialogue,
    advanceDialogue,
    closeDialogue,
  } = createDialogue({
    get $() {
      return $;
    },
    get state() {
      return state;
    },
    get announce() {
      return announce;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get inspectJackLever() {
      return inspectJackLever;
    },
    get interactTrafficStop() {
      return interactTrafficStop;
    },
    get inspectGoldenDoor() {
      return inspectGoldenDoor;
    },
    get nearHole() {
      return nearHole;
    },
    get offerHoleJump() {
      return offerHoleJump;
    },
    get nearSavePoint() {
      return nearSavePoint;
    },
    get openProgressMenu() {
      return openProgressMenu;
    },
    get takeTreeCandy() {
      return takeTreeCandy;
    },
    get interactFountain() {
      return interactFountain;
    },
    get nearbyNpc() {
      return nearbyNpc;
    },
    get speakToNpc() {
      return speakToNpc;
    },
    get nearFountainFriend() {
      return nearFountainFriend;
    },
    get friendsWaiting() {
      return friendsWaiting;
    },
    get current() {
      return current;
    },
    get openFountainScene() {
      return openFountainScene;
    },
    get nearFlowey() {
      return nearFlowey;
    },
    get toast() {
      return toast;
    },
    get tennaPortrait() {
      return tennaPortrait;
    },
    get jackPortrait() {
      return jackPortrait;
    },
    get queenPortrait() {
      return queenPortrait;
    },
    get importantKinds() {
      return importantKinds;
    },
    get beginTennaArrival() {
      return beginTennaArrival;
    },
    get storyUI() {
      return storyUI;
    },
    get syncBossUI() {
      return syncBossUI;
    },
    get canvas() {
      return canvas;
    },
    get changeRoom() {
      return changeRoom;
    },
    get openGoldenDoorChoice() {
      return openGoldenDoorChoice;
    },
    get startFountainDive() {
      return startFountainDive;
    },
    get recruitFlowey() {
      return recruitFlowey;
    },
    get openBusterAfter() {
      return openBusterAfter;
    },
    get recruitFriends() {
      return recruitFriends;
    },
    get finishGlitchComfort() {
      return finishGlitchComfort;
    },
  });
  const { tryJumpPad, updatePadJump, nearHole, offerHoleJump, backFromHole, updateHoleFall } = createTravel({
    get $() {
      return $;
    },
    get current() {
      return current;
    },
    get state() {
      return state;
    },
    get cellOpen() {
      return cellOpen;
    },
    get toast() {
      return toast;
    },
    get announce() {
      return announce;
    },
    get changeRoom() {
      return changeRoom;
    },
    get positionPlayer() {
      return positionPlayer;
    },
    get resetFollower() {
      return resetFollower;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get canvas() {
      return canvas;
    },
    get storyUI() {
      return storyUI;
    },
    get openDialogue() {
      return openDialogue;
    },
  });
  const {
    nearGoldenDoor,
    openCoreGlitchConversation,
    openCoreConversation,
    openGoldenDoorConversation,
    openGoldenDoorChoice,
    stayAtGoldenDoors,
    inspectGoldenDoor,
    tryCoreSpikeFall,
  } = createCore({
    get $() {
      return $;
    },
    get current() {
      return current;
    },
    get state() {
      return state;
    },
    get openDialogue() {
      return openDialogue;
    },
    get announce() {
      return announce;
    },
    get canvas() {
      return canvas;
    },
    get nearSavePoint() {
      return nearSavePoint;
    },
    get roomSpikes() {
      return roomSpikes;
    },
    get findStart() {
      return findStart;
    },
    get closeDialogue() {
      return closeDialogue;
    },
  });
  const {
    syncBossUI,
    resetBossEncounter,
    finishNoelleConfrontation,
    offerBossEntry,
    declineBossEntry,
    partyHasFallen,
    beginDeath,
  } = createEncounters({
    get $() {
      return $;
    },
    get state() {
      return state;
    },
    get battleControls() {
      return battleControls;
    },
    get openDialogue() {
      return openDialogue;
    },
    get storyUI() {
      return storyUI;
    },
    get canvas() {
      return canvas;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get announce() {
      return announce;
    },
    get current() {
      return current;
    },
    get changeRoom() {
      return changeRoom;
    },
    get positionPlayer() {
      return positionPlayer;
    },
    get resetFollower() {
      return resetFollower;
    },
    get memberInParty() {
      return memberInParty;
    },
    get closeDialogue() {
      return closeDialogue;
    },
  });
  const { openGlitchArrival, updateGlitchComfort, glitchComfortPose, finishGlitchComfort } =
    createGlitchArrival({
      get state() {
        return state;
      },
      get cellOpen() {
        return cellOpen;
      },
      get current() {
        return current;
      },
      get openDialogue() {
        return openDialogue;
      },
      get reducedParticleMotion() {
        return reducedParticleMotion;
      },
      get routeToPlayer() {
        return routeToPlayer;
      },
      get storyUI() {
        return storyUI;
      },
    });
  const { frame } = createGameLoop({
    get $() {
      return $;
    },
    get state() {
      return state;
    },
    get partyHasFallen() {
      return partyHasFallen;
    },
    get beginDeath() {
      return beginDeath;
    },
    get choiceDialogOpen() {
      return choiceDialogOpen;
    },
    get openDialogue() {
      return openDialogue;
    },
    get updatePadJump() {
      return updatePadJump;
    },
    get updateHoleFall() {
      return updateHoleFall;
    },
    get updateDive() {
      return updateDive;
    },
    get storyUI() {
      return storyUI;
    },
    get announce() {
      return announce;
    },
    get openBusterAfter() {
      return openBusterAfter;
    },
    get current() {
      return current;
    },
    get openFountainScene() {
      return openFountainScene;
    },
    get syncBossUI() {
      return syncBossUI;
    },
    get canvas() {
      return canvas;
    },
    get resetBossEncounter() {
      return resetBossEncounter;
    },
    get finishNoelleConfrontation() {
      return finishNoelleConfrontation;
    },
    get updateGlitchComfort() {
      return updateGlitchComfort;
    },
    get renderDialogue() {
      return renderDialogue;
    },
    get beginTennaArrival() {
      return beginTennaArrival;
    },
    get offerBossEntry() {
      return offerBossEntry;
    },
    get openGlitchArrival() {
      return openGlitchArrival;
    },
    get openCoreGlitchConversation() {
      return openCoreGlitchConversation;
    },
    get openCoreConversation() {
      return openCoreConversation;
    },
    get roomNpcs() {
      return roomNpcs;
    },
    get speakToNpc() {
      return speakToNpc;
    },
    get nearGoldenDoor() {
      return nearGoldenDoor;
    },
    get openGoldenDoorConversation() {
      return openGoldenDoorConversation;
    },
    get changeRoom() {
      return changeRoom;
    },
    get collides() {
      return collides;
    },
    get updateFollower() {
      return updateFollower;
    },
    get resetFollower() {
      return resetFollower;
    },
    get toast() {
      return toast;
    },
    get tryCoreSpikeFall() {
      return tryCoreSpikeFall;
    },
    get tryJumpPad() {
      return tryJumpPad;
    },
    get nearHole() {
      return nearHole;
    },
    get offerHoleJump() {
      return offerHoleJump;
    },
    get updateSpikeContact() {
      return updateSpikeContact;
    },
    get render() {
      return render;
    },
  });
  function choiceDialogOpen() {
    return (['holeChoiceDialog', 'goldenDoorChoiceDialog', 'bossChoiceDialog'] as const).some(
      (id) => $(id).open,
    );
  }
  const current = () => state.project.rooms[state.roomIndex];
  const announce = (t: string) => {
    $('announcement').textContent = t;
  };
  function toast(t: string) {
    $('toast').textContent = t;
    $('toast').hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => ($('toast').hidden = true), 3500);
  }
  // localStorage keeps a browser copy after refresh. Build saves and adventure slots stay separate.
  $('saveBuildButton').onclick = () => {
    if (state.mode !== 'build') return;
    finishBuildEdits();
    if (save()) {
      toast('Build saved! Your room edits will be kept when you load an adventure.');
      announce('Build saved in this browser.');
    } else toast('Your build could not be saved. Use Download backup to keep it.');
  };
  $('downloadBuildButton').onclick = () => {
    if (state.mode !== 'build') return;
    finishBuildEdits();
    save();
    const blob = new Blob([JSON.stringify(buildSnapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'LittleLantern-Build.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Build backup downloaded. Use Restore backup to bring it back.');
  };
  $('restoreBuildButton').onclick = () => {
    if (state.mode === 'build') $('buildFileInput').click();
  };
  $('buildFileInput').onchange = async (e) => {
    const file = $('buildFileInput').files?.[0];
    $('buildFileInput').value = '';
    if (!file || state.mode !== 'build') return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Backup too large');
      const build: unknown = JSON.parse(await file.text());
      if (!validBuild(build)) throw new Error('Invalid build backup');
      if (state.mode !== 'build') return;
      const restored = upgradeProject(clone(build.project));
      if (!validProject(restored)) throw new Error('Invalid updated build');
      finishBuildEdits();
      const scene = current().scene,
        previousIndex = state.roomIndex;
      remember();
      state.project = restored;
      const matchingRoom = scene
        ? state.project.rooms.findIndex((room) => room.scene === scene)
        : previousIndex;
      state.roomIndex = matchingRoom >= 0 && matchingRoom < state.project.rooms.length ? matchingRoom : 0;
      state.pendingPad = null;
      state.selectedNpcId = null;
      state.keys.clear();
      const kept = save();
      updateRoomUI();
      canvas.focus({ preventScroll: true });
      toast(
        kept
          ? 'Build backup restored. Your adventure slots were kept. Undo can bring back the previous build.'
          : 'Build restored for this session. Browser storage is unavailable; keep your backup file.',
      );
    } catch {
      toast(
        'This file is not a valid Little Lantern build backup. Your build and adventure saves were kept.',
      );
    }
  };
  $('candyTarget').onchange = (e) => {
    const target = $('candyTarget').value;
    if (isPartyName(target)) state.candyTarget = target;
    updateInventoryMenu();
    $('inventoryFeedback').textContent = '';
  };
  $('inventoryButton').onclick = toggleInventory;
  $('closeInventoryButton').onclick = () => $('inventoryDialog').close();
  $('inventoryDialog').addEventListener('close', () => {
    if (canPartyAct(state.bossEncounter)) {
      present(state.bossEncounter).screen = 'menu';
      syncBossUI();
    }
    state.keys.clear();
    canvas.focus({ preventScroll: true });
  });
  $('useCandyButton').onclick = () => {
    const hp = state.partyHP[state.candyTarget],
      item = state.selectedItem ? itemDefinitions[state.selectedItem] : undefined;
    if (
      !$('inventoryDialog').open ||
      (state.bossEncounter && !canUseBattleAction(state.bossEncounter, 'item')) ||
      !item ||
      !state.selectedItem ||
      !(state.inventory.items[state.selectedItem] > 0) ||
      (state.selectedItem !== 'tpElixir' && (hp >= maxHP || !memberInParty(state.candyTarget)))
    )
      return;
    const result = state.bossEncounter
      ? useBattleItem(
          state.bossEncounter,
          state.partyHP,
          state.inventory,
          state.selectedItem,
          state.candyTarget,
        )
      : useHealingItem(state.partyHP, state.inventory, state.selectedItem, state.candyTarget);
    if (!result) return;
    const message =
      result.message || `${state.candyTarget} used ${item.name} and recovered ${result.restored} HP.`;
    if (state.bossEncounter) {
      syncBossUI();
      $('inventoryDialog').close();
    }
    storyUI();
    updateInventoryMenu();
    $('inventoryFeedback').textContent = message;
    announce(message);
  };
  document.addEventListener(
    'keydown',
    (e) => {
      if (
        (e.key.toLowerCase() !== 'o' && e.code !== 'KeyO') ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.isComposing ||
        e.repeat
      )
        return;
      const typing = (node: EventTarget | null) =>
        node instanceof HTMLElement &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName) || node.isContentEditable);
      if (!$('inventoryDialog').open && (typing(e.target) || typing(document.activeElement))) return;
      e.preventDefault();
      toggleInventory();
    },
    true,
  );
  $('loadGameButton').onclick = () => openProgressMenu('load');
  $('closeSaveDialog').onclick = () => $('saveDialog').close();
  $('saveDialog').addEventListener('close', () => {
    state.keys.clear();
    canvas.focus({ preventScroll: true });
  });
  function remember() {
    rememberProject(state);
    $('undoButton').disabled = false;
  }
  function scheduleEncounter() {
    state.story.emerging = -1;
    state.story.discussion = -1;
    if (
      state.mode === 'play' &&
      current().scene === 'fountain' &&
      state.story.joined &&
      !state.story.teamJoined
    ) {
      state.story.discussion = 0.75;
      state.keys.clear();
    }
    if (
      state.mode === 'play' &&
      current().scene === 'worlds' &&
      state.story.joined &&
      !state.story.explained
    ) {
      state.story.discussion = 0.65;
      state.keys.clear();
    }
    if (state.mode === 'play' && state.roomIndex === 1 && !state.story.met && !state.story.joined) {
      state.story.emerging = 0.85;
      state.story.reveal = 0;
      state.keys.clear();
    }
  }
  $('roomBackgroundColor').onchange = (e) => {
    if (!validColor($('roomBackgroundColor').value) || $('roomBackgroundColor').value === roomBackground())
      return;
    remember();
    current().backgroundColor = $('roomBackgroundColor').value;
    save();
  };
  $('resetRoomBackground').onclick = () => {
    if (current().backgroundColor === undefined) return;
    remember();
    delete current().backgroundColor;
    save();
    updateRoomUI();
  };
  const { selectTool, updateNpcUI, roomObjectGroups, endStroke, npcAt } = setupEditor(state, {
    roomNpcs,
    $,
    roomSpikes,
    roomTrees,
    fountainFriends,
    toast,
    remember,
    save,
    roomSavePoints,
    canvas,
    setMode,
    readProgressSlots,
    updateRoomUI,
    removeSavePoint,
    cellOpen,
    advanceDialogue,
  });
  const dirKeys: Record<string, string> = {
    ArrowUp: 'up',
    w: 'up',
    W: 'up',
    ArrowDown: 'down',
    s: 'down',
    S: 'down',
    ArrowLeft: 'left',
    a: 'left',
    A: 'left',
    ArrowRight: 'right',
    d: 'right',
    D: 'right',
  };
  bindGameInput();
  const importantKinds = new Set([
    'fountain',
    'busterWindup',
    'busterAfter',
    'fountainDive',
    'floweyHesitate',
    'fountainArrival',
    'coreIntro',
    'noelleAftermath',
    'studioIntro',
    'tennaArrival',
    'tennaBackstage',
    'tennaStorageGift',
    'queenIntro',
    'queenSuccess',
    'collisionIntro',
    'darkIntro',
    'darkShine',
    'jackReveal',
    'jackLeverFound',
    'jackReward',
    'tennaFinale',
    'tennaOpening',
    'tennaMinigame',
    'tennaHelpers',
    'tennaCut',
  ]);
  // A short path connects Flowey to Kris initially. After that he follows the
  // actual movement trail, so he takes the same turns around the castle walls.
  $('inspectButton').onclick = () => {
    inspectObject();
    canvas.focus({ preventScroll: true });
  };
  $('talkButton').onclick = () => {
    talk();
    canvas.focus({ preventScroll: true });
  };
  $('restartButton').onclick = () => {
    resetBossEncounter();
    $('bossChoiceDialog').close();
    state.pendingBossRoom = null;
    state.glitchComfort = null;
    state.glitchWaiting = null;
    state.padJump = null;
    state.pendingPad = null;
    state.lastPadContact = null;
    state.holeFall = null;
    $('holeChoiceDialog').close();
    state.death = null;
    $('gameOverDialog').close();
    state.partyHP = freshPartyHP();
    state.candyTarget = 'Kris';
    state.selectedItem = '';
    state.inventory = freshInventory();
    state.treeHarvests = {};
    state.story.met = false;
    state.story.joined = false;
    state.story.emerging = -1;
    state.story.reveal = 0;
    state.story.discussion = -1;
    state.story.explained = false;
    state.story.foundFountain = false;
    state.story.fountainWorse = false;
    state.story.teamJoined = false;
    state.story.dived = false;
    state.story.goldenDoorExplained = false;
    state.story.coreExplained = false;
    state.story.coreFroggitWarned = false;
    state.story.coreGlitchNoticed = false;
    state.story.glitchArrivalSeen = false;
    state.story.noelleGone = false;
    state.story.noelleEscaped = false;
    state.story.studioExplained = false;
    state.story.tennaInvited = false;
    state.story.tennaStorageInvited = false;
    state.story.tennaElixirsReceived = false;
    state.story.tennaFinaleExplained = false;
    state.story.jackCandyReceived = false;
    state.story.jackRevealed = false;
    state.story.collisionSeen = false;
    state.story.darkBattleSeen = false;
    state.story.queenBriefed = false;
    state.story.queenDemoSeen = false;
    state.story.queenSolved = false;
    state.tennaEntrance = null;
    state.collisionBlackout = null;
    state.queenPuzzle = null;
    state.queenDeparture = null;
    state.companions = [];
    state.buster = null;
    state.dive = null;
    state.follower = { x: 0, y: 0, trail: [] };
    changeRoom(0);
    canvas.focus({ preventScroll: true });
    toast('Kris wakes in the old castle once more.');
  };
  $('helpButton').onclick = () => {
    state.keys.clear();
    $('helpDialog').showModal();
  };
  $('closeHelp').onclick = () => {
    $('helpDialog').close();
    canvas.focus({ preventScroll: true });
  };
  $('helpDialog').addEventListener('click', (e) => {
    if (e.target === $('helpDialog')) {
      const r = $('helpDialog').getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        $('helpDialog').close();
    }
  });
  $('downloadButton').onclick = async () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    endStroke();
    save();
    try {
      await downloadGame(state.project);
      toast('Your game copy is downloading. Keep it somewhere you can find it.');
    } catch (error) {
      console.error(error);
      toast('Could not create the download. Your game and saved edits are still here. Please try again.');
    }
  };
  $('declineBossButton').onclick = declineBossEntry;
  $('bossChoiceDialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    declineBossEntry();
  });
  $('proceedBossButton').onclick = () => {
    const destination = state.pendingBossRoom;
    state.pendingBossRoom = null;
    $('bossChoiceDialog').close();
    if (!Number.isInteger(destination) || !changeRoom(present(destination), true, undefined, true)) return;
    // Direct workshop starts also respect Susie and Ralsey's story departure.
    state.story.glitchArrivalSeen = true;
    ensureGlitchWaiting();
    state.companions = [];
    state.bossEncounter = createEncounter(state.story.noelleGone, state.story.noelleEscaped);
    syncBossUI();
    storyUI();
    if (!state.story.noelleGone)
      openDialogue(['[Kris] * Noelle, is that you?', "[Narrator] * She doesn't respond."], 'bossIntro');
    canvas.focus({ preventScroll: true });
  };
  $('leaveBossButton').onclick = () => {
    if (['dark', 'tenna'].includes(state.bossEncounter?.kind ?? '')) {
      resetBossEncounter();
      state.collisionBlackout = null;
      canvas.focus({ preventScroll: true });
      return;
    }
    if (isProceedScene(state.bossEncounter) || isPelletCast(state.bossEncounter)) return;
    if (state.bossEncounter?.finalAttackComplete && state.bossEncounter.phase !== 'victory') return;
    const walkway = state.project.rooms.findIndex((room) => room.scene === 'glitchWorld');
    if (walkway >= 0) changeRoom(walkway, true, { x: 14, y: 6 });
    canvas.focus({ preventScroll: true });
  };
  $('stayAtGoldenDoorButton').onclick = stayAtGoldenDoors;
  $('goldenDoorChoiceDialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    stayAtGoldenDoors();
  });
  $('enterGoldenDoorButton').onclick = () => {
    const destination = state.project.rooms.findIndex((room) => room.scene === 'darkFurnace');
    if (destination < 0) {
      toast('The furnace room could not be added because this game has reached its room limit.');
      return;
    }
    $('goldenDoorChoiceDialog').close();
    state.keys.clear();
    changeRoom(destination, true);
    announce('Your party enters the furnace chamber.');
  };
  $('backFromHoleButton').onclick = backFromHole;
  $('holeChoiceDialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    backFromHole();
  });
  $('jumpHoleButton').onclick = () => {
    const actors = [
      { name: 'Kris', x: state.player.x, y: state.player.y },
      ...(state.story.joined ? [{ name: 'Flowey', x: state.follower.x, y: state.follower.y }] : []),
      ...(state.story.teamJoined
        ? state.companions.map((member) => ({ name: member.name, x: member.x, y: member.y }))
        : []),
    ];
    state.holeFall = { age: 0, actors };
    $('holeChoiceDialog').close();
    state.keys.clear();
    closeDialogue();
    announce('The party jumps into the hole.');
  };
  $('gameOverDialog').addEventListener('cancel', (e) => e.preventDefault());
  $('retryGameButton').onclick = () => {
    try {
      const latest = readProgressSlots()
        .filter(validProgress)
        .filter(savedPartyAlive)
        .reduce<ProgressSave | null>(
          (newest, slot) => (!newest || slot.savedAt > newest.savedAt ? slot : newest),
          null,
        );
      if (latest) restoreProgress(latest);
      else $('restartButton').click();
    } catch {
      $('retryFeedback').textContent = 'Could not read save storage. Your saves have not been changed.';
    }
  };
  function beginTennaArrival() {
    state.tennaEntrance = createTennaEntrance();
    state.keys.clear();
    state.player.moving = false;
    announce('Tenna jumps into the studio!');
  }
  // dt means elapsed seconds. Multiplying speed by dt keeps walking steady on different screens.
  // Each frame updates the rules, draws the result, then asks the browser for another frame.
  const battleControls = setupBattleControls(state, {
    $,
    canvas,
    directionKeys: dirKeys,
    openItems: toggleInventory,
    announce,
    onChange: syncBossUI,
  });
  const { render, reducedParticleMotion } = createRenderer(ctx, state, {
    roomBackground,
    $,
    roomSavePoints,
    glitchComfortPose,
    roomNpcs,
    roomTrees,
    roomWaitingFriends,
    roomSpikes,
    roomObjectGroups,
    divePose,
    floweyPosition,
    partyFriends,
    facingFountain,
    nearbyCandyTree,
    nearbyNpc,
    nearFountainFriend,
    nearFlowey,
    fountainFriends,
    nearSavePoint,
    importantKinds,
    friendsWaiting,
  });
  positionPlayer(current());
  updateRoomUI();
  // A downloaded copy may contain the editor's previous DOM state; always start
  // in Explore and rebuild controls from the embedded project, not that state.
  $('palette').replaceChildren(...Array.from($('palette').children).slice(-tiles.length));
  $('playMode').setAttribute('aria-pressed', 'true');
  $('buildMode').setAttribute('aria-pressed', 'false');
  $('explorePanel').hidden = false;
  $('buildPanel').hidden = true;
  $('playControls').hidden = false;
  $('editorCaption').hidden = true;
  $('dialogue').hidden = true;
  $('toast').hidden = true;
  $('pageHeading').textContent = 'Two worlds. One strange awakening.';
  $('pageSubtitle').textContent = 'You are Kris. An old castle waits beyond the dark.';
  $('stageMode').textContent = 'YOUR ADVENTURE';
  storyUI();
  $('undoButton').disabled = true;
  selectTool(0);
  resetBossEncounter();
  // Refresh resumes the most recently written slot, regardless of its slot number.
  try {
    const latest = readProgressSlots()
      .filter(validProgress)
      .reduce<ProgressSave | null>(
        (newest, slot) => (!newest || slot.savedAt > newest.savedAt ? slot : newest),
        null,
      );
    if (latest) restoreProgress(latest);
  } catch {
    toast('Could not read your saves. Use Load game to check save storage.');
  }
  window.addEventListener('pagehide', () => {
    endStroke();
    save();
  });
  requestAnimationFrame(frame);
}
