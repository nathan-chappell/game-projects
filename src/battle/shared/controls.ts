import { tennaEndingPhases } from '../tenna/ending.ts';
import { rejectUndyneAction, undynePresent } from '../tenna/undyne-actions.ts';
import { setHammerAimKey, setHammerThrowKey, throwHammer } from '../tenna/hammers.ts';
import { jumpSurfer } from '../tenna/surfers.ts';
import { shootGallery, moveGalleryAim, minigamePoints } from '../tenna/minigame.ts';
import { requestTennaMinigame } from './rules.ts';
import type { Elements, GameElements } from '../../game/dom.ts';
import { present } from '../../game/invariants.ts';
import type { GameState } from '../../game/types.ts';
import { darkActInfo, darkActLocked } from '../dark/dark-acts.ts';
import type { BattleAction } from './types.ts';
// Buttons, keyboard, and canvas taps all call the same guarded rules.
import {
  advanceRescueDialogue,
  isBattleBlackout,
  isRalseyChoice,
  rescueDialogue,
  rescueIsTyping,
} from '../noelle/aftermath.ts';
import { isPelletCast } from '../noelle/pellets.ts';
import { isProceedScene, proceedDialogue } from '../noelle/proceed.ts';
import { canControlSoul, canFloweyAct, canPartyAct, canUseBattleAction } from './availability.ts';
import { createBattleDialogue } from './dialogue.ts';
import {
  advanceProceedDialogue,
  attackEnemy,
  defend,
  friendlynessPellets,
  proceed,
  snowAttackStatus,
  spareInDark,
  useDarkAct,
} from './rules.ts';
import { battleActions, battleSettings } from './settings.ts';

export function setupBattleControls(
  state: GameState,
  {
    $,
    canvas,
    directionKeys,
    openItems,
    announce,
    onChange,
  }: {
    $: Elements;
    canvas: HTMLCanvasElement;
    directionKeys: Record<string, string>;
    openItems: () => void;
    announce: (text: string) => void;
    onChange: () => void;
  },
) {
  const battleDialogue = createBattleDialogue(state, $);
  const buttons: Record<BattleAction, keyof GameElements> = {
    attack: 'battleAttack',
    act: 'battleAct',
    item: 'battleItem',
    defend: 'battleDefend',
    spare: 'battleSpare',
  };
  function refresh() {
    onChange();
    announce(state.bossEncounter?.message || '');
  }
  function choose(action: string) {
    if (state.death) return;
    const encounter = state.bossEncounter;
    if (
      !encounter ||
      !canUseBattleAction(encounter, action) ||
      (!battleActions.some((candidate) => candidate === action) && action !== 'spare')
    )
      return;
    if (action === 'spare') {
      spareInDark(encounter);
      refresh();
      return;
    }
    if (isBattleAction(action)) encounter.selectedAction = action;
    if (action === 'attack') {
      if (isRalseyChoice(encounter)) {
        attackEnemy(encounter);
        refresh();
        return;
      }
      encounter.screen = 'attack';
      encounter.message = `Choose ${encounter.enemy.name} to attack.`;
    } else if (action === 'act') {
      if (rejectUndyneAction(encounter, 'act')) {
        refresh();
        return;
      }
      encounter.screen = 'act';
      encounter.message =
        encounter.kind === 'tenna'
          ? encounter.turn === 'Kris'
            ? (encounter.minigameCount ?? 0) % 3 === 1
              ? 'Minigame: Surfers. Jump rocks and collect coins. No TP cost.'
              : (encounter.minigameCount ?? 0) % 3 === 2
                ? 'Minigame: Susie throws hammers at incoming TVs. Tenna +5; Flowey or collision adds X. No TP cost.'
                : 'Minigame: shoot enemies and do not shoot Flowey. No TP cost.'
            : 'Check Tenna.'
          : ['dark', 'knights', 'vessel'].includes(encounter.kind ?? '')
            ? `${darkActInfo(encounter).description} ${darkActLocked(encounter) ? 'Locked until Shine is used three times.' : ''}`
            : canFloweyAct(encounter)
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
      if (advanceProceedDialogue(present(encounter))) refresh();
      return;
    }
    if (encounter?.phase === 'rescue') {
      if (advanceRescueDialogue(encounter)) refresh();
      return;
    }
    if (!encounter || !canPartyAct(encounter)) return;
    if (encounter.screen === 'attack') attackEnemy(encounter);
    else if (encounter.screen === 'act') {
      if (encounter.kind === 'tenna') {
        if (encounter.turn === 'Kris') requestTennaMinigame(encounter);
        else encounter.message = 'Tenna is ready for his big Finale.';
      } else if (['dark', 'knights', 'vessel'].includes(encounter.kind ?? '')) {
        if (!useDarkAct(encounter, state.partyHP))
          encounter.message = darkActLocked(encounter)
            ? 'Locked. Kris must use Shine three times.'
            : `Cannot use ${darkActInfo(encounter).name}. Check TP and teammate HP.`;
      } else if (canFloweyAct(encounter)) {
        if (!friendlynessPellets(encounter, state.partyHP))
          encounter.message = 'Friendlyness Pellets needs 90% TP.';
      } else if (!proceed(encounter)) encounter.message = 'Proceed needs 100% TP.';
    } else {
      choose(encounter.selectedAction);
      return;
    }
    refresh();
  }
  function back() {
    if (state.death || !canPartyAct(state.bossEncounter) || present(state.bossEncounter).screen === 'menu')
      return;
    present(state.bossEncounter).screen = 'menu';
    present(state.bossEncounter).message = `${present(state.bossEncounter).turn}’s turn. Choose an action.`;
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
  $('battleKnightTarget').onchange = () => {
    const encounter = state.bossEncounter;
    if (!encounter || !canPartyAct(encounter) || encounter.kind !== 'knights' || !encounter.knightEnemies)
      return;
    const target = $('battleKnightTarget').value === 'kaizo' ? 'kaizo' : 'roaring';
    if (encounter.knightEnemies[target].hp <= 0) return;
    encounter.knightTarget = target;
    encounter.enemy = encounter.knightEnemies[target];
    refresh();
  };
  $('battleStoryNext').onclick = confirm;
  $('battleMinigameShoot').onclick = () => {
    const m = state.bossEncounter?.minigame;
    if (m && state.bossEncounter?.phase === 'minigame') {
      if (m.kind === 'surf') jumpSurfer(m);
      else if (m.kind === 'hammers') throwHammer(m);
      else shootGallery(m);
      refresh();
      canvas.focus({ preventScroll: true });
    }
  };
  canvas.addEventListener('pointermove', (event) => {
    const m = state.bossEncounter?.minigame;
    if (!m || (m.kind !== 'shooting' && m.kind !== 'hammers') || state.bossEncounter?.phase !== 'minigame')
      return;
    const b = canvas.getBoundingClientRect();
    if (m.kind === 'hammers') m.aimKeys = [];
    m.cursor = {
      x: ((event.clientX - b.left) * 640) / b.width,
      y: ((event.clientY - b.top) * 480) / b.height,
    };
  });

  document.addEventListener('keyup', (event) => {
    const m = state.bossEncounter?.minigame;
    if (m?.kind === 'hammers') {
      setHammerAimKey(m, event.key, false);
      setHammerThrowKey(m, event.key, false);
    }
  });
  window.addEventListener('blur', () => {
    const m = state.bossEncounter?.minigame;
    if (m?.kind === 'hammers') {
      m.aimKeys = [];
      m.throwKeys = [];
    }
  });

  function blocked() {
    return (
      state.mode !== 'play' ||
      state.death ||
      !state.bossEncounter ||
      state.dialogue ||
      document.querySelector('dialog[open]')
    );
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
      if (state.bossEncounter?.phase === 'minigame' && state.bossEncounter.minigame) {
        const m = state.bossEncounter.minigame;
        if (m.kind === 'surf') jumpSurfer(m);
        else if (m.kind === 'hammers') throwHammer(m, y, x);
        else shootGallery(m, x, y);
        refresh();
        return;
      }
      if (present(state.bossEncounter).phase === 'rescue' || isProceedScene(state.bossEncounter)) {
        confirm();
        return;
      }
      if (x >= 190 && x <= 365 && y >= 430 && y <= 468 && present(state.bossEncounter).screen !== 'menu') {
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
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (
        /^(INPUT|SELECT|TEXTAREA)$/.test(event.target instanceof HTMLElement ? event.target.tagName : '') ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      )
        return;
      if (blocked()) return;
      if (state.bossEncounter?.phase === 'minigame' && state.bossEncounter.minigame) {
        const b = state.bossEncounter,
          m = present(b.minigame);
        if (
          [
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            ...(m.kind === 'hammers' ? ['a', 'A', 'd', 'D'] : []),
            'z',
            'Z',
            'c',
            'C',
            'Enter',
            ' ',
          ].includes(event.key)
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (event.repeat) return;
          if (event.key.startsWith('Arrow') || (m.kind === 'hammers' && /^[ad]$/i.test(event.key))) {
            if (m.kind === 'surf') {
              if (event.key === 'ArrowUp') jumpSurfer(m);
            } else if (m.kind === 'hammers') setHammerAimKey(m, event.key, true);
            else moveGalleryAim(m, event.key);
          } else if (m.kind === 'surf') jumpSurfer(m);
          else if (m.kind === 'hammers') {
            if (event.key.toLowerCase() === 'z' || event.key === ' ') setHammerThrowKey(m, event.key, true);
            else throwHammer(m);
          } else shootGallery(m);
          refresh();
        }
        return;
      }
      if (present(state.bossEncounter).phase === 'rescue' || isProceedScene(state.bossEncounter)) {
        if (['x', 'X', 'Escape', 'Backspace'].includes(event.key)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (['z', 'Z', 'c', 'C', 'Enter', ' '].includes(event.key)) {
          if (
            (event.target instanceof HTMLElement ? event.target.tagName : '') === 'BUTTON' &&
            ['Enter', ' '].includes(event.key)
          )
            return;
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!event.repeat) confirm();
        }
        return;
      }
      if (canControlSoul(state.bossEncounter) && directionKeys[event.key]) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.keys.add(directionKeys[event.key]);
        return;
      }
      if (
        canControlSoul(state.bossEncounter) &&
        state.bossEncounter.snowAttack?.direction === 'goal' &&
        (event.key === ' ' || event.code === 'Space')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.keys.add('jump');
        return;
      }
      if (
        (event.target instanceof HTMLElement ? event.target.tagName : '') === 'BUTTON' &&
        ['Enter', ' '].includes(event.key)
      )
        return;
      const confirmKey = ['z', 'Z', 'c', 'C', 'Enter', ' '].includes(event.key),
        backKey = ['x', 'X', 'Escape', 'Backspace'].includes(event.key);
      if (!event.key.startsWith('Arrow') && !confirmKey && !backKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      const encounter = state.bossEncounter;
      if (!encounter || !canPartyAct(encounter)) return;
      if (backKey) back();
      else if (confirmKey) confirm();
      else if (encounter.screen === 'menu') {
        const step = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1;
        const available: BattleAction[] = (
          ['dark', 'tenna', 'knights', 'vessel'].includes(encounter.kind ?? '')
            ? [...battleActions, 'spare' as const]
            : battleActions
        ).filter((action) => canUseBattleAction(encounter, action));
        const index = available.indexOf(encounter.selectedAction);
        encounter.selectedAction = available[(index + step + available.length) % available.length];
        refresh();
      }
    },
    true,
  );
  document.addEventListener(
    'keyup',
    (event) => {
      if (event.key === ' ' || event.code === 'Space') state.keys.delete('jump');
    },
    true,
  );

  function sync() {
    battleDialogue.sync();
    const encounter = state.bossEncounter,
      active = state.mode === 'play' && !!encounter;
    const intro = active && encounter.phase === 'intro',
      acting = active && !state.death && canPartyAct(encounter);
    $('bossControls').hidden =
      !active || intro || !!state.death || encounter?.phase === 'knightRift' || isBattleBlackout(encounter);
    $('playControls').hidden = state.mode !== 'play' || (active && !intro);
    $('talkButton').disabled = $('inspectButton').disabled = active && !intro;
    $('inventoryButton').disabled =
      active &&
      ([
        'minigame',
        'minigameIntro',
        'knightRift',
        'vesselFaceoff',
        'vesselXSlash',
        'vesselWatch',
        ...tennaEndingPhases,
      ].includes(encounter.phase) ||
        isPelletCast(encounter) ||
        isProceedScene(encounter) ||
        (encounter.finalAttackComplete && encounter.phase !== 'victory'));
    for (const [action, id] of Object.entries(buttons)) {
      const button = $(id);
      if (!(button instanceof HTMLButtonElement)) throw new Error(`Expected battle button ${id}`);
      button.disabled = !acting || !canUseBattleAction(encounter, action);
      $(id).setAttribute('aria-pressed', String(acting && encounter.selectedAction === action));
    }
    $('battleKnightTargetLabel').hidden =
      encounter?.kind !== 'knights' || !acting || !['attack', 'act'].includes(encounter.screen);
    $('battleKnightTarget').value = encounter?.knightTarget ?? 'roaring';
    for (const option of $('battleKnightTarget').options) {
      const target = option.value === 'kaizo' ? 'kaizo' : 'roaring';
      option.disabled = (encounter?.knightEnemies?.[target].hp ?? 1) <= 0;
    }
    const minigame = encounter?.phase === 'minigame';
    $('battleMinigameControls').hidden = !minigame;
    const surf = encounter?.minigame?.kind === 'surf',
      hammers = encounter?.minigame?.kind === 'hammers';
    $('battleMinigameShoot').textContent = surf
      ? 'Jump · Space / ↑'
      : hammers
        ? 'Throw hammer · Z / Space'
        : 'Shoot · Z / Space';
    $('battleMinigameHint').textContent = surf
      ? 'Jump over rocks and collect coins. Space, Up, or tap to jump.'
      : hammers
        ? 'Mouse or arrows aim; A/D also aims left/right. Click throws; hold Z / Space to keep throwing. Susie stays on the left. Avoid Flowey TVs!'
        : 'Click or tap an enemy. Arrow keys aim; Z / Space shoots. Do not shoot Flowey!';
    $('battleMinigameStatus').textContent = encounter?.minigame
      ? encounter.minigame.kind === 'surf'
        ? `Surfers · Coins: ${encounter.minigame.coinsCollected} · Crashes: ${encounter.minigame.misses} · Purple coin: ${encounter.minigame.purpleCollected ? 'collected' : 'waiting'} · Round points: ${encounter.minigame.points}`
        : encounter.minigame.kind === 'hammers'
          ? `Hammer Time · Xs: ${encounter.minigame.misses} · Round points: ${encounter.minigame.points}`
          : `Misses: ${encounter.minigame.misses} · Round points: ${minigamePoints(encounter.minigame.misses)}`
      : '';
    $('battleSpare').textContent =
      encounter?.kind === 'tenna' && !undynePresent(encounter) ? 'TV TIME!' : 'Spare';
    $('battleSpare').disabled = !acting || !canUseBattleAction(encounter, 'spare');
    $('battleActionButtons').hidden =
      active &&
      (minigame ||
        canControlSoul(encounter) ||
        isPelletCast(encounter) ||
        encounter.phase === 'rescue' ||
        isProceedScene(encounter));
    $('battleStoryNext').hidden = !(rescueDialogue(encounter) || proceedDialogue(encounter));
    $('battleStoryNext').textContent = rescueIsTyping(encounter)
      ? 'Wait for the text...'
      : 'Continue · Z / Enter';
    $('battleStoryNext').disabled = rescueIsTyping(encounter);
    $('battleSoulControls').hidden = !active || !!state.death || !canControlSoul(encounter);
    $('battleSnowText').textContent = snowAttackStatus(encounter);
    $('battleMovementHint').textContent =
      encounter?.snowAttack?.direction === 'undyne'
        ? 'Green soul: arrow keys, WASD or direction buttons turn the shield. Block incoming spears! Yellow spears swing around: block the opposite side.'
        : encounter?.snowAttack?.direction === 'goal'
          ? 'Blue soul: left/right to move. Tap Up, W, Space, or ↑ for a short hop; hold for a higher jump. Climb the right step to reach the upper goal.'
          : encounter?.snowAttack?.direction === 'snowgrave'
            ? 'Final Snowgrave: move into the narrow lit gap before each ice burst. Arrow keys or WASD.'
            : 'Move your soul with the arrow keys, WASD, or these buttons.';
    $('battleMovementHint').textContent +=
      encounter?.snowAttack?.direction === 'undyne'
        ? ` Each block gains ${encounter.snowAttack.grazeTP}% TP.`
        : ` Stay near hazards for +${encounter?.snowAttack?.grazeTP ?? (encounter?.kind === 'dark' ? 1 : battleSettings.grazeTP)}% TP every 0.5 seconds.`;
    $('battleTargetPanel').hidden = !acting || encounter.screen !== 'attack';
    $('battleActPanel').hidden = !acting || encounter.screen !== 'act';
    $('battleMenuBack').hidden = !acting || encounter.screen === 'menu';
    const floweyTurn = canFloweyAct(encounter),
      actCost = ['dark', 'knights', 'vessel'].includes(encounter?.kind ?? '')
        ? darkActInfo(encounter).cost
        : floweyTurn
          ? battleSettings.pelletsCost
          : battleSettings.proceedCost;
    $('battleActionButtons').setAttribute('aria-label', `${encounter?.turn || 'Party'}’s actions`);
    $('battleProceedButton').textContent =
      encounter?.kind === 'tenna'
        ? encounter.turn === 'Kris'
          ? 'Minigame'
          : 'Check Tenna'
        : ['dark', 'knights', 'vessel'].includes(encounter?.kind ?? '')
          ? `${darkActInfo(encounter).name} · ${actCost}% TP`
          : floweyTurn
            ? 'Friendlyness Pellets · 90% TP'
            : 'Proceed · 100% TP';
    $('battleProceedButton').disabled =
      !acting ||
      !canUseBattleAction(encounter, 'act') ||
      (encounter.kind !== 'tenna' && encounter.tp < actCost) ||
      (['dark', 'knights', 'vessel'].includes(encounter.kind ?? '') &&
        (darkActLocked(encounter) ||
          (encounter.turn === 'Ralsey' && Object.values(state.partyHP).every((hp) => hp >= 100))));
    $('battleTargetButton').textContent = encounter
      ? isRalseyChoice(encounter)
        ? 'Ralsey'
        : `${encounter.enemy.name} · HP ${encounter.enemy.hp} / ${encounter.enemy.maxHP}`
      : '???';
    $('battleTurnText').textContent = !active
      ? ''
      : encounter.phase === 'minigame'
        ? encounter.minigame?.kind === 'surf'
          ? 'Surfers'
          : encounter.minigame?.kind === 'hammers'
            ? 'Hammer Time'
            : 'Shooting minigame'
        : encounter.phase === 'victory'
          ? encounter.kind === 'vessel'
            ? 'Vessel defeated.'
            : encounter.kind === 'knights'
              ? 'The knights are down.'
              : encounter.kind === 'tenna'
                ? 'Tenna defeated.'
                : ['dark', 'knights', 'vessel'].includes(encounter.kind ?? '')
                  ? '??? defeated.'
                  : encounter.noelleEscaped
                    ? 'Noelle escaped.'
                    : '??? disappeared.'
          : encounter.phase === 'rescue'
            ? 'Ralsey intervenes'
            : isPelletCast(encounter)
              ? 'Flowey uses Friendlyness Pellets'
              : isProceedScene(encounter)
                ? 'Proceed...'
                : encounter.turn === 'Knights'
                  ? 'Knights’ turn'
                  : `${encounter.turn}’s turn`;
    $('battleFeedback').textContent = encounter?.message || '';
    $('battleTPBar').value = encounter?.tp || 0;
    $('battleTPText').textContent = `TP: ${Math.floor(encounter?.tp || 0)}%`;
    $('battleProceedCount').textContent =
      encounter?.kind === 'tenna'
        ? encounter.turn === 'Kris'
          ? (encounter.minigameCount ?? 0) % 3 === 1
            ? 'Next: Surfers · Coins +5 · Rock hits -10 · Flowey coin +10 · 15 seconds.'
            : (encounter.minigameCount ?? 0) % 3 === 2
              ? 'Next: Hammer Time · Tenna TVs +5 · Flowey / collisions add X.'
              : 'Shoot enemies, avoid Flowey. 100 points minus 10 per X. No TP cost.'
          : 'Tenna is ready for the Finale.'
        : encounter && ['dark', 'knights', 'vessel'].includes(encounter.kind ?? '')
          ? encounter.turn === 'Kris'
            ? encounter.kind !== 'dark'
              ? darkActInfo(encounter).description
              : `Shine: ${encounter.shineCount || 0} / 5${encounter.darkUnlocked ? ' · Attacks and ACTs unlocked' : ''}`
            : `${darkActInfo(encounter).description}${darkActLocked(encounter) ? ' · LOCKED until Shine 3/3' : ''}`
          : floweyTurn
            ? `Deals ${encounter?.fastKill ? battleSettings.fastKillDamage : battleSettings.pelletsDamage} damage · Heals Flowey 35 HP`
            : `Proceed: ${encounter?.proceedCount || 0} / ${battleSettings.proceedsToDisappear}`;
    $('leaveBossButton').disabled =
      ['knights', 'vessel'].includes(encounter?.kind ?? '') ||
      (active &&
        ([
          'minigame',
          'minigameIntro',
          'knightRift',
          'vesselFaceoff',
          'vesselXSlash',
          'vesselWatch',
          ...tennaEndingPhases,
        ].includes(encounter.phase) ||
          isPelletCast(encounter) ||
          isProceedScene(encounter) ||
          encounter.phase === 'rescue' ||
          (encounter.finalAttackComplete && encounter.phase !== 'victory')));
  }
  return { sync, confirm, back };
}

function isBattleAction(action: string): action is BattleAction {
  return ['attack', 'act', 'item', 'defend', 'spare'].includes(action);
}
