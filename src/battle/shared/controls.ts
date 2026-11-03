import { moveHammerLane, throwHammer } from '../tenna/hammers.ts';
import { jumpSurfer } from '../tenna/surfers.ts';
import { shootGallery, moveGalleryAim, minigamePoints } from '../tenna/minigame.ts';
import { requestTennaMinigame, finishTennaMinigame } from './rules.ts';
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
  fillTPForTesting,
  friendlynessPellets,
  proceed,
  requestSpecialAttack,
  snowAttackStatus,
  spareInDark,
  startKrisTurn,
  toggleFastKill,
  toggleInvincibility,
  toggleRepeatAttack,
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
          : encounter.kind === 'dark'
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
      } else if (encounter.kind === 'dark') {
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
    if (!m || m.kind !== 'shooting' || state.bossEncounter?.phase !== 'minigame') return;
    const b = canvas.getBoundingClientRect();
    m.cursor = {
      x: ((event.clientX - b.left) * 640) / b.width,
      y: ((event.clientY - b.top) * 480) / b.height,
    };
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
        else if (m.kind === 'hammers') throwHammer(m, y);
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
      if (blocked() || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (
        /^(INPUT|SELECT|TEXTAREA)$/.test(event.target instanceof HTMLElement ? event.target.tagName : '') ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      )
        return;
      if (state.bossEncounter?.phase === 'minigame' && state.bossEncounter.minigame) {
        const b = state.bossEncounter,
          m = present(b.minigame);
        if (
          [
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'z',
            'Z',
            'c',
            'C',
            'Enter',
            ' ',
            'Shift',
            '2',
          ].includes(event.key)
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (event.repeat) return;
          if (event.key.startsWith('Arrow')) {
            if (m.kind === 'surf') {
              if (event.key === 'ArrowUp') jumpSurfer(m);
            } else if (m.kind === 'hammers') moveHammerLane(m, event.key);
            else moveGalleryAim(m, event.key);
          } else if (event.key === 'Shift') finishTennaMinigame(b, state.partyHP);
          else if (event.key === '2') b.invincible = !b.invincible;
          else if (m.kind === 'surf') jumpSurfer(m);
          else if (m.kind === 'hammers') throwHammer(m);
          else shootGallery(m);
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
      const repeatKey = event.key === '6' || event.code === 'Numpad6',
        invincibleKey = event.key === '2' || event.code === 'Numpad2',
        specialKey = event.key === '3' || event.code === 'Numpad3',
        fastKillKey = event.key === '4' || event.code === 'Numpad4',
        fillTPKey = ['1', '5'].includes(event.key) || ['Numpad1', 'Numpad5'].includes(event.code);
      if (repeatKey || invincibleKey || specialKey || fastKillKey || fillTPKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;
        const changed = repeatKey
          ? toggleRepeatAttack(present(state.bossEncounter))
          : invincibleKey
            ? toggleInvincibility(present(state.bossEncounter))
            : fastKillKey
              ? toggleFastKill(present(state.bossEncounter))
              : fillTPKey
                ? fillTPForTesting(present(state.bossEncounter))
                : requestSpecialAttack(present(state.bossEncounter));
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
        state.bossEncounter.message = finalAttack
          ? 'Final attack skipped for playtesting.'
          : 'Attack skipped for playtesting.';
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
          ['dark', 'tenna'].includes(encounter.kind ?? '')
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
    $('bossControls').hidden = !active || intro || !!state.death || isBattleBlackout(encounter);
    $('playControls').hidden = state.mode !== 'play' || (active && !intro);
    $('talkButton').disabled = $('inspectButton').disabled = active && !intro;
    $('inventoryButton').disabled =
      active &&
      (['minigame', 'minigameIntro'].includes(encounter.phase) ||
        isPelletCast(encounter) ||
        isProceedScene(encounter) ||
        (encounter.finalAttackComplete && encounter.phase !== 'victory'));
    for (const [action, id] of Object.entries(buttons)) {
      const button = $(id);
      if (!(button instanceof HTMLButtonElement)) throw new Error(`Expected battle button ${id}`);
      button.disabled = !acting || !canUseBattleAction(encounter, action);
      $(id).setAttribute('aria-pressed', String(acting && encounter.selectedAction === action));
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
        ? 'Up / Down changes lanes; Z / Space throws. Tap a lane to throw. Avoid Flowey TVs!'
        : 'Click or tap an enemy. Arrow keys aim; Z / Space shoots. Do not shoot Flowey!';
    $('battleMinigameStatus').textContent = encounter?.minigame
      ? encounter.minigame.kind === 'surf'
        ? `Surfers · Coins: ${encounter.minigame.coinsCollected} · Crashes: ${encounter.minigame.misses} · Purple coin: ${encounter.minigame.purpleCollected ? 'collected' : 'waiting'} · Round points: ${encounter.minigame.points}`
        : encounter.minigame.kind === 'hammers'
          ? `Hammer Time · Xs: ${encounter.minigame.misses} · Round points: ${encounter.minigame.points}`
          : `Misses: ${encounter.minigame.misses} · Round points: ${minigamePoints(encounter.minigame.misses)}`
      : '';
    $('battleSpare').textContent = encounter?.kind === 'tenna' ? 'TV TIME!' : 'Spare';
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
      encounter?.snowAttack?.direction === 'goal'
        ? 'Blue soul: left/right to move. Tap Up, W, Space, or ↑ for a short hop; hold for a higher jump. Climb the right step to reach the upper goal.'
        : encounter?.snowAttack?.direction === 'snowgrave'
          ? 'Final Snowgrave: move into the narrow lit gap before each ice burst. Arrow keys or WASD.'
          : 'Move your soul with the arrow keys, WASD, or these buttons.';
    $('battleMovementHint').textContent +=
      ` Stay near hazards for +${encounter?.snowAttack?.grazeTP ?? (encounter?.kind === 'dark' ? 1 : battleSettings.grazeTP)}% TP every 0.5 seconds.`;
    $('battleTestStatus').textContent =
      encounter?.phase === 'minigame'
        ? `Playtesting · 2: Invincible ${encounter.invincible ? 'ON' : 'OFF'} · Shift: End minigame`
        : encounter?.kind === 'dark'
          ? `Playtesting · 1: Fill TP · 2: Invincible ${encounter.invincible ? 'ON' : 'OFF'} · Shift: Skip attack`
          : `Playtesting · 1 / 5: Fill TP · 6: Repeat ${encounter?.repeatAttack ? 'ON' : 'OFF'} · 2: Invincible ${encounter?.invincible ? 'ON' : 'OFF'} · 3: Special${encounter?.specialAttackQueued ? ' QUEUED' : ''} → Buffed attacks · 4: Fast kill ${encounter?.fastKill ? 'ON' : 'OFF'} · Shift: Skip`;
    $('battleTestStatus').hidden =
      encounter?.phase === 'rescue' || isProceedScene(encounter) || isPelletCast(encounter);
    $('battleTargetPanel').hidden = !acting || encounter.screen !== 'attack';
    $('battleActPanel').hidden = !acting || encounter.screen !== 'act';
    $('battleMenuBack').hidden = !acting || encounter.screen === 'menu';
    const floweyTurn = canFloweyAct(encounter),
      actCost =
        encounter?.kind === 'dark'
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
        : encounter?.kind === 'dark'
          ? `${darkActInfo(encounter).name} · ${actCost}% TP`
          : floweyTurn
            ? 'Friendlyness Pellets · 90% TP'
            : 'Proceed · 100% TP';
    $('battleProceedButton').disabled =
      !acting ||
      !canUseBattleAction(encounter, 'act') ||
      (encounter.kind !== 'tenna' && encounter.tp < actCost) ||
      (encounter.kind === 'dark' &&
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
          ? encounter.kind === 'tenna'
            ? 'Tenna defeated.'
            : encounter.kind === 'dark'
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
        : encounter?.kind === 'dark'
          ? encounter.turn === 'Kris'
            ? `Shine: ${encounter.shineCount || 0} / 5${encounter.darkUnlocked ? ' · Attacks and ACTs unlocked' : ''}`
            : `${darkActInfo(encounter).description}${darkActLocked(encounter) ? ' · LOCKED until Shine 3/3' : ''}`
          : floweyTurn
            ? `Deals ${encounter?.fastKill ? battleSettings.fastKillDamage : battleSettings.pelletsDamage} damage · Heals Flowey 35 HP`
            : `Proceed: ${encounter?.proceedCount || 0} / ${battleSettings.proceedsToDisappear}`;
    $('leaveBossButton').disabled =
      active &&
      (['minigame', 'minigameIntro'].includes(encounter.phase) ||
        isPelletCast(encounter) ||
        isProceedScene(encounter) ||
        encounter.phase === 'rescue' ||
        (encounter.finalAttackComplete && encounter.phase !== 'victory'));
  }
  return { sync };
}

function isBattleAction(action: string): action is BattleAction {
  return ['attack', 'act', 'item', 'defend', 'spare'].includes(action);
}
