// Buttons, keyboard, and canvas taps all call the same guarded rules.
import { attackEnemy, canKrisAct, defend, krisActions, proceed, battleSettings } from './battle-rules.js';

export function setupBattleControls(state, { $, canvas, openItems, announce, onChange }) {
  const buttons = { attack: 'battleAttack', act: 'battleAct', item: 'battleItem', defend: 'battleDefend' };
  function refresh() {
    onChange();
    announce(state.bossEncounter?.message || '');
  }
  function choose(action) {
    const encounter = state.bossEncounter;
    if (!canKrisAct(encounter) || (!krisActions.includes(action) && action !== 'spare')) return;
    if (action === 'spare') {
      encounter.message = 'SPARE is frozen.';
      refresh();
      return;
    }
    encounter.selectedAction = action;
    if (action === 'attack') {
      encounter.screen = 'attack';
      encounter.message = 'Choose ??? to attack.';
    } else if (action === 'act') {
      encounter.screen = 'act';
      encounter.message = 'Proceed needs 100% TP.';
    } else if (action === 'defend') defend(encounter);
    else if (action === 'item') {
      encounter.screen = 'items';
      refresh();
      openItems();
      return;
    }
    refresh();
  }
  function confirm() {
    const encounter = state.bossEncounter;
    if (!canKrisAct(encounter)) return;
    if (encounter.screen === 'attack') attackEnemy(encounter);
    else if (encounter.screen === 'act') {
      if (!proceed(encounter)) encounter.message = 'Proceed needs 100% TP.';
    } else {
      choose(encounter.selectedAction);
      return;
    }
    refresh();
  }
  function back() {
    if (!canKrisAct(state.bossEncounter)) return;
    state.bossEncounter.screen = 'menu';
    state.bossEncounter.message = 'Kris’s turn. Choose an action.';
    refresh();
  }
  for (const [action, id] of Object.entries(buttons)) $(id).onclick = () => choose(action);
  $('battleTargetButton').onclick = () => {
    if (state.bossEncounter?.screen === 'attack') confirm();
  };
  $('battleProceedButton').onclick = () => {
    if (state.bossEncounter?.screen === 'act') confirm();
  };
  $('battleMenuBack').onclick = back;

  function blocked() {
    return state.mode !== 'play' || !state.bossEncounter || state.dialogue || document.querySelector('dialog[open]');
  }
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || blocked()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      canvas.focus({ preventScroll: true });
      const bounds = canvas.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) * 640) / bounds.width,
        y = ((event.clientY - bounds.top) * 480) / bounds.height;
      if (x >= 378 && x <= 622 && y >= 353 && y <= 468) {
        confirm();
        return;
      }
      if (y < 353 || y > 468) return;
      if (x >= 25 && x <= 185) choose(y < 397 ? 'attack' : y < 430 ? 'act' : 'item');
      else if (x >= 190 && x <= 365) choose(y < 397 ? 'spare' : y < 430 ? 'defend' : '');
    },
    true,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (blocked() || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName) || event.target?.isContentEditable) return;
      if (event.target?.tagName === 'BUTTON' && ['Enter', ' '].includes(event.key)) return;
      const confirmKey = ['z', 'Z', 'c', 'C', 'Enter', ' '].includes(event.key),
        backKey = ['x', 'X', 'Escape'].includes(event.key);
      if (!event.key.startsWith('Arrow') && !confirmKey && !backKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      const encounter = state.bossEncounter;
      if (!canKrisAct(encounter)) return;
      if (backKey) back();
      else if (confirmKey) confirm();
      else if (encounter.screen === 'menu') {
        const step = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1;
        const index = krisActions.indexOf(encounter.selectedAction);
        encounter.selectedAction = krisActions[(index + step + krisActions.length) % krisActions.length];
        refresh();
      }
    },
    true,
  );

  function sync() {
    const encounter = state.bossEncounter,
      active = state.mode === 'play' && !!encounter;
    const intro = active && encounter.phase === 'intro',
      acting = active && canKrisAct(encounter);
    $('bossControls').hidden = !active || intro;
    $('playControls').hidden = state.mode !== 'play' || (active && !intro);
    $('talkButton').disabled = $('inspectButton').disabled = active && !intro;
    for (const [action, id] of Object.entries(buttons)) {
      $(id).disabled = !acting;
      $(id).setAttribute('aria-pressed', String(acting && encounter.selectedAction === action));
    }
    $('battleSpare').disabled = true;
    $('battleTargetPanel').hidden = !acting || encounter.screen !== 'attack';
    $('battleActPanel').hidden = !acting || encounter.screen !== 'act';
    $('battleMenuBack').hidden = !acting || encounter.screen === 'menu';
    $('battleProceedButton').disabled = !acting || encounter.tp < battleSettings.proceedCost;
    $('battleTargetButton').textContent = encounter
      ? `??? · HP ${encounter.enemy.hp} / ${encounter.enemy.maxHP}`
      : '???';
    $('battleTurnText').textContent = !active
      ? ''
      : encounter.phase === 'victory'
        ? '??? disappeared.'
        : encounter.phase === 'proceedFlash' || encounter.phase === 'vanishing'
          ? 'Proceed...'
          : `${encounter.turn}’s turn`;
    $('battleFeedback').textContent = encounter?.message || '';
    $('battleTPBar').value = encounter?.tp || 0;
    $('battleTPText').textContent = `TP: ${Math.floor(encounter?.tp || 0)}%`;
    $('battleProceedCount').textContent =
      `Proceed: ${encounter?.proceedCount || 0} / ${battleSettings.proceedsToDisappear}`;
    $('leaveBossButton').disabled = active && ['proceedFlash', 'vanishing'].includes(encounter.phase);
  }
  return { sync };
}
