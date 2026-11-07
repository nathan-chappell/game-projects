import { canControlSoul, canPartyAct } from '../battle/shared/availability.ts';
import { isProceedScene } from '../battle/noelle/proceed.ts';
import { knightEncounterActive } from '../rooms/post-show/knight-choreography.ts';
import type { Elements } from './dom.ts';
import type { GameState } from './types.ts';

export function bindMobileControls(
  state: GameState,
  $: Elements,
  actions: {
    confirmBattle: () => void;
    backBattle: () => void;
    talk: () => void;
    advanceDialogue: () => void;
    inspect: () => void;
    inventory: () => void;
  },
) {
  const available = () => state.mode === 'play' && !state.death && !document.querySelector('dialog[open]');
  $('mobileConfirm').onclick = () => {
    if (!available()) return;
    if (state.dialogue) actions.advanceDialogue();
    else if (state.bossEncounter?.phase === 'minigame') $('battleMinigameShoot').click();
    else if (state.bossEncounter) actions.confirmBattle();
    else actions.talk();
  };
  $('mobileBack').onclick = () => {
    if (available()) actions.backBattle();
  };
  $('mobileInspect').onclick = () => {
    if (available()) actions.inspect();
  };
  $('mobileInventory').onclick = () => {
    if (available()) actions.inventory();
  };
  $('mobileInvincible').onclick = () => {
    if (available()) $('battleKnightInvincible').click();
  };
  $('mobileSkip').onclick = () => {
    if (available()) $('battleKnightSkip').click();
  };
}

/** The overlay shares the existing action handlers and held-direction input. */
export function syncMobileControls(state: GameState, $: Elements) {
  const battle = state.bossEncounter;
  const hidden = state.mode !== 'play' || !!state.death || !!document.querySelector('dialog[open]');
  if (hidden && !$('mobileGameControls').hidden) state.keys.clear();
  $('mobileGameControls').hidden = hidden;
  const soul = canControlSoul(battle);
  const walking =
    !battle &&
    !state.dialogue &&
    !state.dive &&
    !state.padJump &&
    !state.holeFall &&
    !state.tennaEntrance &&
    !state.collisionBlackout &&
    !knightEncounterActive(state);
  $('mobileDpad').hidden = !walking && !soul;
  $('mobileRun').hidden = !walking;
  $('mobileInspect').hidden = !walking;
  $('mobileInventory').hidden = !walking;
  $('mobileConfirm').hidden =
    !state.dialogue &&
    !(
      walking ||
      canPartyAct(battle) ||
      battle?.phase === 'rescue' ||
      isProceedScene(battle) ||
      battle?.phase === 'minigame'
    );
  $('mobileBack').hidden = !canPartyAct(battle) || battle?.screen === 'menu';
  const testing = battle?.kind === 'knights' && (canPartyAct(battle) || soul);
  $('mobileKnightTools').hidden = !testing;
  $('mobileInvincible').textContent = `Invincible ${battle?.invincible ? 'ON' : 'OFF'}`;
  $('mobileInvincible').setAttribute('aria-pressed', String(!!battle?.invincible));
  $('mobileSkip').disabled = !soul;
}
