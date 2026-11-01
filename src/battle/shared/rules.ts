import { advanceShootingMinigame, settleShootingMinigame } from '../tenna/minigame.ts';
import { itemDefinitions, maxHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { useHealingItem } from '../../inventory/healing.ts';
import { isItemId } from '../../inventory/identifiers.ts';
import type { Inventory, ItemDefinition, ItemResult, PartyHP } from '../../inventory/types.ts';
import { darkActInfo, darkActLocked } from '../dark/dark-acts.ts';
import {
  advanceRescueTime,
  attemptRalseyAttack,
  beginRescue,
  healAfterSnowgrave,
  isRalseyChoice,
} from '../noelle/aftermath.ts';
import { crossingSettings } from '../noelle/crossing.ts';
import { goalArena, goalGroundY, goalSettings, goalSpeed, moveBlueSoul } from '../noelle/goal.ts';
import { orbitSettings } from '../noelle/orbit.ts';
import { snowPathOffsets } from '../noelle/path-settings.ts';
import { isPelletCast, pelletsDuration, pelletsImpactTime } from '../noelle/pellets.ts';
import { proceedDialogue, proceedGlitchSeconds } from '../noelle/proceed.ts';
import { snowgraveArena, snowgraveDuration } from '../noelle/snowgrave.ts';
import { createAttackRunner } from './attack-runner.ts';
import { createAttackState } from './attack-state.ts';
import {
  battlePartyNames,
  canControlSoul,
  canFloweyAct,
  canKrisAct,
  canPartyAct,
  canUseBattleAction,
  partyTurnMember,
} from './availability.ts';
import { advanceGrazing } from './graze.ts';
import { advancePartyStatus, freshPartyStatus, syncPartyStatus } from './party-status.ts';
import { gainBattleTP } from './resources.ts';
import { battleArena, battleSettings, enemyAttacks } from './settings.ts';
import type { AttackDirection, Encounter } from './types.ts';
export function createEncounter(cleared = false, escaped = false): Encounter {
  return {
    phase: cleared ? 'victory' : 'intro',
    turn: cleared ? null : 'Kris',
    screen: 'menu',
    selectedAction: 'attack',
    tp: 0,
    tpGainAge: null,
    tpGainAmount: 0,
    tpGainSource: null,
    nextAttackGrazeTP: null,
    enemy: { name: '???', hp: battleSettings.enemyHP, maxHP: battleSettings.enemyHP, visible: !cleared },
    proceedCount: cleared ? battleSettings.proceedsToDisappear : 0,
    defending: false,
    projectileDamageMultiplier: 1,
    animationAge: 0,
    hitAge: null,
    hitActor: null,
    hitDamage: 0,
    pelletsCast: null,
    partyStatus: freshPartyStatus(),
    soul: null,
    snowAttack: null,
    enemyAttackCount: 0,
    lastEnemyAttack: null,
    goalAttackUsed: false,
    specialAttackQueued: false,
    strongerAttacks: false,
    strongerAttackCount: 0,
    finalAttackPending: false,
    finalAttackUsed: false,
    finalAttackComplete: false,
    snowgravePartyHealed: false,
    rescue: null,
    noelleEscaped: cleared && escaped,
    repeatAttack: false,
    invincible: false,
    fastKill: false,
    message: cleared ? (escaped ? 'Noelle escaped.' : '??? disappeared.') : 'Kris’s turn. Choose an action.',
  };
}
export function toggleRepeatAttack(encounter: Encounter | null) {
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  if (encounter.snowAttack?.direction === 'snowgrave' || encounter.finalAttackComplete) return false;
  encounter.repeatAttack = !encounter.repeatAttack;
  encounter.message = encounter.repeatAttack
    ? 'Repeat attack ON. Finish Kris and Flowey’s turns to replay the same attack.'
    : 'Repeat attack OFF. Noelle will continue to the next attack.';
  return true;
}
export function toggleInvincibility(encounter: Encounter | null) {
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  encounter.invincible = !encounter.invincible;
  if (encounter.snowAttack) {
    encounter.snowAttack.hitCooldown = 0;
    encounter.snowAttack.contactFlash = 0;
    encounter.snowAttack.contactAge = 0;
    encounter.snowAttack.contactCooldown = 0;
    encounter.snowAttack.inSnow = false;
  }
  encounter.message = `Invincibility ${encounter.invincible ? 'ON' : 'OFF'}.`;
  return true;
}
export function toggleFastKill(encounter: Encounter | null) {
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  encounter.fastKill = !encounter.fastKill;
  encounter.message = `Fast kill ${encounter.fastKill ? 'ON. Attacks deal 1,000 damage.' : 'OFF. Normal damage restored.'}`;
  return true;
}
export function fillTPForTesting(encounter: Encounter | null) {
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  gainBattleTP(encounter, battleSettings.maxTP, 'test');
  encounter.message = 'TP filled to 100% for playtesting.';
  return true;
}
export function requestSpecialAttack(encounter: Encounter | null) {
  if (['dark', 'tenna'].includes(encounter?.kind ?? '')) return false;
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  if (encounter.snowAttack?.direction === 'snowgrave' || encounter.finalAttackComplete) return false;
  encounter.repeatAttack = false;
  if (canControlSoul(encounter)) {
    beginEnemyAttack(encounter, 'goal', 'Special attack started for playtesting.');
  } else {
    encounter.specialAttackQueued = true;
    encounter.message =
      'Special attack queued. Finish the party’s turns, then reach the green goal to unlock buffed attacks.';
  }
  return true;
}
export function soulArena(encounter: Encounter): {
  x: number;
  y: number;
  size?: number;
  width?: number;
  height?: number;
  border: number;
} {
  if (encounter?.snowAttack?.direction === 'snowgrave') return snowgraveArena;
  if (encounter?.snowAttack?.direction === 'goal') return goalArena;
  return encounter?.snowAttack?.orbit?.box || battleArena;
}
export function isSoulInSnow(encounter: Encounter | null) {
  if (!canControlSoul(encounter) || !encounter.snowAttack) return false;
  if (
    ['dark', 'saxophones', 'tvBolts', 'crossing', 'goal', 'snowgrave'].includes(
      encounter.snowAttack.direction,
    )
  )
    return false;
  if (encounter.snowAttack.direction === 'path') {
    const top = encounter.soul.y - battleSettings.soulHeight / 2,
      bottom = encounter.soul.y + battleSettings.soulHeight / 2,
      left = encounter.soul.x - battleSettings.soulWidth / 2,
      right = encounter.soul.x + battleSettings.soulWidth / 2;
    // Check each pixel row so bends use the same safe gap that is drawn on screen.
    for (let row = top; row <= bottom; row++) {
      const bounds = snowPathBounds(encounter, row);
      if (bounds && (left < bounds.left || right > bounds.right)) return true;
    }
    return false;
  }
  const { x, y, size, border } = soulArena(encounter),
    rim = battleSettings.snowBorderDepth,
    halfWidth = battleSettings.soulWidth / 2,
    halfHeight = battleSettings.soulHeight / 2;
  if (
    encounter.soul.x - halfWidth < x + border + rim ||
    encounter.soul.x + halfWidth > x + present(size) - border - rim ||
    encounter.soul.y - halfHeight < y + border + rim ||
    encounter.soul.y + halfHeight > y + present(size) - border - rim
  )
    return true;
  if (!(encounter.snowAttack.height > 0)) return false;
  const horizontal = encounter.snowAttack.direction === 'right',
    farEdge = (horizontal ? battleArena.x : battleArena.y) + battleArena.size - battleArena.border,
    soulEdge = horizontal
      ? encounter.soul.x + battleSettings.soulWidth / 2
      : encounter.soul.y + battleSettings.soulHeight / 2;
  return soulEdge > farEdge - encounter.snowAttack.height;
}
// Snow scrolls downward through a winding gap. No fixed column stays safe.
export function snowPathBounds(encounter: Encounter, y: number) {
  const snow = encounter?.snowAttack;
  if (snow?.direction !== 'path') return null;
  const top = battleArena.y + battleArena.border,
    bottom = battleArena.y + battleArena.size - battleArena.border,
    travel = Math.max(0, snow.pathAge - battleSettings.snowStartDelay) * battleSettings.snowPathSpeed,
    distance = travel - (y - top);
  if (snow.pathAge < battleSettings.snowStartDelay || y < top || y > bottom || distance < 0) return null;
  const offsets = snowPathOffsets,
    position = distance / battleSettings.snowPathSegment,
    index = Math.floor(position),
    fraction = position - index,
    blend = fraction * fraction * (3 - 2 * fraction),
    offset = offsets[index % offsets.length] * (1 - blend) + offsets[(index + 1) % offsets.length] * blend,
    center = battleArena.x + battleArena.size / 2 + offset;
  const width = snow.buffed ? battleSettings.strongerPathWidth : battleSettings.snowPathWidth;
  return { left: center - width / 2, right: center + width / 2 };
}
export function moveSoul(encounter: Encounter, keys: Set<string>, dt: number) {
  if (!canControlSoul(encounter) || !Number.isFinite(dt) || dt <= 0) return;
  if (encounter.snowAttack?.direction === 'goal') {
    moveBlueSoul(
      encounter.snowAttack.goal,
      encounter.soul,
      keys,
      dt,
      battleSettings.soulWidth,
      battleSettings.soulHeight,
      battleSettings.soulSpeed,
    );
    return;
  }
  let dx = Number(keys.has('right')) - Number(keys.has('left')),
    dy = Number(keys.has('down')) - Number(keys.has('up'));
  const length = Math.hypot(dx, dy);
  if (length) {
    dx /= length;
    dy /= length;
  }
  const slowMultiplier =
    encounter.snowAttack?.direction === 'path'
      ? battleSettings.snowPathSlowMultiplier
      : battleSettings.snowSlowMultiplier;
  const speed =
    (encounter.kind === 'dark' ? battleSettings.darkSoulSpeed : battleSettings.soulSpeed) *
    (isSoulInSnow(encounter) ? slowMultiplier : 1);
  encounter.soul.x += dx * speed * dt;
  encounter.soul.y += dy * speed * dt;
  constrainSoul(encounter);
}
export function constrainSoul(encounter: Encounter) {
  const { x, y, size, width = size, height = size, border } = soulArena(encounter),
    halfWidth = battleSettings.soulWidth / 2,
    halfHeight = battleSettings.soulHeight / 2;
  present(encounter.soul).x = Math.max(
    x + border + halfWidth,
    Math.min(x + present(width) - border - halfWidth, present(encounter.soul).x),
  );
  present(encounter.soul).y = Math.max(
    y + border + halfHeight,
    Math.min(y + present(height) - border - halfHeight, present(encounter.soul).y),
  );
}
// The enemy turn can call this after Noelle has acted. It does not grant free TP.
export function startKrisTurn(encounter: Encounter, partyHP?: PartyHP) {
  if (!encounter || !['intro', 'enemy'].includes(encounter.phase)) return false;
  const finishedSnowgrave = encounter.snowAttack?.direction === 'snowgrave';
  if (finishedSnowgrave) {
    encounter.finalAttackComplete = true;
    healAfterSnowgrave(encounter, partyHP);
    syncPartyStatus(encounter, partyHP);
  }
  if (encounter.snowAttack?.direction === 'goal') {
    encounter.strongerAttacks = true;
    encounter.strongerAttackCount = 0;
  }
  encounter.phase = 'kris';
  encounter.turn = 'Kris';
  encounter.screen = 'menu';
  encounter.selectedAction = encounter.kind === 'dark' ? 'act' : 'attack';
  encounter.soul = null;
  encounter.snowAttack = null;
  encounter.defending = false;
  encounter.projectileDamageMultiplier = 1;
  encounter.message = finishedSnowgrave
    ? 'Snowgrave ends. Kris and Flowey recover 50 HP. Noelle is at 1 HP. Only ATTACK remains.'
    : 'Kris’s turn. Choose an action.';
  return true;
}
export function finishKrisTurn(encounter: Encounter, message: string) {
  if (!canKrisAct(encounter) || encounter.finalAttackComplete) return false;
  encounter.phase = 'flowey';
  encounter.turn = 'Flowey';
  encounter.screen = 'menu';
  encounter.selectedAction = encounter.kind === 'dark' ? 'act' : 'attack';
  encounter.message = message;
  return true;
}
export function finishPartyTurn(encounter: Encounter, message: string) {
  if (encounter?.finalAttackComplete) return false;
  if (['dark', 'tenna'].includes(encounter?.kind ?? '')) {
    if (!canPartyAct(encounter)) return false;
    const party = battlePartyNames(encounter),
      next = party.findIndex((name) => name === encounter.turn) + 1;
    if (next >= party.length) return startNextEnemyAttack(encounter, message);
    encounter.turn = party[next];
    encounter.phase = encounter.turn.toLowerCase();
    encounter.screen = 'menu';
    encounter.selectedAction = 'act';
    encounter.message = message;
    return true;
  }
  if (canPartyAct(encounter) && encounter.finalAttackPending) {
    beginEnemyAttack(encounter, 'snowgrave', message);
    return true;
  }
  if (canKrisAct(encounter)) return finishKrisTurn(encounter, message);
  if (!encounter || !canFloweyAct(encounter)) return false;
  return startNextEnemyAttack(encounter, message);
}
export function startNextEnemyAttack(encounter: Encounter, message: string) {
  if (encounter.kind === 'tenna') {
    const direction =
      encounter.repeatAttack && ['saxophones', 'tvBolts'].includes(encounter.lastEnemyAttack ?? '')
        ? encounter.lastEnemyAttack
        : encounter.enemyAttackCount % 2 === 0
          ? 'saxophones'
          : 'tvBolts';
    if (!encounter.repeatAttack || !encounter.lastEnemyAttack) encounter.enemyAttackCount++;
    if (direction === 'tvBolts') {
      beginEnemyAttack(encounter, 'tvBolts', 'Dodge the TV bolts! A glitch means five bolts!');
      encounter.turn = 'Tenna';
      return true;
    }
    encounter.phase = 'tennaCue';
    encounter.turn = 'Tenna';
    encounter.screen = 'menu';
    encounter.message = message;
    return true;
  }
  if (encounter.kind === 'dark') {
    beginEnemyAttack(encounter, 'dark', message);
    return true;
  }
  if (encounter.finalAttackPending) {
    beginEnemyAttack(encounter, 'snowgrave', message);
    return true;
  }
  const availableAttacks = enemyAttacks.filter((attack) => attack !== encounter.lastEnemyAttack);
  const special =
      encounter.specialAttackQueued ||
      (!encounter.goalAttackUsed && encounter.enemy.hp > 0 && encounter.enemy.hp <= goalSettings.threshold),
    repeating =
      !special &&
      encounter.repeatAttack &&
      [...enemyAttacks, 'goal'].some((attack) => attack === encounter.lastEnemyAttack),
    direction = special
      ? 'goal'
      : repeating
        ? encounter.lastEnemyAttack
        : encounter.strongerAttacks
          ? enemyAttacks[encounter.strongerAttackCount % enemyAttacks.length]
          : encounter.enemyAttackCount < enemyAttacks.length
            ? enemyAttacks[encounter.enemyAttackCount]
            : availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
  if (!repeating && !special) {
    encounter.enemyAttackCount++;
    if (encounter.strongerAttacks) encounter.strongerAttackCount++;
  }
  beginEnemyAttack(encounter, present(direction), message);
  return true;
}
export function completeTennaCue(encounter: Encounter) {
  if (encounter?.kind !== 'tenna' || encounter.phase !== 'tennaCue') return false;
  beginEnemyAttack(encounter, 'saxophones', 'Dodge the Helpers’ musical notes!');
  encounter.turn = 'Tenna';
  return true;
}
export function beginEnemyAttack(encounter: Encounter, direction: AttackDirection, message: string) {
  encounter.phase = 'enemy';
  encounter.turn = '???';
  encounter.soul = {
    x: battleArena.x + battleArena.size / 2,
    y: battleArena.y + battleArena.size / 2,
  };
  const darkPattern =
    encounter.repeatAttack && encounter.lastDarkPattern !== undefined
      ? encounter.lastDarkPattern
      : (encounter.darkAttackCount ?? 0) % 3;
  encounter.snowAttack = createAttackState(
    direction,
    encounter.kind === 'dark' ? 1 : (encounter.nextAttackGrazeTP ?? battleSettings.grazeTP),
    encounter.strongerAttacks && !['goal', 'snowgrave'].includes(direction),
    battleArena,
    battleSettings.snowStartDelay,
    darkPattern,
  );
  encounter.nextAttackGrazeTP = null;
  if (direction === 'tvBolts') encounter.soul.y = battleArena.y + battleArena.size - 35;
  if (direction === 'saxophones') encounter.soul.y = battleArena.y + battleArena.size - 35;
  if (direction === 'dark') {
    if (!encounter.repeatAttack || encounter.lastDarkPattern === undefined)
      encounter.darkAttackCount = (encounter.darkAttackCount ?? 0) + 1;
    encounter.lastDarkPattern = darkPattern;
  }
  if (encounter.snowAttack.direction === 'orbit') {
    const box = present(encounter.snowAttack.orbit).box;
    encounter.soul = {
      x: box.x + box.size - box.border - battleSettings.snowBorderDepth - battleSettings.soulWidth / 2 - 6,
      y: box.y + box.border + battleSettings.snowBorderDepth + battleSettings.soulHeight / 2 + 6,
    };
  }
  if (encounter.snowAttack.direction === 'crossing') {
    encounter.soul = { x: battleArena.x + 49, y: battleArena.y + 49 };
  }
  if (direction === 'goal') {
    encounter.goalAttackUsed = true;
    encounter.specialAttackQueued = false;
    encounter.soul = { x: goalArena.x + 34, y: goalGroundY - battleSettings.soulHeight / 2 };
  }
  if (direction === 'snowgrave') {
    encounter.finalAttackPending = false;
    encounter.finalAttackUsed = true;
    encounter.repeatAttack = false;
    encounter.specialAttackQueued = false;
    encounter.soul = {
      x: snowgraveArena.x + snowgraveArena.width / 2,
      y: snowgraveArena.y + snowgraveArena.height / 2,
    };
  }
  encounter.lastEnemyAttack = direction;
  encounter.screen = 'menu';
  encounter.selectedAction = encounter.kind === 'dark' ? 'act' : 'attack';
  encounter.message =
    direction === 'snowgrave'
      ? 'Noelle refuses to fall. 1 HP remaining... FINAL ATTACK: SNOWGRAVE!'
      : direction === 'goal'
        ? `${message} Reach the green marker to end the attack!`
        : message;
}
export function skipFallenTurns(encounter: Encounter, partyHP: PartyHP) {
  if (battlePartyNames(encounter).every((name) => partyHP[name] <= 0)) return false;
  if (['dark', 'tenna'].includes(encounter?.kind ?? '')) {
    let changed = false;
    for (let i = 0; i < 4 && canPartyAct(encounter) && partyHP[partyTurnMember(encounter)] <= 0; i++) {
      const name = encounter.turn;
      finishPartyTurn(encounter, `${name} is down. Their turn is skipped.`);
      changed = true;
    }
    return changed;
  }
  if (canKrisAct(encounter) && partyHP.Kris <= 0) {
    finishKrisTurn(encounter, 'Kris is down. Flowey’s turn.');
    return true;
  }
  if (canFloweyAct(encounter) && partyHP.Flowey <= 0) {
    finishPartyTurn(encounter, 'Flowey is down. Avoid the snow!');
    return true;
  }
  return false;
}
export function snowFillPercent(encounter: Encounter | null) {
  const height = encounter?.snowAttack?.height || 0,
    innerSize = battleArena.size - battleArena.border * 2;
  return Math.min(50, Math.floor((height / innerSize) * 100));
}
export function snowAttackStatus(encounter: Encounter | null) {
  if (encounter?.snowAttack?.direction === 'tvBolts') return 'TV bolts · Glitch = 5';
  if (encounter?.snowAttack?.direction === 'saxophones') return 'Dodge the saxophone notes!';
  if (encounter?.kind === 'dark' && encounter.snowAttack?.darkPattern === 2)
    return 'Warnings become swords after 0.5s';
  if (encounter?.kind === 'dark' && encounter.snowAttack?.darkPattern === 1)
    return 'Mini swords launch inward!';
  if (encounter?.kind === 'dark')
    return (encounter.snowAttack?.swords?.motion ?? 0) > 0
      ? 'Swords: left to right'
      : 'Swords: right to left';
  if (encounter?.snowAttack?.direction === 'snowgrave')
    return `Snowgrave: ${Math.ceil(Math.max(0, snowgraveDuration - encounter.snowAttack.snowgrave.age))}s left`;
  if (encounter?.snowAttack?.direction === 'goal')
    return `Jump to green goal · Speed ${goalSpeed(encounter.snowAttack.goal)} / ${goalSettings.maxSpeed}`;
  if (encounter?.snowAttack?.direction === 'crossing')
    return `Snowballs: ${Math.ceil(Math.max(0, crossingSettings.duration - encounter.snowAttack.crossing.age))}s left`;
  if (encounter?.snowAttack?.direction === 'orbit')
    return `Orbit: ${Math.ceil(Math.max(0, orbitSettings.duration - encounter.snowAttack.orbit.age))}s left`;
  return encounter?.snowAttack?.direction === 'path'
    ? `Path: ${Math.ceil(Math.max(0, battleSettings.snowPathDuration - encounter.snowAttack.pathAge))}s left`
    : `Snow: ${snowFillPercent(encounter)}% / 50%`;
}
const { stepSnowAttack } = createAttackRunner({
  get isSoulInSnow() {
    return isSoulInSnow;
  },
  get damageLivingTeammate() {
    return damageLivingTeammate;
  },
  get startKrisTurn() {
    return startKrisTurn;
  },
  get skipFallenTurns() {
    return skipFallenTurns;
  },
  get constrainSoul() {
    return constrainSoul;
  },
});
export function damageLivingTeammate(
  encounter: Encounter,
  partyHP: PartyHP,
  amount: number,
  source: string,
  random: () => number,
) {
  if (encounter.invincible) return false;
  const living = battlePartyNames(encounter).filter((name) => partyHP[name] > 0);
  if (!living.length) return false;
  const target = living[Math.floor(random() * living.length)],
    damage = Math.min(partyHP[target], amount);
  partyHP[target] -= damage;
  syncPartyStatus(encounter, partyHP);
  encounter.message = `${target} took ${damage} damage from ${source}.${partyHP[target] === 0 ? ` ${target} is down!` : ''}`;
  return true;
}
export function advanceSnowAttack(
  encounter: Encounter,
  partyHP: PartyHP,
  dt: number,
  random: () => number = Math.random,
) {
  if (!canControlSoul(encounter) || !encounter.snowAttack || !Number.isFinite(dt) || dt <= 0) return false;
  // Small steps keep a fast snowball from passing through the soul between frames.
  const steps = Math.max(1, Math.ceil(dt * 60 - 1e-9));
  let changed = false;
  for (let step = 0; step < steps && canControlSoul(encounter); step++) {
    changed = stepSnowAttack(encounter, partyHP, dt / steps, random) || changed;
    if (battlePartyNames(encounter).every((name) => partyHP[name] <= 0)) {
      if (encounter.snowAttack) encounter.snowAttack.grazeActive = false;
      break;
    }
    if (canControlSoul(encounter)) {
      const grazes = advanceGrazing(encounter, battleSettings, battleArena, dt / steps);
      if (grazes)
        changed = gainBattleTP(encounter, grazes * encounter.snowAttack.grazeTP, 'graze') > 0 || changed;
    }
  }
  return changed;
}
export function damageEnemy(encounter: Encounter, amount: number) {
  if (encounter.fastKill) amount = battleSettings.fastKillDamage;
  if (encounter.kind === 'dark') {
    const damage = Math.min(amount, Math.max(0, encounter.enemy.hp - 1));
    encounter.enemy.hp -= damage;
    encounter.hitAge = 0;
    encounter.hitActor = encounter.turn;
    encounter.hitDamage = damage;
    if (encounter.enemy.hp === 1) {
      encounter.phase = 'jackLever';
      encounter.screen = 'menu';
      encounter.soul = encounter.snowAttack = null;
      encounter.pelletsCast = null;
    }
    return damage;
  }
  if (encounter.kind === 'tenna') {
    const damage = Math.min(amount, Math.max(0, encounter.enemy.hp));
    encounter.enemy.hp -= damage;
    encounter.hitAge = 0;
    encounter.hitActor = encounter.turn;
    encounter.hitDamage = damage;
    if (encounter.enemy.hp === 0) {
      encounter.phase = 'victory';
      encounter.turn = null;
      encounter.enemy.visible = false;
      encounter.soul = encounter.snowAttack = null;
      encounter.screen = 'menu';
    }
    return damage;
  }
  const lethal = !encounter.finalAttackUsed && amount >= encounter.enemy.hp,
    // The genocide route continues after Snowgrave; its ending is still to come.
    damage = Math.min(amount, Math.max(0, encounter.enemy.hp - 1));
  encounter.enemy.hp -= damage;
  if (lethal) {
    encounter.enemy.hp = 1;
    encounter.finalAttackPending = true;
  }
  encounter.hitAge = 0;
  encounter.hitActor = encounter.turn;
  encounter.hitDamage = damage;
  return damage;
}
export function attackEnemy(encounter: Encounter) {
  if (!encounter || !canUseBattleAction(encounter, 'attack')) return false;
  if (encounter.finalAttackComplete) {
    if (isRalseyChoice(encounter)) return attemptRalseyAttack(encounter);
    beginRescue(encounter);
    return true;
  }
  const actor = encounter.turn;
  const damage = damageEnemy(
    encounter,
    ['dark', 'tenna'].includes(encounter.kind ?? '') && actor === 'Susie'
      ? 150
      : ['dark', 'tenna'].includes(encounter.kind ?? '') && actor === 'Ralsey'
        ? 60
        : canFloweyAct(encounter)
          ? battleSettings.floweyAttackDamage
          : battleSettings.krisAttackDamage,
  );
  const message = `${actor} dealt ${damage} damage to ${encounter.enemy.name}.`;
  if (encounter.phase === 'victory') encounter.message = message + ` ${encounter.enemy.name} was defeated.`;
  else finishPartyTurn(encounter, message);
  return true;
}
export function defend(encounter: Encounter) {
  if (!encounter || !canUseBattleAction(encounter, 'defend')) return false;
  const actor = encounter.turn;
  encounter.defending = true;
  encounter.projectileDamageMultiplier = battleSettings.defendDamageMultiplier;
  const gained = gainBattleTP(encounter, battleSettings.defendTP, 'defend');
  finishPartyTurn(
    encounter,
    `${actor} defended.${gained ? ` +${gained}% TP.` : ''} ${['dark', 'tenna'].includes(encounter.kind ?? '') ? 'Incoming projectiles' : 'Noelle’s next projectiles'} will be weaker.`,
  );
  return true;
}
export function friendlynessPellets(encounter: Encounter | null, partyHP: PartyHP) {
  if (!encounter) return false;
  if (
    (encounter?.kind === 'dark' && !encounter.darkUnlocked) ||
    !canFloweyAct(encounter) ||
    !canUseBattleAction(encounter, 'act') ||
    encounter.tp < (encounter.kind === 'dark' ? 65 : battleSettings.pelletsCost) ||
    !Number.isFinite(partyHP?.Flowey)
  )
    return false;
  encounter.tp -= encounter.kind === 'dark' ? 65 : battleSettings.pelletsCost;
  const restored = Math.min(battleSettings.pelletsHealing, maxHP - partyHP.Flowey);
  partyHP.Flowey += restored;
  encounter.pelletsCast = { age: 0, impacted: false, restored };
  encounter.phase = 'pellets';
  encounter.screen = 'menu';
  encounter.hitAge = encounter.hitActor = null;
  encounter.message = `Flowey used Friendlyness Pellets! Flowey recovered ${restored} HP.`;
  return true;
}
export function proceed(encounter: Encounter) {
  if (
    ['dark', 'tenna'].includes(encounter?.kind ?? '') ||
    !canKrisAct(encounter) ||
    !canUseBattleAction(encounter, 'act') ||
    encounter.tp < battleSettings.proceedCost
  )
    return false;
  encounter.tp -= battleSettings.proceedCost;
  encounter.proceedCount++;
  encounter.phase = 'proceedDialogue';
  encounter.turn = null;
  encounter.screen = 'menu';
  encounter.animationAge = 0;
  encounter.message = `Noelle: ${present(proceedDialogue(encounter)).text}`;
  return true;
}
export function advanceProceedDialogue(encounter: Encounter) {
  if (!proceedDialogue(encounter)) return false;
  encounter.animationAge = 0;
  if (encounter.proceedCount >= battleSettings.proceedsToDisappear) {
    encounter.phase = 'proceedGlitch';
    encounter.turn = null;
    encounter.message = 'The battle glitches around Noelle.';
    return true;
  }
  return startNextEnemyAttack(encounter, 'Noelle attacks after Kris proceeds.');
}
export function requestTennaMinigame(encounter: Encounter) {
  if (encounter.kind !== 'tenna' || !canKrisAct(encounter) || !canUseBattleAction(encounter, 'act'))
    return false;
  encounter.phase = 'minigameIntro';
  encounter.screen = 'menu';
  return true;
}
export function finishTennaMinigame(encounter: Encounter, hp: PartyHP, random: () => number = Math.random) {
  if (encounter.kind !== 'tenna' || encounter.phase !== 'minigame') return false;
  const result = settleShootingMinigame(encounter, hp, random);
  if (!result) return false;
  syncPartyStatus(encounter, hp);
  encounter.phase = 'kris';
  encounter.turn = 'Kris';
  const damage = Object.entries(result.damage)
    .map(([name, amount]) => `${name} lost ${amount} HP`)
    .join(', ');
  finishPartyTurn(
    encounter,
    `Minigame complete! +${result.points} points.${damage ? ' ' + damage + '.' : ''}`,
  );
  skipFallenTurns(encounter, hp);
  return true;
}
export function advanceBattleTime(encounter: Encounter, dt: number, partyHP?: PartyHP) {
  if (!encounter || !Number.isFinite(dt) || dt < 0) return false;
  advancePartyStatus(encounter, partyHP, dt);
  if (encounter.phase === 'minigame' && encounter.minigame && partyHP) {
    const before = encounter.minigame.misses;
    if (advanceShootingMinigame(encounter.minigame, dt)) return finishTennaMinigame(encounter, partyHP);
    return encounter.minigame.misses !== before;
  }
  if (encounter.darkHeal) {
    encounter.darkHeal.age += dt;
    if (encounter.darkHeal.age > 1) encounter.darkHeal = null;
  }
  if (encounter.tpGainAge !== null) {
    encounter.tpGainAge += dt;
    if (encounter.tpGainAge >= battleSettings.tpGainSeconds) encounter.tpGainAge = null;
  }
  if (encounter.hitAge !== null) {
    encounter.hitAge += dt;
    if (encounter.hitAge >= battleSettings.enemyHitSeconds) encounter.hitAge = null;
  }
  if (encounter.phase === 'rescue') return advanceRescueTime(encounter, dt);
  if (isPelletCast(encounter)) {
    const cast = encounter.pelletsCast;
    present(cast).age += dt;
    let changed = false;
    if (!present(cast).impacted && present(cast).age >= pelletsImpactTime - 1e-9) {
      present(cast).impacted = true;
      const damage = damageEnemy(encounter, battleSettings.pelletsDamage);
      if (encounter.phase === 'jackLever') return true;
      encounter.message = `Flowey used Friendlyness Pellets! ??? took ${damage} damage. Flowey recovered ${present(cast).restored} HP.`;
      changed = true;
    }
    if (present(cast).age >= pelletsDuration - 1e-9) {
      encounter.pelletsCast = null;
      if (encounter.kind === 'dark') {
        encounter.phase = 'flowey';
        encounter.turn = 'Flowey';
        return finishPartyTurn(encounter, encounter.message);
      }
      return startNextEnemyAttack(encounter, encounter.message);
    }
    return changed;
  }
  if (encounter.phase === 'proceedGlitch') {
    encounter.animationAge += dt;
    if (encounter.animationAge >= proceedGlitchSeconds - 1e-9) {
      encounter.animationAge = 0;
      encounter.enemy.hp = 1;
      encounter.enemy.visible = true;
      encounter.finalAttackUsed = encounter.finalAttackComplete = true;
      encounter.finalAttackPending = encounter.specialAttackQueued = encounter.repeatAttack = false;
      encounter.phase = 'kris';
      encounter.turn = 'Kris';
      encounter.selectedAction = encounter.kind === 'dark' ? 'act' : 'attack';
      encounter.soul = encounter.snowAttack = null;
      encounter.hitAge = encounter.hitActor = null;
      encounter.defending = false;
      encounter.projectileDamageMultiplier = 1;
      healAfterSnowgrave(encounter, partyHP);
      syncPartyStatus(encounter, partyHP);
      encounter.message = 'The glitches stop. Noelle is at 1 HP. Only ATTACK remains.';
      return true;
    }
  }
  return false;
}
export function useBattleItem(
  encounter: Encounter | null,
  partyHP: PartyHP,
  inventory: Inventory,
  itemId: string,
  target: string,
  random: () => number = Math.random,
): ItemResult | null {
  if (!isItemId(itemId)) return null;
  if (!encounter || !canUseBattleAction(encounter, 'item') || !(inventory?.items?.[itemId] > 0)) return null;
  const item: ItemDefinition = itemDefinitions[itemId],
    actor = encounter.turn;
  if (itemId === 'tpElixir') {
    const tpGained = gainBattleTP(encounter, encounter.kind === 'dark' ? 5 : present(item.tpGain), 'elixir');
    encounter.nextAttackGrazeTP = encounter.kind === 'dark' ? null : present(item.grazeTP);
    inventory.items[itemId]--;
    const message =
      encounter.kind === 'dark'
        ? `${actor} used ${item.name}! +${tpGained}% TP. Grazing stays at 1% TP.`
        : `${actor} used ${item.name}! +${tpGained}% TP. Grazing gives 4% TP during Noelle’s next attack.`;
    finishPartyTurn(encounter, message);
    return { tpGained, itemName: item.name, message };
  }
  const healing = useHealingItem(partyHP, inventory, itemId, target, random);
  if (!healing) return null;
  syncPartyStatus(encounter, partyHP);
  const message = `${target} used ${item.name} and recovered ${healing.restored} HP.`;
  finishPartyTurn(encounter, message);
  return { ...healing, message };
}
export function listenInDark(encounter: Encounter) {
  if (encounter?.kind !== 'dark' || !canUseBattleAction(encounter, 'act')) return false;
  return finishPartyTurn(encounter, 'You listen carefully. Something is watching from the darkness.');
}
export function spareInDark(encounter: Encounter) {
  if (encounter?.kind === 'tenna') return canPartyAct(encounter);
  if (encounter?.kind !== 'dark' || !canUseBattleAction(encounter, 'spare')) return false;
  return finishPartyTurn(encounter, `${encounter.turn} tried to spare the figure. The eyes keep watching.`);
}
export function useDarkAct(encounter: Encounter, partyHP: PartyHP, random: () => number = Math.random) {
  if (encounter?.kind !== 'dark' || !canUseBattleAction(encounter, 'act') || darkActLocked(encounter))
    return false;
  const act = darkActInfo(encounter);
  if (encounter.tp < act.cost) return false;
  const actor = encounter.turn;
  if (actor === 'Flowey') return friendlynessPellets(encounter, partyHP);
  if (actor === 'Kris') {
    encounter.tp -= act.cost;
    encounter.shineCount = Math.min(5, (encounter.shineCount || 0) + 1);
    encounter.darkUnlocked = encounter.shineCount >= 3;
    encounter.phase = encounter.shineCount >= 5 ? 'jackReveal' : 'shine';
    encounter.animationAge = 0;
    encounter.screen = 'menu';
    encounter.message =
      encounter.shineCount >= 5 ? 'NOT THE LAAAIght... Oh! You guys! Didnt see ya!' : 'NOT THE LAIGHT!';
    return true;
  }
  if (actor === 'Susie') {
    encounter.tp -= act.cost;
    const amount = 170 + Math.min(60, Math.floor(random() * 61)),
      damage = damageEnemy(encounter, amount);
    const message = `Susie used Rude Buster! ??? took ${damage} damage.`;
    if (encounter.phase === 'victory') encounter.message = message + ` ${encounter.enemy.name} was defeated.`;
    else finishPartyTurn(encounter, message);
    return true;
  }
  const injured = battlePartyNames(encounter).filter((name) => partyHP[name] < maxHP);
  if (!injured.length) return false;
  const target = injured[Math.min(injured.length - 1, Math.floor(random() * injured.length))];
  const amount = 50 + Math.min(20, Math.floor(random() * 21)),
    restored = Math.min(amount, maxHP - partyHP[target]);
  encounter.tp -= act.cost;
  partyHP[target] += restored;
  syncPartyStatus(encounter, partyHP);
  encounter.darkHeal = { target, restored, age: 0 };
  return finishPartyTurn(encounter, `Ralsey used Heal Player! ${target} recovered ${restored} HP.`);
}
export function completeDarkShine(encounter: Encounter) {
  if (encounter?.kind !== 'dark' || encounter.phase !== 'shine') return false;
  encounter.phase = 'kris';
  encounter.turn = 'Kris';
  return finishPartyTurn(
    encounter,
    encounter.darkUnlocked
      ? 'All attacks and ACTs are enabled. Keep shining to light the room.'
      : `Shine ${encounter.shineCount}/3. The darkness still blocks attacks and the other ACTs.`,
  );
}
