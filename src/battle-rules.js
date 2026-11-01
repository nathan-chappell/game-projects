import {createSaxAttack,advanceSaxAttack,noteTouches,saxSettings} from './battle-saxophones.js';
import {darkActInfo,darkActLocked} from './dark-acts.js';
import {createWarningSwords,advanceWarningSwords,warningSwordTouches} from './battle-warning-swords.js';
import {createMiniSwords,advanceMiniSwords,miniSwordHazards} from './battle-mini-swords.js';
import {createSwordAttack,advanceSwords,swordTouchesSoul,swordSettings} from './battle-swords.js';
// Battle rules are separate from drawing and buttons so they can be checked without a browser.
import { itemDefinitions, maxHP } from './config.js';
import { orbitSettings, createOrbitAttack, advanceOrbitBox, orbitHazards, cubeTouchesSoul } from './battle-orbit.js';
import { crossingSettings, createCrossingAttack, crossingHazards } from './battle-crossing.js';
import { goalSettings, goalArena, goalGroundY, createGoalAttack, goalSpeed, goalSnowballs, moveBlueSoul, touchesGreenGoal } from './battle-goal.js';
import { snowgraveSettings, snowgraveArena, snowgraveDuration, createSnowgraveAttack, snowgraveFrame, snowgraveTouchesSoul } from './battle-snowgrave.js';
import { healAfterSnowgrave, beginRescue, advanceRescueTime, isRalseyChoice, attemptRalseyAttack } from './battle-aftermath.js';
import { advanceGrazing } from './battle-graze.js';
import { proceedDialogue, proceedGlitchSeconds } from './battle-proceed.js';
import { isPelletCast, pelletsImpactTime, pelletsDuration } from './battle-pellets.js';
import { freshPartyStatus, syncPartyStatus, advancePartyStatus } from './battle-party-status.js';

export const battleSettings = {
  enemyHP: 3000,
  krisAttackDamage: 75,
  floweyAttackDamage: 80,
  fastKillDamage: 1000,
  pelletsDamage: 150,
  pelletsHealing: 35,
  pelletsCost: 90,
  swordSwingSeconds: 0.32,
  enemyHitSeconds: 0.5,
  soulSpeed: 150,
  darkSoulSpeed: 157.5,
  soulWidth: 24,
  soulHeight: 21,
  snowballDamage: 15,
  snowballRadius: 10,
  snowballSpeed: 70,
  snowballGravity: 180,
  snowballPileHeight: 6.2,
  snowBorderDepth: 16,
  snowWaveDelay: 0.55,
  snowStartDelay: 0.7,
  strongerWaveStagger: 0.45,
  snowEndPause: 0.65,
  snowSlowMultiplier: 0.5,
  snowContactDamage: 25,
  snowContactInterval: 1,
  snowPathDamage: 30,
  snowPathSlowMultiplier: 0.25,
  snowPathWidth: 80,
  strongerPathWidth: 64,
  strongerDamageBonus: 7,
  snowPathSpeed: 88,
  snowPathSegment: 140,
  snowPathDuration: 14,
  soulHitCooldown: 0.75,
  maxTP: 100,
  grazeTP: 3,
  grazeDistance: 10,
  grazeInterval: 0.5,
  defendTP: 10,
  tpGainSeconds: 0.65,
  proceedCost: 100,
  proceedsToDisappear: 3,
  defendDamageMultiplier: 0.5,
};

export const battleActions = ['attack', 'act', 'item', 'defend'];
export const enemyAttacks = ['down', 'right', 'path', 'orbit', 'crossing'];
export const battleArena = { x: 205, y: 48, size: 230, border: 4 };
// Sustained off-center stretches stop stationary players from waiting between short bends.
const snowPathOffsets = [0, -56, -56, 56, 56, -56, -56, 56, 56, 0];

export function createEncounter(cleared = false, escaped = false) {
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
    message: cleared ? escaped ? 'Noelle escaped.' : '??? disappeared.' : 'Kris’s turn. Choose an action.',
  };
}

export function canKrisAct(encounter) {
  return encounter?.phase === 'kris' && encounter.turn === 'Kris';
}

export function canFloweyAct(encounter) {
  return encounter?.phase === 'flowey' && encounter.turn === 'Flowey';
}

export const battlePartyNames=encounter=>['dark','tenna'].includes(encounter?.kind)?['Kris','Flowey','Susie','Ralsey']:['Kris','Flowey'];

export function canPartyAct(encounter) {
  return canKrisAct(encounter) || canFloweyAct(encounter) || (['dark','tenna'].includes(encounter?.kind)&&['Susie','Ralsey'].includes(encounter.turn)&&encounter.phase===encounter.turn.toLowerCase());
}

export function canUseBattleAction(encounter, action) {
  return canPartyAct(encounter) && (action!=='spare'||['dark','tenna'].includes(encounter.kind)) && !(encounter.kind==='dark'&&action==='attack'&&!encounter.darkUnlocked) && (!encounter.finalAttackComplete || (canKrisAct(encounter) && action === 'attack'));
}

export function canControlSoul(encounter) {
  return encounter?.phase === 'enemy' && !!encounter.soul;
}

export function toggleRepeatAttack(encounter) {
  if (!canPartyAct(encounter) && !canControlSoul(encounter)) return false;
  if (encounter.snowAttack?.direction === 'snowgrave' || encounter.finalAttackComplete) return false;
  encounter.repeatAttack = !encounter.repeatAttack;
  encounter.message = encounter.repeatAttack
    ? 'Repeat attack ON. Finish Kris and Flowey’s turns to replay the same attack.'
    : 'Repeat attack OFF. Noelle will continue to the next attack.';
  return true;
}

export function toggleInvincibility(encounter) {
  if (!canPartyAct(encounter) && !canControlSoul(encounter)) return false;
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

export function toggleFastKill(encounter) {
  if (!canPartyAct(encounter) && !canControlSoul(encounter)) return false;
  encounter.fastKill = !encounter.fastKill;
  encounter.message = `Fast kill ${encounter.fastKill ? 'ON. Attacks deal 1,000 damage.' : 'OFF. Normal damage restored.'}`;
  return true;
}

export function fillTPForTesting(encounter) {
  if (!canPartyAct(encounter) && !canControlSoul(encounter)) return false;
  gainBattleTP(encounter, battleSettings.maxTP, 'test');
  encounter.message = 'TP filled to 100% for playtesting.';
  return true;
}

export function requestSpecialAttack(encounter) {
  if(['dark','tenna'].includes(encounter?.kind))return false;
  if (!canPartyAct(encounter) && !canControlSoul(encounter)) return false;
  if (encounter.snowAttack?.direction === 'snowgrave' || encounter.finalAttackComplete) return false;
  encounter.repeatAttack = false;
  if (canControlSoul(encounter)) {
    beginEnemyAttack(encounter, 'goal', 'Special attack started for playtesting.');
  } else {
    encounter.specialAttackQueued = true;
    encounter.message = 'Special attack queued. Finish the party’s turns, then reach the green goal to unlock buffed attacks.';
  }
  return true;
}

export function soulArena(encounter) {
  if (encounter?.snowAttack?.direction === 'snowgrave') return snowgraveArena;
  if (encounter?.snowAttack?.direction === 'goal') return goalArena;
  return encounter?.snowAttack?.orbit?.box || battleArena;
}

export function isSoulInSnow(encounter) {
  if (!canControlSoul(encounter) || !encounter.snowAttack) return false;
  if (['dark', 'saxophones', 'crossing', 'goal', 'snowgrave'].includes(encounter.snowAttack.direction)) return false;
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
    encounter.soul.x + halfWidth > x + size - border - rim ||
    encounter.soul.y - halfHeight < y + border + rim ||
    encounter.soul.y + halfHeight > y + size - border - rim
  ) return true;
  if (!(encounter.snowAttack.height > 0)) return false;
  const horizontal = encounter.snowAttack.direction === 'right',
    farEdge = (horizontal ? battleArena.x : battleArena.y) + battleArena.size - battleArena.border,
    soulEdge = horizontal
      ? encounter.soul.x + battleSettings.soulWidth / 2
      : encounter.soul.y + battleSettings.soulHeight / 2;
  return soulEdge > farEdge - encounter.snowAttack.height;
}

// Snow scrolls downward through a winding gap. No fixed column stays safe.
export function snowPathBounds(encounter, y) {
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

export function moveSoul(encounter, keys, dt) {
  if (!canControlSoul(encounter) || !Number.isFinite(dt) || dt <= 0) return;
  if (encounter.snowAttack?.direction === 'goal') {
    moveBlueSoul(encounter.snowAttack.goal, encounter.soul, keys, dt,
      battleSettings.soulWidth, battleSettings.soulHeight, battleSettings.soulSpeed);
    return;
  }
  let dx = Number(keys.has('right')) - Number(keys.has('left')),
    dy = Number(keys.has('down')) - Number(keys.has('up'));
  const length = Math.hypot(dx, dy);
  if (length) {
    dx /= length;
    dy /= length;
  }
  const slowMultiplier = encounter.snowAttack?.direction === 'path'
    ? battleSettings.snowPathSlowMultiplier : battleSettings.snowSlowMultiplier;
  const speed = (encounter.kind==='dark'?battleSettings.darkSoulSpeed:battleSettings.soulSpeed) * (isSoulInSnow(encounter) ? slowMultiplier : 1);
  encounter.soul.x += dx * speed * dt;
  encounter.soul.y += dy * speed * dt;
  constrainSoul(encounter);
}

function constrainSoul(encounter) {
  const { x, y, size, width = size, height = size, border } = soulArena(encounter),
    halfWidth = battleSettings.soulWidth / 2,
    halfHeight = battleSettings.soulHeight / 2;
  encounter.soul.x = Math.max(
    x + border + halfWidth,
    Math.min(x + width - border - halfWidth, encounter.soul.x),
  );
  encounter.soul.y = Math.max(
    y + border + halfHeight,
    Math.min(y + height - border - halfHeight, encounter.soul.y),
  );
}

// The enemy turn can call this after Noelle has acted. It does not grant free TP.
export function startKrisTurn(encounter, partyHP) {
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
  encounter.selectedAction = encounter.kind==='dark'?'act':'attack';
  encounter.soul = null;
  encounter.snowAttack = null;
  encounter.defending = false;
  encounter.projectileDamageMultiplier = 1;
  encounter.message = finishedSnowgrave
    ? 'Snowgrave ends. Kris and Flowey recover 50 HP. Noelle is at 1 HP. Only ATTACK remains.'
    : 'Kris’s turn. Choose an action.';
  return true;
}

export function finishKrisTurn(encounter, message) {
  if (!canKrisAct(encounter) || encounter.finalAttackComplete) return false;
  encounter.phase = 'flowey';
  encounter.turn = 'Flowey';
  encounter.screen = 'menu';
  encounter.selectedAction = encounter.kind==='dark'?'act':'attack';
  encounter.message = message;
  return true;
}

export function finishPartyTurn(encounter, message) {
  if (encounter?.finalAttackComplete) return false;
  if(['dark','tenna'].includes(encounter?.kind)){
    if(!canPartyAct(encounter))return false;
    const party=battlePartyNames(encounter),next=party.indexOf(encounter.turn)+1;
    if(next>=party.length)return startNextEnemyAttack(encounter,message);
    encounter.turn=party[next];encounter.phase=encounter.turn.toLowerCase();encounter.screen='menu';encounter.selectedAction='act';encounter.message=message;return true;
  }
  if (canPartyAct(encounter) && encounter.finalAttackPending) {
    beginEnemyAttack(encounter, 'snowgrave', message);
    return true;
  }
  if (canKrisAct(encounter)) return finishKrisTurn(encounter, message);
  if (!canFloweyAct(encounter)) return false;
  return startNextEnemyAttack(encounter, message);
}

function startNextEnemyAttack(encounter, message) {
  if(encounter.kind==='tenna'){encounter.phase='tennaCue';encounter.turn='Tenna';encounter.screen='menu';encounter.message=message;return true;}
  if(encounter.kind==='dark'){beginEnemyAttack(encounter,'dark',message);return true;}
  if (encounter.finalAttackPending) {
    beginEnemyAttack(encounter, 'snowgrave', message);
    return true;
  }
  const availableAttacks = enemyAttacks.filter(attack => attack !== encounter.lastEnemyAttack);
  const special = encounter.specialAttackQueued ||
    (!encounter.goalAttackUsed && encounter.enemy.hp > 0 && encounter.enemy.hp <= goalSettings.threshold),
    repeating = !special && encounter.repeatAttack && [...enemyAttacks, 'goal'].includes(encounter.lastEnemyAttack),
    direction = special ? 'goal' : repeating ? encounter.lastEnemyAttack
      : encounter.strongerAttacks ? enemyAttacks[encounter.strongerAttackCount % enemyAttacks.length]
      : encounter.enemyAttackCount < enemyAttacks.length ? enemyAttacks[encounter.enemyAttackCount]
        : availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
  if (!repeating && !special) {
    encounter.enemyAttackCount++;
    if (encounter.strongerAttacks) encounter.strongerAttackCount++;
  }
  beginEnemyAttack(encounter, direction, message);
  return true;
}

export function completeTennaCue(encounter){
 if(encounter?.kind!=='tenna'||encounter.phase!=='tennaCue')return false;
 beginEnemyAttack(encounter,'saxophones','Dodge the Helpers’ musical notes!');encounter.turn='Tenna';return true;
}

function beginEnemyAttack(encounter, direction, message) {
  encounter.phase = 'enemy';
  encounter.turn = '???';
  encounter.soul = {
    x: battleArena.x + battleArena.size / 2,
    y: battleArena.y + battleArena.size / 2,
  };
  encounter.snowAttack = {
    direction,
    grazeTP: encounter.kind==='dark'?1:encounter.nextAttackGrazeTP ?? battleSettings.grazeTP,
    buffed: encounter.strongerAttacks && !['goal', 'snowgrave'].includes(direction),
    pathAge: 0,
    height: 0,
    balls: [],
    impacts: [],
    waves: 0,
    nextWaveIn: battleSettings.snowStartDelay,
    hitCooldown: 0,
    contactAge: 0,
    contactCooldown: 0,
    inSnow: false,
    contactFlash: 0,
    endingAge: null,
    grazeActive: false,
    grazeCooldown: 0,
  };
  encounter.nextAttackGrazeTP = null;
  if(direction==='saxophones'){encounter.snowAttack.saxophones=createSaxAttack(battleArena);encounter.soul.y=battleArena.y+battleArena.size-35;}
  if(direction==='dark'){
    const pattern=encounter.repeatAttack&&encounter.lastDarkPattern!==undefined?encounter.lastDarkPattern:(encounter.darkAttackCount??0)%3;
    if(!encounter.repeatAttack||encounter.lastDarkPattern===undefined)encounter.darkAttackCount=(encounter.darkAttackCount??0)+1;
    encounter.lastDarkPattern=pattern;encounter.snowAttack.darkPattern=pattern;
    encounter.snowAttack.swords=createSwordAttack(battleArena);
    encounter.snowAttack.miniSwords=createMiniSwords(battleArena,pattern===1);
    if(pattern===2){encounter.snowAttack.warningSwords=createWarningSwords(battleArena);encounter.snowAttack.miniSwords=encounter.snowAttack.warningSwords.minis;}
  }
  if (encounter.snowAttack.direction === 'orbit') {
    encounter.snowAttack.orbit = createOrbitAttack(encounter.snowAttack.buffed ? 'buffed' : 'normal');
    const box = encounter.snowAttack.orbit.box;
    encounter.soul = {
      x: box.x + box.size - box.border - battleSettings.snowBorderDepth - battleSettings.soulWidth / 2 - 6,
      y: box.y + box.border + battleSettings.snowBorderDepth + battleSettings.soulHeight / 2 + 6,
    };
  }
  if (encounter.snowAttack.direction === 'crossing') {
    encounter.snowAttack.crossing = createCrossingAttack(encounter.snowAttack.buffed);
    encounter.soul = { x: battleArena.x + 49, y: battleArena.y + 49 };
  }
  if (direction === 'goal') {
    encounter.goalAttackUsed = true;
    encounter.specialAttackQueued = false;
    encounter.snowAttack.goal = createGoalAttack();
    encounter.soul = { x: goalArena.x + 34, y: goalGroundY - battleSettings.soulHeight / 2 };
  }
  if (direction === 'snowgrave') {
    encounter.finalAttackPending = false;
    encounter.finalAttackUsed = true;
    encounter.repeatAttack = false;
    encounter.specialAttackQueued = false;
    encounter.snowAttack.snowgrave = createSnowgraveAttack();
    encounter.soul = { x: snowgraveArena.x + snowgraveArena.width / 2,
      y: snowgraveArena.y + snowgraveArena.height / 2 };
  }
  encounter.lastEnemyAttack = direction;
  encounter.screen = 'menu';
  encounter.selectedAction = encounter.kind==='dark'?'act':'attack';
  encounter.message = direction === 'snowgrave' ? 'Noelle refuses to fall. 1 HP remaining... FINAL ATTACK: SNOWGRAVE!'
    : direction === 'goal' ? `${message} Reach the green marker to end the attack!` : message;
}

export function skipFallenTurns(encounter, partyHP) {
  if (battlePartyNames(encounter).every(name=>partyHP[name]<=0)) return false;
  if(['dark','tenna'].includes(encounter?.kind)){
    let changed=false;
    for(let i=0;i<4&&canPartyAct(encounter)&&partyHP[encounter.turn]<=0;i++){
      const name=encounter.turn;finishPartyTurn(encounter,`${name} is down. Their turn is skipped.`);changed=true;
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

export function snowFillPercent(encounter) {
  const height = encounter?.snowAttack?.height || 0,
    innerSize = battleArena.size - battleArena.border * 2;
  return Math.min(50, Math.floor((height / innerSize) * 100));
}

export function snowAttackStatus(encounter) {
  if(encounter?.snowAttack?.direction==='saxophones')return 'Dodge the saxophone notes!';
  if(encounter?.kind==='dark'&&encounter.snowAttack?.darkPattern===2)return 'Warnings become swords after 0.5s';
  if(encounter?.kind==='dark'&&encounter.snowAttack?.darkPattern===1)return 'Mini swords launch inward!';
  if(encounter?.kind==='dark')return encounter.snowAttack?.swords?.motion>0?'Swords: left to right':'Swords: right to left';
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

function snowballTouchesSoul(ball, soul, radius = battleSettings.snowballRadius) {
  const dx = Math.max(0, Math.abs(ball.x - soul.x) - battleSettings.soulWidth / 2),
    dy = Math.max(0, Math.abs(ball.y - soul.y) - battleSettings.soulHeight / 2);
  return dx * dx + dy * dy <= radius ** 2;
}

function damageLivingTeammate(encounter, partyHP, amount, source, random) {
  if (encounter.invincible) return false;
  const living = battlePartyNames(encounter).filter(name => partyHP[name] > 0);
  if (!living.length) return false;
  const target = living[Math.floor(random() * living.length)],
    damage = Math.min(partyHP[target], amount);
  partyHP[target] -= damage;
  syncPartyStatus(encounter, partyHP);
  encounter.message = `${target} took ${damage} damage from ${source}.${partyHP[target] === 0 ? ` ${target} is down!` : ''}`;
  return true;
}

export function bossAttackDamage(encounter, baseDamage) {
  return baseDamage + (encounter?.snowAttack?.buffed ? battleSettings.strongerDamageBonus : 0);
}

function advanceSnowContact(encounter, partyHP, dt, random) {
  const snow = encounter.snowAttack, path = snow.direction === 'path';
  // A moving path edge can alternate safe/snowy several times while a direction
  // is held. Crossing that edge must not reset the time between damage ticks.
  if (path) snow.contactCooldown = Math.max(0, snow.contactCooldown - dt);
  if (!isSoulInSnow(encounter)) {
    snow.contactAge = 0;
    snow.inSnow = false;
    return false;
  }
  const entering = !snow.inSnow;
  snow.inSnow = true;
  snow.contactAge += dt;
  if (path) {
    if (snow.contactCooldown > 1e-9) return false;
  } else if (!entering) {
    if (snow.contactAge < battleSettings.snowContactInterval - 1e-9) return false;
    snow.contactAge = Math.max(0, snow.contactAge - battleSettings.snowContactInterval);
  }
  const damage = bossAttackDamage(encounter,
    snow.direction === 'path' ? battleSettings.snowPathDamage : battleSettings.snowContactDamage);
  if (!damageLivingTeammate(encounter, partyHP, damage, 'the snow', random)) return false;
  if (path) snow.contactCooldown = battleSettings.snowContactInterval;
  snow.contactFlash = 0.3;
  return true;
}

function stepSnowAttack(encounter, partyHP, dt, random) {
  if(encounter.snowAttack.direction==='saxophones'){
    const snow=encounter.snowAttack;snow.hitCooldown=Math.max(0,snow.hitCooldown-dt);
    const finished=advanceSaxAttack(snow.saxophones,dt);let changed=false;
    if(snow.hitCooldown<=0&&snow.saxophones.notes.some(n=>noteTouches(n,encounter.soul))){
      changed=damageLivingTeammate(encounter,partyHP,projectileDamage(encounter,saxSettings.damage),'a musical note',random);snow.hitCooldown=saxSettings.hitCooldown;
    }
    if(finished){startKrisTurn(encounter,partyHP);skipFallenTurns(encounter,partyHP);return true;}
    return changed;
  }
  if(encounter.snowAttack.direction==='dark'){
    const snow=encounter.snowAttack;snow.hitCooldown=Math.max(0,snow.hitCooldown-dt);
    const minisFinished=snow.darkPattern===2?advanceWarningSwords(snow.warningSwords,dt,encounter.soul):advanceMiniSwords(snow.miniSwords,dt);
    const finished=snow.darkPattern===0?advanceSwords(snow.swords,dt):minisFinished;let changed=false;
    if(snow.hitCooldown<=0&&((snow.warningSwords&&warningSwordTouches(snow.warningSwords,encounter.soul,battleSettings.soulWidth,battleSettings.soulHeight))||snow.swords.swords.some(s=>swordTouchesSoul(s,snow.swords.motion,encounter.soul,battleSettings.soulWidth,battleSettings.soulHeight))||miniSwordHazards(snow.miniSwords,encounter.soul,battleSettings.soulWidth,battleSettings.soulHeight).some(h=>h.hit))){
      changed=damageLivingTeammate(encounter,partyHP,projectileDamage(encounter,swordSettings.damage),'a sword',random);snow.hitCooldown=swordSettings.hitCooldown;
    }
    if(finished){startKrisTurn(encounter,partyHP);skipFallenTurns(encounter,partyHP);return true;}
    return changed;
  }
  const snow = encounter.snowAttack,
    { x, y, size, border } = battleArena,
    innerSize = size - border * 2,
    horizontal = snow.direction === 'right',
    farEdge = (horizontal ? x : y) + size - border,
    radius = battleSettings.snowballRadius;
  snow.hitCooldown = Math.max(0, snow.hitCooldown - dt);
  snow.contactFlash = Math.max(0, snow.contactFlash - dt);
  snow.impacts = snow.impacts.filter((impact) => (impact.age += dt) < 0.35);
  if (snow.endingAge !== null) {
    snow.endingAge += dt;
    if (snow.endingAge >= battleSettings.snowEndPause) {
      startKrisTurn(encounter, partyHP);
      skipFallenTurns(encounter, partyHP);
      return true;
    }
    return false;
  }
  if (snow.direction === 'snowgrave') {
    const spell = snow.snowgrave, before = snowgraveFrame(spell),
      previousSecond = Math.ceil(snowgraveDuration - spell.age);
    spell.age = Math.min(snowgraveDuration, spell.age + dt);
    if (spell.age >= snowgraveDuration - 1e-9) {
      startKrisTurn(encounter, partyHP);
      skipFallenTurns(encounter, partyHP);
      return true;
    }
    let changed = false;
    if (snow.hitCooldown <= 0 && snowgraveTouchesSoul(spell, encounter.soul,
      battleSettings.soulWidth, battleSettings.soulHeight)) {
      changed = damageLivingTeammate(encounter, partyHP,
        projectileDamage(encounter, snowgraveSettings.damage), 'Snowgrave', random);
      snow.hitCooldown = snowgraveSettings.hitCooldown;
    }
    const after = snowgraveFrame(spell);
    return changed || before.stage !== after.stage || before.index !== after.index ||
      Math.ceil(snowgraveDuration - spell.age) !== previousSecond;
  }
  if (snow.direction === 'goal') {
    const goal = snow.goal, previousSpeed = goalSpeed(goal);
    goal.age += dt;
    if (touchesGreenGoal(encounter.soul, battleSettings.soulWidth, battleSettings.soulHeight)) {
      snow.endingAge = 0;
      encounter.message = 'You reached the green marker! Your turn is next.';
      return true;
    }
    let changed = false;
    if (goal.age >= goalSettings.warmup && snow.hitCooldown <= 0 &&
      goalSnowballs(goal).some(ball => ball.active && snowballTouchesSoul(ball, encounter.soul, ball.radius))) {
      changed = damageLivingTeammate(encounter, partyHP,
        projectileDamage(encounter, goalSettings.damage), 'a snowball', random);
      snow.hitCooldown = battleSettings.soulHitCooldown;
    }
    return changed || goalSpeed(goal) !== previousSpeed;
  }
  if (snow.direction === 'crossing') {
    const crossing = snow.crossing,
      previousSecond = Math.ceil(crossingSettings.duration - crossing.age);
    crossing.age = Math.min(crossingSettings.duration, crossing.age + dt);
    if (crossing.age >= crossingSettings.duration) {
      snow.endingAge = 0;
      encounter.message = 'The snowballs stop. Your turn is next.';
      return true;
    }
    let changed = false;
    if (crossing.age >= crossingSettings.warmup && snow.hitCooldown <= 0) {
      const { large, small, spinning } = crossingHazards(crossing, battleArena),
        hit = large.some(ball => snowballTouchesSoul(ball, encounter.soul, crossingSettings.largeRadius)) ||
          small.some(ball => snowballTouchesSoul(ball, encounter.soul, crossingSettings.smallRadius)) ||
          spinning.some(ball => snowballTouchesSoul(ball, encounter.soul, crossingSettings.spinnerRadius));
      if (hit) {
        changed = damageLivingTeammate(encounter, partyHP,
          projectileDamage(encounter, bossAttackDamage(encounter, crossingSettings.damage)), 'a snowball', random);
        snow.hitCooldown = battleSettings.soulHitCooldown;
      }
    }
    return changed || Math.ceil(crossingSettings.duration - crossing.age) !== previousSecond;
  }
  if (snow.direction === 'orbit') {
    const orbit = snow.orbit,
      previousSecond = Math.ceil(orbitSettings.duration - orbit.age);
    advanceOrbitBox(orbit, encounter.soul, dt);
    constrainSoul(encounter);
    if (orbit.age >= orbitSettings.duration) {
      snow.endingAge = 0;
      encounter.message = 'The ice stops spinning. Your turn is next.';
      return true;
    }
    let changed = false;
    if (orbit.age >= orbitSettings.warmup && snow.hitCooldown <= 0) {
      const { cube, balls } = orbitHazards(orbit),
        hitCube = cubeTouchesSoul(cube, encounter.soul, battleSettings.soulWidth, battleSettings.soulHeight),
        hitBall = !hitCube && balls.some(ball => snowballTouchesSoul(ball, encounter.soul, orbitSettings.ballRadius));
      if (hitCube || hitBall) {
        changed = damageLivingTeammate(encounter, partyHP,
          projectileDamage(encounter, bossAttackDamage(encounter, hitCube ? orbit.cubeDamage : orbitSettings.ballDamage)),
          hitCube ? 'the ice cube' : 'an orbiting snowball', random);
        snow.hitCooldown = battleSettings.soulHitCooldown;
        if (battlePartyNames(encounter).every(name=>partyHP[name]<=0)) return changed;
      }
    }
    return advanceSnowContact(encounter, partyHP, dt, random) || changed ||
      Math.ceil(orbitSettings.duration - orbit.age) !== previousSecond;
  }
  if (snow.direction === 'path') {
    const previousSecond = Math.ceil(battleSettings.snowPathDuration - snow.pathAge);
    snow.pathAge = Math.min(battleSettings.snowPathDuration, snow.pathAge + dt);
    if (snow.pathAge >= battleSettings.snowPathDuration) {
      snow.endingAge = 0;
      encounter.message = 'The snow clears. Your turn is next.';
      return true;
    }
    return advanceSnowContact(encounter, partyHP, dt, random) ||
      Math.ceil(battleSettings.snowPathDuration - snow.pathAge) !== previousSecond;
  }
  if (!snow.balls.length) {
    snow.nextWaveIn -= dt;
    if (snow.nextWaveIn <= 1e-9) {
      snow.waves++;
      const count = snow.buffed ? 5 : 3;
      snow.balls = Array.from({ length: count }, (_, lane) => {
        const offset = border + radius + ((lane + 0.2 + random() * 0.6) / count) * (innerSize - radius * 2);
        return {
          grazeLane: lane,
          x: horizontal ? x - radius - 8 : x + offset,
          y: horizontal ? y + offset : y - radius - 8,
          velocity: battleSettings.snowballSpeed,
          delay: snow.buffed && lane % 2 ? battleSettings.strongerWaveStagger : 0,
          hit: false,
        };
      });
    }
  }
  let changed = false;
  const hadBalls = snow.balls.length > 0;
  const falling = [];
  for (const ball of snow.balls) {
    if (ball.delay > 1e-9) {
      ball.delay = Math.max(0, ball.delay - dt);
      falling.push(ball);
      continue;
    }
    ball.velocity += battleSettings.snowballGravity * dt;
    if (horizontal) ball.x += ball.velocity * dt;
    else ball.y += ball.velocity * dt;
    if (!ball.hit && snow.hitCooldown <= 0 && snowballTouchesSoul(ball, encounter.soul)) {
      if (damageLivingTeammate(
        encounter, partyHP, projectileDamage(encounter, bossAttackDamage(encounter, battleSettings.snowballDamage)), 'a snowball', random,
      )) {
        ball.hit = true;
        snow.hitCooldown = battleSettings.soulHitCooldown;
        changed = true;
        if (battlePartyNames(encounter).every(name=>partyHP[name]<=0)) return true;
      }
    }
    if ((horizontal ? ball.x : ball.y) + radius >= farEdge - Math.max(snow.height, battleSettings.snowBorderDepth)) {
      snow.height = Math.min(innerSize / 2, snow.height + battleSettings.snowballPileHeight);
      snow.impacts.push({ x: ball.x, y: ball.y, age: 0 });
      changed = true;
    } else falling.push(ball);
  }
  snow.balls = falling;
  constrainSoul(encounter);
  if (hadBalls && !snow.balls.length) snow.nextWaveIn = battleSettings.snowWaveDelay;
  if (snow.height >= innerSize / 2) {
    snow.balls = [];
    snow.endingAge = 0;
    encounter.message = 'The box is half full. The snowfall stops.';
    changed = true;
  } else changed = advanceSnowContact(encounter, partyHP, dt, random) || changed;
  return changed;
}

export function advanceSnowAttack(encounter, partyHP, dt, random = Math.random) {
  if (!canControlSoul(encounter) || !encounter.snowAttack || !Number.isFinite(dt) || dt <= 0) return false;
  // Small steps keep a fast snowball from passing through the soul between frames.
  const steps = Math.max(1, Math.ceil(dt * 60 - 1e-9));
  let changed = false;
  for (let step = 0; step < steps && canControlSoul(encounter); step++) {
    changed = stepSnowAttack(encounter, partyHP, dt / steps, random) || changed;
    if (battlePartyNames(encounter).every(name=>partyHP[name]<=0)) {
      if (encounter.snowAttack) encounter.snowAttack.grazeActive = false;
      break;
    }
    if (canControlSoul(encounter)) {
      const grazes = advanceGrazing(encounter, battleSettings, battleArena, dt / steps);
      if (grazes) changed = gainBattleTP(encounter, grazes * encounter.snowAttack.grazeTP, 'graze') > 0 || changed;
    }
  }
  return changed;
}

function damageEnemy(encounter, amount) {
  if (encounter.fastKill) amount = battleSettings.fastKillDamage;
  if(['dark','tenna'].includes(encounter.kind)){
    const damage=Math.min(amount,Math.max(0,encounter.enemy.hp));encounter.enemy.hp-=damage;
    encounter.hitAge=0;encounter.hitActor=encounter.turn;encounter.hitDamage=damage;
    if(encounter.enemy.hp===0){encounter.phase='victory';encounter.turn=null;encounter.enemy.visible=false;encounter.soul=encounter.snowAttack=null;encounter.screen='menu';}
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

export function attackEnemy(encounter) {
  if (!canUseBattleAction(encounter, 'attack')) return false;
  if (encounter.finalAttackComplete) {
    if (isRalseyChoice(encounter)) return attemptRalseyAttack(encounter);
    beginRescue(encounter);
    return true;
  }
  const actor = encounter.turn;
  const damage = damageEnemy(
    encounter,
    ['dark','tenna'].includes(encounter.kind)&&actor==='Susie'?150:['dark','tenna'].includes(encounter.kind)&&actor==='Ralsey'?60:canFloweyAct(encounter) ? battleSettings.floweyAttackDamage : battleSettings.krisAttackDamage,
  );
  const message=`${actor} dealt ${damage} damage to ${encounter.enemy.name}.`;
  if(encounter.phase==='victory')encounter.message=message+` ${encounter.enemy.name} was defeated.`;else finishPartyTurn(encounter,message);
  return true;
}

export function defend(encounter) {
  if (!canUseBattleAction(encounter, 'defend')) return false;
  const actor = encounter.turn;
  encounter.defending = true;
  encounter.projectileDamageMultiplier = battleSettings.defendDamageMultiplier;
  const gained = gainBattleTP(encounter, battleSettings.defendTP, 'defend');
  finishPartyTurn(encounter, `${actor} defended.${gained ? ` +${gained}% TP.` : ''} ${['dark','tenna'].includes(encounter.kind)?'Incoming projectiles':'Noelle’s next projectiles'} will be weaker.`);
  return true;
}

export function friendlynessPellets(encounter, partyHP) {
  if (
    (encounter?.kind==='dark'&&!encounter.darkUnlocked) || !canFloweyAct(encounter) || !canUseBattleAction(encounter, 'act') ||
    encounter.tp < (encounter.kind==='dark'?65:battleSettings.pelletsCost) ||
    !Number.isFinite(partyHP?.Flowey)
  )
    return false;
  encounter.tp -= encounter.kind==='dark'?65:battleSettings.pelletsCost;
  const restored = Math.min(battleSettings.pelletsHealing, maxHP - partyHP.Flowey);
  partyHP.Flowey += restored;
  encounter.pelletsCast = { age: 0, impacted: false, restored };
  encounter.phase = 'pellets';
  encounter.screen = 'menu';
  encounter.hitAge = encounter.hitActor = null;
  encounter.message = `Flowey used Friendlyness Pellets! Flowey recovered ${restored} HP.`;
  return true;
}

// Future projectile patterns should use this instead of subtracting their full damage directly.
export function projectileDamage(encounter, baseDamage) {
  return Math.max(0, Math.round(baseDamage * (encounter?.projectileDamageMultiplier ?? 1)));
}

// All TP gains share the same cap, including Defend and projectile grazing.
export function addTP(encounter, amount) {
  if (!encounter || !Number.isFinite(amount) || amount < 0) return;
  encounter.tp = Math.min(battleSettings.maxTP, encounter.tp + amount);
}

function gainBattleTP(encounter, amount, source) {
  const before = encounter.tp;
  addTP(encounter, amount);
  const gained = encounter.tp - before;
  if (gained > 0) {
    encounter.tpGainAge = 0;
    encounter.tpGainAmount = gained;
    encounter.tpGainSource = source;
  }
  return gained;
}

export function proceed(encounter) {
  if (['dark','tenna'].includes(encounter?.kind) || !canKrisAct(encounter) || !canUseBattleAction(encounter, 'act') || encounter.tp < battleSettings.proceedCost) return false;
  encounter.tp -= battleSettings.proceedCost;
  encounter.proceedCount++;
  encounter.phase = 'proceedDialogue';
  encounter.turn = null;
  encounter.screen = 'menu';
  encounter.animationAge = 0;
  encounter.message = `Noelle: ${proceedDialogue(encounter).text}`;
  return true;
}

export function advanceProceedDialogue(encounter) {
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

export function advanceBattleTime(encounter, dt, partyHP) {
  if (!encounter || !Number.isFinite(dt) || dt < 0) return false;
  advancePartyStatus(encounter, partyHP, dt);
  if(encounter.darkHeal){encounter.darkHeal.age+=dt;if(encounter.darkHeal.age>1)encounter.darkHeal=null;}
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
    cast.age += dt;
    let changed = false;
    if (!cast.impacted && cast.age >= pelletsImpactTime - 1e-9) {
      cast.impacted = true;
      const damage = damageEnemy(encounter, battleSettings.pelletsDamage);
      encounter.message = `Flowey used Friendlyness Pellets! ??? took ${damage} damage. Flowey recovered ${cast.restored} HP.`;
      changed = true;
    }
    if (cast.age >= pelletsDuration - 1e-9) {
      encounter.pelletsCast = null;
      if(encounter.kind==='dark'){encounter.phase='flowey';encounter.turn='Flowey';return finishPartyTurn(encounter,encounter.message);}
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
      encounter.selectedAction = encounter.kind==='dark'?'act':'attack';
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

// Both the ordinary inventory and the battle inventory use the same healing recipe.
export function useHealingItem(partyHP, inventory, itemId, target, random = Math.random) {
  const item = itemDefinitions[itemId],
    hp = partyHP[target];
  if (!item || !Number.isFinite(item.minHeal) || !Number.isFinite(item.maxHeal) ||
      !(inventory.items[itemId] > 0) || !Number.isFinite(hp) || hp >= maxHP) return null;
  const rolledHealing = item.minHeal + Math.floor(random() * (item.maxHeal - item.minHeal + 1));
  const restored = Math.min(rolledHealing, maxHP - hp);
  partyHP[target] += restored;
  inventory.items[itemId]--;
  return { restored, itemName: item.name };
}

export function useBattleItem(encounter, partyHP, inventory, itemId, target, random = Math.random) {
  if (!canUseBattleAction(encounter, 'item') || !(inventory?.items?.[itemId] > 0)) return null;
  const item = itemDefinitions[itemId], actor = encounter.turn;
  if (itemId === 'tpElixir') {
    const tpGained = gainBattleTP(encounter, encounter.kind==='dark'?5:item.tpGain, 'elixir');
    encounter.nextAttackGrazeTP = encounter.kind==='dark'?null:item.grazeTP;
    inventory.items[itemId]--;
    const message = encounter.kind==='dark'?`${actor} used ${item.name}! +${tpGained}% TP. Grazing stays at 1% TP.`:`${actor} used ${item.name}! +${tpGained}% TP. Grazing gives 4% TP during Noelle’s next attack.`;
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

export function listenInDark(encounter){if(encounter?.kind!=='dark'||!canUseBattleAction(encounter,'act'))return false;return finishPartyTurn(encounter,'You listen carefully. Something is watching from the darkness.');}

export function spareInDark(encounter){if(encounter?.kind==='tenna')return canPartyAct(encounter);if(encounter?.kind!=='dark'||!canUseBattleAction(encounter,'spare'))return false;return finishPartyTurn(encounter,`${encounter.turn} tried to spare the figure. The eyes keep watching.`);}

export function useDarkAct(encounter,partyHP,random=Math.random){
 if(encounter?.kind!=='dark'||!canUseBattleAction(encounter,'act')||darkActLocked(encounter))return false;
 const act=darkActInfo(encounter);if(encounter.tp<act.cost)return false;
 const actor=encounter.turn;
 if(actor==='Flowey')return friendlynessPellets(encounter,partyHP);
 if(actor==='Kris'){
  encounter.tp-=act.cost;encounter.shineCount=Math.min(5,(encounter.shineCount||0)+1);encounter.darkUnlocked=encounter.shineCount>=3;
  encounter.phase=encounter.shineCount>=5?'jackReveal':'shine';encounter.animationAge=0;encounter.screen='menu';encounter.message=encounter.shineCount>=5?'NOT THE LAAAIght... Oh! You guys! Didnt see ya!':'NOT THE LAIGHT!';return true;
 }
 if(actor==='Susie'){
  encounter.tp-=act.cost;const amount=170+Math.min(60,Math.floor(random()*61)),damage=damageEnemy(encounter,amount);
  const message=`Susie used Rude Buster! ??? took ${damage} damage.`;
  if(encounter.phase==='victory')encounter.message=message+` ${encounter.enemy.name} was defeated.`;else finishPartyTurn(encounter,message);return true;
 }
 const injured=battlePartyNames(encounter).filter(name=>partyHP[name]<maxHP);if(!injured.length)return false;
 const target=injured[Math.min(injured.length-1,Math.floor(random()*injured.length))];
 const amount=50+Math.min(20,Math.floor(random()*21)),restored=Math.min(amount,maxHP-partyHP[target]);
 encounter.tp-=act.cost;partyHP[target]+=restored;syncPartyStatus(encounter,partyHP);
 encounter.darkHeal={target,restored,age:0};return finishPartyTurn(encounter,`Ralsey used Heal Player! ${target} recovered ${restored} HP.`);
}
export function completeDarkShine(encounter){
 if(encounter?.kind!=='dark'||encounter.phase!=='shine')return false;
 encounter.phase='kris';encounter.turn='Kris';
 return finishPartyTurn(encounter,encounter.darkUnlocked?'All attacks and ACTs are enabled. Keep shining to light the room.':`Shine ${encounter.shineCount}/3. The darkness still blocks attacks and the other ACTs.`);
}
