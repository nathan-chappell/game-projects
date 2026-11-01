import {darkActInfo,darkActLocked} from './dark-acts.js';
// Buttons, keyboard, and canvas taps all call the same guarded rules.
import {
  attackEnemy,
  useDarkAct,
  spareInDark,
  canPartyAct,
  canUseBattleAction,
  canFloweyAct,
  canControlSoul,
  defend,
  battleActions,
  proceed,
  advanceProceedDialogue,
  friendlynessPellets,
  battleSettings,
  snowAttackStatus,
  startKrisTurn,
  toggleRepeatAttack,
  toggleInvincibility,
  toggleFastKill,
  fillTPForTesting,
  requestSpecialAttack,
} from './battle-rules.js';
import { advanceRescueDialogue, rescueDialogue, isBattleBlackout, isRalseyChoice, rescueIsTyping } from './battle-aftermath.js';
import { createBattleDialogue } from './battle-dialogue.js';
import { isProceedScene, proceedDialogue } from './battle-proceed.js';
import { isPelletCast } from './battle-pellets.js';

export function setupBattleControls(state, { $, canvas, directionKeys, openItems, announce, onChange }) {
  const battleDialogue = createBattleDialogue(state, $);
  const buttons = { attack: 'battleAttack', act: 'battleAct', item: 'battleItem', defend: 'battleDefend', spare:'battleSpare' };
  function refresh() {
    onChange();
    announce(state.bossEncounter?.message || '');
  }
  function choose(action) {
    if (state.death) return;
    const encounter = state.bossEncounter;
    if (!canUseBattleAction(encounter, action) || (!battleActions.includes(action) && action !== 'spare')) return;
    if (action === 'spare') {
      spareInDark(encounter);
      refresh();
      return;
    }
    encounter.selectedAction = action;
    if (action === 'attack') {
      if (isRalseyChoice(encounter)) {
        attackEnemy(encounter);
        refresh();
        return;
      }
      encounter.screen = 'attack';
      encounter.message = `Choose ${encounter.enemy.name} to attack.`;
    } else if (action === 'act') {
      encounter.screen = 'act';
      encounter.message = encounter.kind==='tenna'?'Check Tenna.':encounter.kind==='dark'?`${darkActInfo(encounter).description} ${darkActLocked(encounter)?'Locked until Shine is used three times.':''}`:canFloweyAct(encounter)
        ? `Friendlyness Pellets needs 90% TP. Deals ${encounter.fastKill ? battleSettings.fastKillDamage : battleSettings.pelletsDamage} damage and heals Flowey 35 HP.`
        : 'Proceed needs 100% TP.';
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
    if (state.death) return;
    const encounter = state.bossEncounter;
    if (isProceedScene(encounter)) {
      if (advanceProceedDialogue(encounter)) refresh();
      return;
    }
    if (encounter?.phase === 'rescue') {
      if (advanceRescueDialogue(encounter)) refresh();
      return;
    }
    if (!canPartyAct(encounter)) return;
    if (encounter.screen === 'attack') attackEnemy(encounter);
    else if (encounter.screen === 'act') {
      if(encounter.kind==='tenna'){encounter.message='Tenna is ready for his big Finale.';}
      else if(encounter.kind==='dark'){if(!useDarkAct(encounter,state.partyHP))encounter.message=darkActLocked(encounter)?'Locked. Kris must use Shine three times.':`Cannot use ${darkActInfo(encounter).name}. Check TP and teammate HP.`;}
      else if (canFloweyAct(encounter)) {
        if (!friendlynessPellets(encounter, state.partyHP)) encounter.message = 'Friendlyness Pellets needs 90% TP.';
      } else if (!proceed(encounter)) encounter.message = 'Proceed needs 100% TP.';
    } else {
      choose(encounter.selectedAction);
      return;
    }
    refresh();
  }
  function back() {
    if (state.death || !canPartyAct(state.bossEncounter) || state.bossEncounter.screen === 'menu') return;
    state.bossEncounter.screen = 'menu';
    state.bossEncounter.message = `${state.bossEncounter.turn}’s turn. Choose an action.`;
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
  $('battleStoryNext').onclick = confirm;

  function blocked() {
    return state.mode !== 'play' || state.death || !state.bossEncounter || state.dialogue || document.querySelector('dialog[open]');
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
      if (state.bossEncounter.phase === 'rescue' || isProceedScene(state.bossEncounter)) {
        confirm();
        return;
      }
      if (x >= 190 && x <= 365 && y >= 430 && y <= 468 && state.bossEncounter.screen !== 'menu') {
        back();
        return;
      }
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
      if (state.bossEncounter.phase === 'rescue' || isProceedScene(state.bossEncounter)) {
        if (['x', 'X', 'Escape', 'Backspace'].includes(event.key)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (['z', 'Z', 'c', 'C', 'Enter', ' '].includes(event.key)) {
          if (event.target?.tagName === 'BUTTON' && ['Enter', ' '].includes(event.key)) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!event.repeat) confirm();
        }
        return;
      }
      const repeatKey = event.key === '6' || event.code === 'Numpad6',
        invincibleKey = event.key === '2' || event.code === 'Numpad2',
        specialKey = event.key === '3' || event.code === 'Numpad3',
        fastKillKey = event.key === '4' || event.code === 'Numpad4',
        fillTPKey = ['1','5'].includes(event.key) || ['Numpad1','Numpad5'].includes(event.code);
      if (repeatKey || invincibleKey || specialKey || fastKillKey || fillTPKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;
        const changed = repeatKey
          ? toggleRepeatAttack(state.bossEncounter)
          : invincibleKey ? toggleInvincibility(state.bossEncounter)
          : fastKillKey ? toggleFastKill(state.bossEncounter)
          : fillTPKey ? fillTPForTesting(state.bossEncounter) : requestSpecialAttack(state.bossEncounter);
        if (changed) {
          if (specialKey) state.keys.clear();
          refresh();
        }
        return;
      }
      if (event.key === 'Shift' && canControlSoul(state.bossEncounter)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;
        const finalAttack = state.bossEncounter.snowAttack?.direction === 'snowgrave';
        startKrisTurn(state.bossEncounter, state.partyHP);
        state.bossEncounter.message = finalAttack ? 'Final attack skipped for playtesting.' : 'Attack skipped for playtesting.';
        state.keys.clear();
        refresh();
        return;
      }
      if (canControlSoul(state.bossEncounter) && directionKeys[event.key]) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.keys.add(directionKeys[event.key]);
        return;
      }
      if (canControlSoul(state.bossEncounter) && state.bossEncounter.snowAttack?.direction === 'goal' &&
        (event.key === ' ' || event.code === 'Space')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.keys.add('jump');
        return;
      }
      if (event.target?.tagName === 'BUTTON' && ['Enter', ' '].includes(event.key)) return;
      const confirmKey = ['z', 'Z', 'c', 'C', 'Enter', ' '].includes(event.key),
        backKey = ['x', 'X', 'Escape', 'Backspace'].includes(event.key);
      if (!event.key.startsWith('Arrow') && !confirmKey && !backKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      const encounter = state.bossEncounter;
      if (!canPartyAct(encounter)) return;
      if (backKey) back();
      else if (confirmKey) confirm();
      else if (encounter.screen === 'menu') {
        const step = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1;
        const available = (['dark','tenna'].includes(encounter.kind)?[...battleActions,'spare']:battleActions).filter(action => canUseBattleAction(encounter, action));
        const index = available.indexOf(encounter.selectedAction);
        encounter.selectedAction = available[(index + step + available.length) % available.length];
        refresh();
      }
    },
    true,
  );
  document.addEventListener('keyup', event => {
    if (event.key === ' ' || event.code === 'Space') state.keys.delete('jump');
  }, true);

  function sync() {
    battleDialogue.sync();
    const encounter = state.bossEncounter,
      active = state.mode === 'play' && !!encounter;
    const intro = active && encounter.phase === 'intro',
      acting = active && !state.death && canPartyAct(encounter);
    $('bossControls').hidden = !active || intro || !!state.death || isBattleBlackout(encounter);
    $('playControls').hidden = state.mode !== 'play' || (active && !intro);
    $('talkButton').disabled = $('inspectButton').disabled = active && !intro;
    $('inventoryButton').disabled = active && (isPelletCast(encounter) || isProceedScene(encounter) || (encounter.finalAttackComplete && encounter.phase !== 'victory'));
    for (const [action, id] of Object.entries(buttons)) {
      $(id).disabled = !acting || !canUseBattleAction(encounter, action);
      $(id).setAttribute('aria-pressed', String(acting && encounter.selectedAction === action));
    }
    $('battleSpare').textContent=encounter?.kind==='tenna'?'TV TIME!':'Spare';
    $('battleSpare').disabled = !acting||!canUseBattleAction(encounter,'spare');
    $('battleActionButtons').hidden = active && (canControlSoul(encounter) || isPelletCast(encounter) || encounter.phase === 'rescue' || isProceedScene(encounter));
    $('battleStoryNext').hidden = !(rescueDialogue(encounter) || proceedDialogue(encounter));
    $('battleStoryNext').textContent = rescueIsTyping(encounter) ? 'Wait for the text...' : 'Continue · Z / Enter';
    $('battleStoryNext').disabled = rescueIsTyping(encounter);
    $('battleSoulControls').hidden = !active || !!state.death || !canControlSoul(encounter);
    $('battleSnowText').textContent = snowAttackStatus(encounter);
    $('battleMovementHint').textContent = encounter?.snowAttack?.direction === 'goal'
      ? 'Blue soul: left/right to move. Tap Up, W, Space, or ↑ for a short hop; hold for a higher jump. Climb the right step to reach the upper goal.'
      : encounter?.snowAttack?.direction === 'snowgrave'
        ? 'Final Snowgrave: move into the narrow lit gap before each ice burst. Arrow keys or WASD.'
      : 'Move your soul with the arrow keys, WASD, or these buttons.';
    $('battleMovementHint').textContent += ` Stay near hazards for +${encounter?.snowAttack?.grazeTP ?? (encounter?.kind==='dark'?1:battleSettings.grazeTP)}% TP every 0.5 seconds.`;
    $('battleTestStatus').textContent = encounter?.kind==='dark'
      ? `Playtesting · 1: Fill TP · 2: Invincible ${encounter.invincible?'ON':'OFF'} · Shift: Skip attack`
      : `Playtesting · 1 / 5: Fill TP · 6: Repeat ${encounter?.repeatAttack ? 'ON' : 'OFF'} · 2: Invincible ${encounter?.invincible ? 'ON' : 'OFF'} · 3: Special${encounter?.specialAttackQueued ? ' QUEUED' : ''} → Buffed attacks · 4: Fast kill ${encounter?.fastKill ? 'ON' : 'OFF'} · Shift: Skip`;
    $('battleTestStatus').hidden = encounter?.phase === 'rescue' || isProceedScene(encounter) || isPelletCast(encounter);
    $('battleTargetPanel').hidden = !acting || encounter.screen !== 'attack';
    $('battleActPanel').hidden = !acting || encounter.screen !== 'act';
    $('battleMenuBack').hidden = !acting || encounter.screen === 'menu';
    const floweyTurn = canFloweyAct(encounter),
      actCost = encounter?.kind==='dark'?darkActInfo(encounter).cost:floweyTurn ? battleSettings.pelletsCost : battleSettings.proceedCost;
    $('battleActionButtons').setAttribute('aria-label', `${encounter?.turn || 'Party'}’s actions`);
    $('battleProceedButton').textContent = encounter?.kind==='tenna'?'Check Tenna':encounter?.kind==='dark'?`${darkActInfo(encounter).name} · ${actCost}% TP`:floweyTurn ? 'Friendlyness Pellets · 90% TP' : 'Proceed · 100% TP';
    $('battleProceedButton').disabled = !acting || !canUseBattleAction(encounter, 'act') || (encounter.kind!=='tenna'&&encounter.tp < actCost) || (encounter.kind==='dark'&&(darkActLocked(encounter)||(encounter.turn==='Ralsey'&&Object.values(state.partyHP).every(hp=>hp>=100))));
    $('battleTargetButton').textContent = encounter
      ? isRalseyChoice(encounter) ? 'Ralsey' : `${encounter.enemy.name} · HP ${encounter.enemy.hp} / ${encounter.enemy.maxHP}`
      : '???';
    $('battleTurnText').textContent = !active
      ? ''
      : encounter.phase === 'victory'
        ? encounter.kind==='tenna'?'Tenna defeated.':encounter.kind==='dark'?'??? defeated.':encounter.noelleEscaped ? 'Noelle escaped.' : '??? disappeared.'
        : encounter.phase === 'rescue' ? 'Ralsey intervenes'
        : isPelletCast(encounter) ? 'Flowey uses Friendlyness Pellets'
        : isProceedScene(encounter)
          ? 'Proceed...'
          : `${encounter.turn}’s turn`;
    $('battleFeedback').textContent = encounter?.message || '';
    $('battleTPBar').value = encounter?.tp || 0;
    $('battleTPText').textContent = `TP: ${Math.floor(encounter?.tp || 0)}%`;
    $('battleProceedCount').textContent = encounter?.kind==='tenna'?'Tenna is ready for the Finale.':encounter?.kind==='dark'?(encounter.turn==='Kris'?`Shine: ${encounter.shineCount||0} / 5${encounter.darkUnlocked?' · Attacks and ACTs unlocked':''}`:`${darkActInfo(encounter).description}${darkActLocked(encounter)?' · LOCKED until Shine 3/3':''}`):floweyTurn
      ? `Deals ${encounter?.fastKill ? battleSettings.fastKillDamage : battleSettings.pelletsDamage} damage · Heals Flowey 35 HP`
      : `Proceed: ${encounter?.proceedCount || 0} / ${battleSettings.proceedsToDisappear}`;
    $('leaveBossButton').disabled = active && (isPelletCast(encounter) || isProceedScene(encounter) || encounter.phase === 'rescue' ||
      (encounter.finalAttackComplete && encounter.phase !== 'victory'));
  }
  return { sync };
}
