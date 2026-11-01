import assert from 'node:assert/strict';
import test from 'node:test';
import { freshInventory, freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { useHealingItem } from '../../inventory/healing.ts';
import type { Point } from '../../world/types.ts';
import { pelletsDuration } from '../noelle/pellets.ts';
import { proceedDialogue, proceedGlitchSeconds, proceedResponses } from '../noelle/proceed.ts';
import { canControlSoul, canFloweyAct, canKrisAct, canPartyAct } from './availability.ts';
import { addTP, projectileDamage } from './resources.ts';
import {
  advanceBattleTime,
  advanceProceedDialogue,
  advanceSnowAttack,
  attackEnemy,
  createEncounter,
  defend,
  friendlynessPellets,
  isSoulInSnow,
  moveSoul,
  proceed,
  skipFallenTurns,
  snowAttackStatus,
  snowFillPercent,
  snowPathBounds,
  startKrisTurn,
} from './rules.ts';
import { battleActions, battleArena, battleSettings } from './settings.ts';
import { attackState } from './test-state.ts';
import type { Encounter } from './types.ts';

const krisTurn = () => {
  const battle = createEncounter();
  startKrisTurn(battle);
  return battle;
};

test('Kris acts first and an attack deals 75 HP exactly once', () => {
  const battle = krisTurn();
  assert.equal(battle.turn, 'Kris');
  assert.equal(battle.enemy.name, '???');
  assert.equal(battle.enemy.hp, 3000);
  assert.equal(attackEnemy(battle), true);
  assert.equal(battle.enemy.hp, 2925);
  assert.equal(battle.turn, 'Flowey');
  assert.equal(canKrisAct(battle), false);
  assert.equal(startKrisTurn(battle), false);
  assert.equal(battle.enemy.hp, 2925);
  assert.ok(!battleActions.includes('spare'));
});

test('Flowey attacks for 80 HP and hands over to the enemy exactly once', () => {
  const battle = krisTurn();
  attackEnemy(battle);
  assert.equal(canFloweyAct(battle), true);
  assert.equal(attackEnemy(battle), true);
  assert.equal(battle.enemy.hp, 2845);
  assert.equal(battle.hitActor, 'Flowey');
  assert.equal(battle.hitDamage, 80);
  assert.equal(battle.phase, 'enemy');
  assert.equal(battle.turn, '???');
  assert.equal(canPartyAct(battle), false);
  assert.equal(attackEnemy(battle), false);
  assert.equal(defend(battle), false);
  assert.equal(battle.enemy.hp, 2845);
  assert.equal(startKrisTurn(battle), true);
  assert.equal(canKrisAct(battle), true);
});

test('both characters can Defend and the effect lasts until the next round', () => {
  const battle = krisTurn();
  assert.equal(defend(battle), true);
  assert.equal(battle.turn, 'Flowey');
  assert.equal(projectileDamage(battle, 10), 5);
  assert.equal(defend(battle), true);
  assert.equal(battle.turn, '???');
  assert.match(battle.message, /Flowey defended/);
  assert.equal(projectileDamage(battle, 10), 5);
  startKrisTurn(battle);
  assert.equal(projectileDamage(battle, 10), 10);
});

test('an attack triggers a half-second hit reaction without extra damage from the animation', () => {
  const battle = krisTurn();
  assert.equal(battle.hitAge, null);
  attackEnemy(battle);
  assert.equal(battle.hitAge, 0);
  advanceBattleTime(battle, 0.25);
  assert.equal(battle.hitAge, 0.25);
  assert.equal(proceed(battle), false);
  assert.equal(battle.hitAge, 0.25);
  advanceBattleTime(battle, 0.249);
  assert.notEqual(battle.hitAge, null);
  advanceBattleTime(battle, 0.001);
  assert.equal(battle.hitAge, null);
  advanceBattleTime(battle, 1);
  assert.equal(battle.hitAge, null);
  assert.equal(battle.enemy.hp, 2925);
});

test('Proceed needs and spends 100 TP on each of three separate Kris turns', () => {
  const battle = krisTurn();
  addTP(battle, 99);
  assert.equal(proceed(battle), false);
  assert.equal(battle.tp, 99);
  assert.equal(battle.proceedCount, 0);
  for (let count = 1; count <= 3; count++) {
    addTP(battle, 150);
    assert.equal(battle.tp, 100);
    assert.equal(proceed(battle), true);
    assert.equal(battle.tp, 0);
    assert.equal(battle.proceedCount, count);
    assert.equal(proceed(battle), false);
    assert.deepEqual(proceedDialogue(battle), { speaker: 'Noelle', text: proceedResponses[count - 1] });
    advanceBattleTime(battle, 10);
    assert.equal(battle.phase, 'proceedDialogue', 'Noelle waits for confirmation');
    assert.equal(advanceProceedDialogue(battle), true);
    if (count < 3) {
      assert.equal(battle.phase, 'enemy');
      assert.equal(attackState(battle).direction, count === 1 ? 'down' : 'right');
      assert.equal(battle.enemy.visible, true);
      startKrisTurn(battle);
      assert.equal(proceed(battle), false);
    } else {
      assert.equal(battle.phase, 'proceedGlitch');
      advanceBattleTime(battle, proceedGlitchSeconds);
      assert.equal(battle.phase, 'kris');
      assert.equal(battle.enemy.hp, 1);
      assert.equal(battle.enemy.visible, true);
      assert.equal(battle.finalAttackComplete, true);
      assert.equal(startKrisTurn(battle), false);
    }
  }
  assert.equal(createEncounter(true).enemy.visible, false);
});

test('Friendlyness Pellets requires Flowey’s turn and 90 TP without consuming a failed action', () => {
  const battle = krisTurn(),
    hp = freshPartyHP();
  hp.Flowey = 20;
  addTP(battle, 100);
  const beforeKris = structuredClone(battle);
  assert.equal(friendlynessPellets(battle, hp), false);
  assert.deepEqual(battle, beforeKris);
  defend(battle);
  battle.tp = 89;
  const beforeFlowey = structuredClone(battle);
  assert.equal(friendlynessPellets(battle, hp), false);
  assert.deepEqual(battle, beforeFlowey);
  assert.equal(hp.Flowey, 20);
});

test('Friendlyness Pellets spends 90 TP, heals Flowey 35, then deals 150 damage and ends his turn', () => {
  const battle = krisTurn(),
    hp = freshPartyHP();
  hp.Flowey = 20;
  defend(battle);
  addTP(battle, 90);
  assert.equal(friendlynessPellets(battle, hp), true);
  assert.equal(battle.phase, 'pellets');
  assert.equal(battle.enemy.hp, 3000);
  assert.equal(hp.Flowey, 55);
  advanceBattleTime(battle, pelletsDuration);
  assert.equal(battle.enemy.hp, 2850);
  assert.equal(battle.hitDamage, 150);
  assert.equal(battle.hitActor, 'Flowey');
  assert.equal(battle.hitAge, 0);
  assert.equal(battle.tp, 10); // Kris's Defend gained 10 before another 90 was added.
  assert.equal(hp.Flowey, 55);
  assert.equal(hp.Kris, 100);
  assert.equal(battle.phase, 'enemy');
  const after = structuredClone(battle);
  assert.equal(friendlynessPellets(battle, hp), false);
  assert.deepEqual(battle, after);
  assert.equal(hp.Flowey, 55);
});

test('Friendlyness Pellets caps healing and damage and works at full HP', () => {
  for (const health of [90, 100]) {
    const battle = krisTurn(),
      hp = freshPartyHP();
    hp.Flowey = health;
    battle.enemy.hp = 40;
    defend(battle);
    addTP(battle, 100);
    assert.equal(friendlynessPellets(battle, hp), true);
    advanceBattleTime(battle, pelletsDuration);
    assert.equal(battle.tp, 10);
    assert.equal(battle.enemy.hp, 1);
    assert.equal(battle.hitDamage, 39);
    assert.equal(attackState(battle).direction, 'snowgrave');
    assert.equal(hp.Flowey, 100);
  }
});

test('healing uses real carried items, rolls 35–45, caps HP, and allows reviving', () => {
  const hp = freshPartyHP(),
    bag = freshInventory();
  hp.Kris = 10;
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris'), null);
  bag.items.gCandy = 3;
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris', () => 0)!.restored, 35);
  assert.equal(hp.Kris, 45);
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris', () => 0.999)!.restored, 45);
  assert.equal(hp.Kris, 90);
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris', () => 0.999)!.restored, 10);
  assert.equal(hp.Kris, 100);
  bag.items.gCandy = 1;
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris'), null);
  assert.equal(bag.items.gCandy, 1);
  hp.Flowey = 0;
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Flowey', () => 0)!.restored, 35);
  assert.equal(bag.items.gCandy, 0);
});

const enemyTurn = () => {
  const battle = krisTurn();
  defend(battle);
  defend(battle);
  return battle;
};

test('the soul appears centered after Flowey acts and resets for each enemy turn', () => {
  const battle = krisTurn();
  assert.equal(canControlSoul(battle), false);
  assert.equal(battle.soul, null);
  defend(battle);
  assert.equal(canControlSoul(battle), false);
  defend(battle);
  assert.equal(canControlSoul(battle), true);
  const center = {
    x: battleArena.x + battleArena.size / 2,
    y: battleArena.y + battleArena.size / 2,
  };
  assert.deepEqual(battle.soul, center);
  moveSoul(battle, new Set(['left']), 0.25);
  startKrisTurn(battle);
  assert.equal(battle.soul, null);
  assert.equal(canControlSoul(battle), false);
  moveSoul(battle, new Set(['right']), 1);
  assert.equal(battle.soul, null);
  defend(battle);
  defend(battle);
  assert.deepEqual(battle.soul, center);
});

test('soul movement uses elapsed time and keeps diagonal speed equal to straight speed', () => {
  const straight = enemyTurn(),
    diagonal = enemyTurn(),
    stepped = enemyTurn();
  const origin = { ...present(straight.soul) };
  moveSoul(straight, new Set(['right']), 0.25);
  moveSoul(diagonal, new Set(['right', 'up']), 0.25);
  for (let i = 0; i < 25; i++) moveSoul(stepped, new Set(['right']), 0.01);
  const distance = (soul: Point) => Math.hypot(soul.x - origin.x!, soul.y - origin.y!);
  assert.ok(Math.abs(distance(present(straight.soul)) - battleSettings.soulSpeed * 0.25) < 1e-9);
  assert.ok(Math.abs(distance(present(diagonal.soul)) - distance(present(straight.soul))) < 1e-9);
  assert.ok(Math.abs(stepped.soul!.x - straight.soul!.x) < 1e-9);
  assert.ok(diagonal.soul!.y < origin.y!);
});

test('the entire soul stays inside all four arena borders, including at corners', () => {
  const battle = enemyTurn();
  const { x, y, size, border } = battleArena;
  for (const [horizontal, vertical] of [
    ['left', 'up'],
    ['right', 'up'],
    ['right', 'down'],
    ['left', 'down'],
  ]) {
    moveSoul(battle, new Set([horizontal, vertical]), 10);
    assert.equal(
      battle.soul!.x,
      horizontal === 'left'
        ? x + border + battleSettings.soulWidth / 2
        : x + size - border - battleSettings.soulWidth / 2,
    );
    assert.equal(
      battle.soul!.y,
      vertical === 'up'
        ? y + border + battleSettings.soulHeight / 2
        : y + size - border - battleSettings.soulHeight / 2,
    );
  }
});

test('released or opposing directions and invalid time steps leave the soul still', () => {
  const battle = enemyTurn(),
    before = { ...present(battle.soul) };
  moveSoul(battle, new Set(), 1);
  moveSoul(battle, new Set(['left', 'right', 'up', 'down']), 1);
  for (const dt of [-1, 0, NaN, Infinity]) moveSoul(battle, new Set(['down']), dt);
  assert.deepEqual(battle.soul, before);
});

const snowTurn = () => {
  const battle = enemyTurn();
  battle.projectileDamageMultiplier = 1;
  return battle;
};

const touchingSnowball = (battle: Encounter) => ({
  x: present(battle.soul).x,
  y: present(battle.soul).y,
  velocity: 0,
  hit: false,
});

test('snowballs spawn in waves of exactly three with room between lanes', () => {
  const battle = snowTurn(),
    hp = freshPartyHP();
  advanceSnowAttack(battle, hp, battleSettings.snowStartDelay + 0.02, () => 0.5);
  assert.equal(attackState(battle).balls.length, 3);
  assert.equal(attackState(battle).waves, 1);
  const balls = attackState(battle).balls;
  assert.ok(balls[0].x < balls[1].x && balls[1].x < balls[2].x);
  assert.ok(balls.every((ball) => ball.y < battleArena.y));
  advanceSnowAttack(battle, hp, 0.2, () => 0.5);
  assert.equal(attackState(battle).balls.length, 3);
  assert.equal(attackState(battle).waves, 1);
});

test('landed snowballs add passable snow without pushing a stationary soul out', () => {
  const battle = snowTurn(),
    hp = freshPartyHP();
  const bottom = battleArena.y + battleArena.size - battleArena.border;
  battle.soul!.y = bottom - battleSettings.soulHeight / 2;
  attackState(battle).balls = [240, 320, 400].map((x) => ({
    x,
    y: bottom - battleSettings.snowballRadius - 1,
    velocity: 100,
    hit: false,
  }));
  advanceSnowAttack(battle, hp, 0.03, () => 0.5);
  assert.equal(attackState(battle).balls.length, 0);
  assert.ok(Math.abs(attackState(battle).height - 3 * battleSettings.snowballPileHeight) < 1e-9);
  assert.equal(battle.soul!.y + battleSettings.soulHeight / 2, bottom);
  assert.equal(isSoulInSnow(battle), true);
  const before = battle.soul!.y;
  moveSoul(battle, new Set(['up']), 0.1);
  assert.ok(Math.abs(before - battle.soul!.y - 7.5) < 1e-9);
});

test('six waves fill exactly half the box, stop spawning, then return to Kris with a fresh arena next round', () => {
  const battle = snowTurn(),
    hp = freshPartyHP();
  battle.soul = {
    x: battleArena.x + battleArena.border + battleSettings.snowBorderDepth + battleSettings.soulWidth / 2 + 2,
    y:
      battleArena.y + battleArena.border + battleSettings.snowBorderDepth + battleSettings.soulHeight / 2 + 2,
  };
  for (let frame = 0; frame < 1800 && attackState(battle).endingAge === null; frame++) {
    advanceSnowAttack(battle, hp, 1 / 60, () => 0.5);
    assert.ok(attackState(battle).balls.length <= 3);
  }
  assert.equal(attackState(battle).waves, 6);
  assert.equal(snowFillPercent(battle), 50);
  assert.equal(attackState(battle).height, (battleArena.size - 2 * battleArena.border) / 2);
  assert.deepEqual(attackState(battle).balls, []);
  assert.equal(battle.phase, 'enemy');
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause / 2, () => 0.5);
  assert.equal(battle.phase, 'enemy');
  assert.equal(attackState(battle).balls.length, 0);
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause, () => 0.5);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.snowAttack, null);
  assert.equal(battle.soul, null);
  attackEnemy(battle);
  attackEnemy(battle);
  assert.equal(attackState(battle).height, 0);
  assert.equal(attackState(battle).waves, 0);
});

test('one snowball hit deals 15 damage to one living teammate and ignores fallen teammates', () => {
  for (const target of ['Kris', 'Flowey'] as const) {
    const battle = snowTurn(),
      hp = freshPartyHP();
    const fallen = target === 'Kris' ? 'Flowey' : 'Kris';
    hp[fallen] = 0;
    attackState(battle).balls = [touchingSnowball(battle)];
    advanceSnowAttack(battle, hp, 1 / 60, () => 0);
    assert.equal(hp[target], 85);
    assert.equal(hp[fallen], 0);
    assert.equal(hp.Susie, 100);
    assert.equal(hp.Ralsey, 100);
    advanceSnowAttack(battle, hp, 0.05, () => 0);
    assert.equal(hp[target], 85);
  }
});

test('snowball targets can be either Kris or Flowey when both are alive', () => {
  for (const [random, target] of [[0, 'Kris'] as const, [0.99, 'Flowey'] as const]) {
    const battle = snowTurn(),
      hp = freshPartyHP();
    attackState(battle).balls = [touchingSnowball(battle)];
    advanceSnowAttack(battle, hp, 1 / 60, () => random);
    assert.equal(hp[target], 85);
    assert.equal(hp.Kris + hp.Flowey, 185);
  }
});

test('overlapping snowballs respect invulnerability and Defend reduces the hit', () => {
  const battle = enemyTurn(),
    hp = freshPartyHP();
  attackState(battle).balls = Array.from({ length: 3 }, () => touchingSnowball(battle));
  advanceSnowAttack(battle, hp, 1 / 60, () => 0);
  assert.equal(hp.Kris, 92);
  assert.equal(hp.Flowey, 100);
  attackState(battle).hitCooldown = 0;
  advanceSnowAttack(battle, hp, 1 / 60, () => 0.99);
  assert.equal(hp.Kris, 92);
  assert.equal(hp.Flowey, 92);
});

test('a fast snowball cannot tunnel through the soul and damage never falls below zero HP', () => {
  const battle = snowTurn(),
    hp = freshPartyHP();
  hp.Kris = 0;
  hp.Flowey = 5;
  attackState(battle).balls = [{ ...touchingSnowball(battle), y: battle.soul!.y - 80, velocity: 2000 }];
  advanceSnowAttack(battle, hp, 0.1, () => 0);
  assert.equal(hp.Kris, 0);
  assert.equal(hp.Flowey, 0);
  assert.match(battle.message, /Flowey is down/);
});

test('fallen teammates skip actions while a surviving teammate can still revive them with items', () => {
  const battle = krisTurn(),
    hp = freshPartyHP(),
    bag = freshInventory();
  hp.Kris = 0;
  assert.equal(skipFallenTurns(battle, hp), true);
  assert.equal(battle.turn, 'Flowey');
  bag.items.gCandy = 1;
  assert.ok(useHealingItem(hp, bag, 'gCandy', 'Kris', () => 0));
  assert.equal(hp.Kris, 35);
  hp.Flowey = 0;
  assert.equal(skipFallenTurns(battle, hp), true);
  assert.equal(battle.phase, 'enemy');
  startKrisTurn(battle);
  assert.equal(skipFallenTurns(battle, hp), false);
  assert.equal(battle.turn, 'Kris');
});

const sidewaysSnowTurn = () => {
  const battle = snowTurn();
  startKrisTurn(battle);
  attackEnemy(battle);
  attackEnemy(battle);
  return battle;
};

test('Noelle opens with all five attacks in order and restarts the order in a new encounter', () => {
  const battle = snowTurn();
  assert.equal(attackState(battle).direction, 'down');
  assert.equal(battle.enemyAttackCount, 1);
  for (const direction of ['right', 'path', 'orbit', 'crossing'] as const) {
    startKrisTurn(battle);
    attackEnemy(battle);
    attackEnemy(battle);
    assert.equal(attackState(battle).direction, direction);
    assert.equal(attackState(battle).height, 0);
    assert.equal(attackState(battle).waves, 0);
  }
  assert.equal(snowTurn().snowAttack!.direction, 'down');
});

test('sideways waves spawn three snowballs on the left and move only to the right', () => {
  const battle = sidewaysSnowTurn(),
    hp = freshPartyHP();
  advanceSnowAttack(battle, hp, battleSettings.snowStartDelay + 0.02, () => 0.5);
  const before = structuredClone(attackState(battle).balls);
  assert.equal(before.length, 3);
  assert.ok(before.every((ball) => ball.x < battleArena.x));
  assert.ok(before[0].y < before[1].y && before[1].y < before[2].y);
  advanceSnowAttack(battle, hp, 0.2, () => 0.5);
  attackState(battle).balls.forEach((ball, index) => {
    assert.ok(ball.x > before[index].x);
    assert.equal(ball.y, before[index].y);
  });
  assert.equal(attackState(battle).waves, 1);
});

test('snow on the right wall allows entry while preserving the outer arena boundaries', () => {
  const battle = sidewaysSnowTurn(),
    hp = freshPartyHP();
  const right = battleArena.x + battleArena.size - battleArena.border,
    bottom = battleArena.y + battleArena.size - battleArena.border;
  battle.soul = { x: right - battleSettings.soulWidth / 2, y: bottom - battleSettings.soulHeight / 2 };
  attackState(battle).balls = [90, 163, 230].map((y) => ({
    x: right - battleSettings.snowballRadius - 1,
    y,
    velocity: 100,
    hit: false,
  }));
  advanceSnowAttack(battle, hp, 0.03, () => 0.5);
  assert.equal(attackState(battle).balls.length, 0);
  assert.ok(Math.abs(attackState(battle).height - 3 * battleSettings.snowballPileHeight) < 1e-9);
  assert.equal(battle.soul.x + battleSettings.soulWidth / 2, right);
  assert.equal(isSoulInSnow(battle), true);
  assert.equal(battle.soul.y + battleSettings.soulHeight / 2, bottom);
  const atWall = { ...battle.soul };
  moveSoul(battle, new Set(['right', 'down']), 1);
  assert.deepEqual(battle.soul, atWall);
});

test('sideways snow fills half the box after six waves, then returns to the party', () => {
  const battle = sidewaysSnowTurn(),
    hp = freshPartyHP();
  battle.soul!.y = 130;
  for (let frame = 0; frame < 1800 && attackState(battle).endingAge === null; frame++) {
    advanceSnowAttack(battle, hp, 1 / 60, () => 0.5);
    assert.ok(attackState(battle).balls.length <= 3);
  }
  assert.equal(attackState(battle).waves, 6);
  assert.equal(snowFillPercent(battle), 50);
  assert.deepEqual(hp, freshPartyHP());
  assert.deepEqual(attackState(battle).balls, []);
  assert.equal(battle.soul!.x, battleArena.x + battleArena.size / 2);
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.1, () => 0.5);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.snowAttack, null);
});

test('fast sideways snowballs deal the same 15 damage and ignore fallen teammates', () => {
  const battle = sidewaysSnowTurn(),
    hp = freshPartyHP();
  hp.Flowey = 0;
  attackState(battle).balls = [{ ...touchingSnowball(battle), x: battle.soul!.x - 80, velocity: 2000 }];
  advanceSnowAttack(battle, hp, 0.1, () => 0.99);
  assert.equal(hp.Kris, 85);
  assert.equal(hp.Flowey, 0);
});

const snowContactTurn = (direction: string) => {
  const battle = direction === 'right' ? sidewaysSnowTurn() : snowTurn();
  attackState(battle).height = 60;
  attackState(battle).nextWaveIn = 100;
  battle.soul = direction === 'right' ? { x: 400, y: 90 } : { x: 240, y: 245 };
  return battle;
};

test('both snow banks slow movement by half and restore normal speed after leaving', () => {
  for (const direction of ['down', 'right'] as const) {
    const battle = snowContactTurn(direction);
    assert.equal(isSoulInSnow(battle), true);
    const before = { ...present(battle.soul) };
    moveSoul(battle, new Set(['up']), 0.1);
    assert.ok(Math.abs(before.y! - battle.soul!.y - 7.5) < 1e-9);
    battle.soul = { x: 240, y: 90 };
    assert.equal(isSoulInSnow(battle), false);
    moveSoul(battle, new Set(['down']), 0.1);
    assert.equal(battle.soul.y, 105);
    attackState(battle).height = 0;
    assert.equal(isSoulInSnow(battle), false);
  }
});

test('snow hits immediately for 25, then every second, independently of projectile immunity', () => {
  for (const direction of ['down', 'right'] as const) {
    const battle = snowContactTurn(direction),
      hp = freshPartyHP();
    attackState(battle).hitCooldown = 100;
    battle.projectileDamageMultiplier = 0.5;
    advanceSnowAttack(battle, hp, 0.01, () => 0);
    assert.equal(hp.Kris, 75);
    advanceSnowAttack(battle, hp, 0.989, () => 0);
    assert.equal(hp.Kris, 75);
    advanceSnowAttack(battle, hp, 0.001, () => 0);
    assert.equal(hp.Kris, 50);
    assert.equal(hp.Flowey, 100);
    advanceSnowAttack(battle, hp, 1, () => 0.99);
    assert.equal(hp.Kris, 50);
    assert.equal(hp.Flowey, 75);
    assert.match(battle.message, /25 damage from the snow/);
  }
});

test('leaving snow resets exposure and re-entry hits immediately before starting the next second', () => {
  const battle = snowContactTurn('down'),
    hp = freshPartyHP();
  advanceSnowAttack(battle, hp, 0.75, () => 0);
  battle.soul!.y = 90;
  advanceSnowAttack(battle, hp, 0.5, () => 0);
  assert.equal(attackState(battle).contactAge, 0);
  assert.equal(attackState(battle).inSnow, false);
  assert.equal(hp.Kris, 75);
  battle.soul!.y = 245;
  advanceSnowAttack(battle, hp, 0.01, () => 0);
  assert.equal(hp.Kris, 50);
  advanceSnowAttack(battle, hp, 0.74, () => 0);
  assert.equal(hp.Kris, 50);
  advanceSnowAttack(battle, hp, 0.25, () => 0);
  assert.equal(hp.Kris, 25);
});

test('snow ticks ignore fallen teammates, cap damage at remaining HP, and can defeat the whole team', () => {
  for (const target of ['Kris', 'Flowey'] as const) {
    const battle = snowContactTurn('right'),
      hp = freshPartyHP();
    hp[target === 'Kris' ? 'Flowey' : 'Kris'] = 0;
    hp[target] = 20;
    advanceSnowAttack(battle, hp, 1, () => 0.99);
    assert.equal(hp.Kris, 0);
    assert.equal(hp.Flowey, 0);
    assert.equal(hp.Susie, 100);
    assert.equal(hp.Ralsey, 100);
    assert.match(battle.message, new RegExp(`${target} is down`));
  }
});

test('snow contact damage stops when the attack ends and the next attack resets exposure', () => {
  const battle = snowContactTurn('down'),
    hp = freshPartyHP();
  attackState(battle).height = (battleArena.size - battleArena.border * 2) / 2;
  attackState(battle).contactAge = 0.99;
  attackState(battle).endingAge = 0;
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.1, () => 0);
  assert.equal(hp.Kris, 100);
  assert.equal(battle.phase, 'kris');
  attackEnemy(battle);
  attackEnemy(battle);
  assert.equal(attackState(battle).contactAge, 0);
  assert.equal(attackState(battle).inSnow, false);
  assert.equal(attackState(battle).height, 0);
});

const pathSnowTurn = () => {
  const battle = sidewaysSnowTurn();
  startKrisTurn(battle);
  attackEnemy(battle);
  attackEnemy(battle);
  return battle;
};

test('path snow descends from above and replaces the half-fill goal with a countdown', () => {
  const battle = pathSnowTurn(),
    hp = freshPartyHP();
  assert.equal(attackState(battle).direction, 'path');
  assert.equal(snowPathBounds(battle, 60), null);
  assert.equal(isSoulInSnow(battle), false);
  advanceSnowAttack(battle, hp, battleSettings.snowStartDelay + 0.3, () => 0.5);
  assert.ok(snowPathBounds(battle, 60));
  assert.equal(snowPathBounds(battle, 100), null);
  assert.deepEqual(attackState(battle).balls, []);
  assert.equal(attackState(battle).height, 0);
  assert.match(snowAttackStatus(battle), /^Path: \d+s left$/);
});

test('no fixed column stays safe anywhere along the path, including the middle and bottom', () => {
  for (const y of [63, 163, 263]) {
    const battle = pathSnowTurn();
    let latestLeft = -Infinity,
      earliestRight = Infinity;
    for (let age = 0; age < battleSettings.snowPathDuration; age += 0.05) {
      attackState(battle).pathAge = age;
      const bounds = snowPathBounds(battle, y);
      if (!bounds) continue;
      latestLeft = Math.max(latestLeft, bounds.left);
      earliestRight = Math.min(earliestRight, bounds.right);
    }
    assert.ok(latestLeft > earliestRight, `There must be no permanent safe column at y=${y}`);
  }
});

test('camping in the center takes damage even though brief clear gaps reset exposure', () => {
  for (const y of [63, 163, 263]) {
    const battle = pathSnowTurn(),
      hp = freshPartyHP();
    battle.soul!.y = y;
    for (let frame = 0; frame < 900 && battle.snowAttack?.endingAge === null; frame++) {
      advanceSnowAttack(battle, hp, 1 / 60, () => 0.5);
      if (hp.Kris <= 0 && hp.Flowey <= 0) break;
    }
    assert.ok(hp.Kris + hp.Flowey < 200, `Center camping should take damage at y=${y}`);
  }
});

test('the winding path can be followed at normal movement speed without taking any damage', () => {
  const battle = pathSnowTurn(),
    hp = freshPartyHP();
  let leftmost = battle.soul!.x,
    rightmost = battle.soul!.x;
  for (let frame = 0; frame < 2000 && attackState(battle).endingAge === null; frame++) {
    const bounds = snowPathBounds(battle, battle.soul!.y),
      target = bounds ? (bounds.left + bounds.right) / 2 : battle.soul!.x,
      dx = target - battle.soul!.x;
    moveSoul(battle, new Set(Math.abs(dx) > 1 ? [dx > 0 ? 'right' : 'left'] : []), 1 / 120);
    advanceSnowAttack(battle, hp, 1 / 120, () => 0.5);
    assert.equal(isSoulInSnow(battle), false);
    leftmost = Math.min(leftmost, battle.soul!.x);
    rightmost = Math.max(rightmost, battle.soul!.x);
  }
  assert.ok(leftmost < 280 && rightmost > 360);
  assert.deepEqual(hp, freshPartyHP());
  assert.notEqual(attackState(battle).endingAge, null);
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.1, () => 0.5);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.snowAttack, null);
  attackEnemy(battle);
  attackEnemy(battle);
  assert.equal(attackState(battle).direction, 'orbit');
});

test('path snow slows to quarter speed, hits immediately for 30, and repeats each second on living teammates', () => {
  for (const target of ['Kris', 'Flowey'] as const) {
    const battle = pathSnowTurn(),
      hp = freshPartyHP();
    attackState(battle).pathAge = 4.5;
    battle.soul = { x: 400, y: 163 };
    hp[target === 'Kris' ? 'Flowey' : 'Kris'] = 0;
    assert.equal(isSoulInSnow(battle), true);
    moveSoul(battle, new Set(['up']), 0.1);
    assert.equal(battle.soul.y, 159.25);
    advanceSnowAttack(battle, hp, 0.01, () => 0.99);
    assert.equal(hp[target], 70);
    advanceSnowAttack(battle, hp, 0.999, () => 0.99);
    assert.equal(hp[target], 70);
    advanceSnowAttack(battle, hp, 0.001, () => 0.99);
    assert.equal(hp[target], 40);
    assert.match(battle.message, /30 damage from the snow/);
    hp[target] = 20;
    advanceSnowAttack(battle, hp, 1, () => 0.99);
    assert.equal(hp.Kris, 0);
    assert.equal(hp.Flowey, 0);
  }
});

test('the first two attacks have hazardous snow on every edge and a clear center from the start', () => {
  const { x, y, size, border } = battleArena,
    halfWidth = battleSettings.soulWidth / 2,
    halfHeight = battleSettings.soulHeight / 2;
  for (const battle of [snowTurn(), sidewaysSnowTurn()]) {
    assert.equal(attackState(battle).height, 0);
    for (const sx of [x + border + halfWidth, x + size / 2, x + size - border - halfWidth]) {
      for (const sy of [y + border + halfHeight, y + size / 2, y + size - border - halfHeight]) {
        battle.soul = { x: sx, y: sy };
        assert.equal(isSoulInSnow(battle), sx !== x + size / 2 || sy !== y + size / 2);
      }
    }
  }
});

test('camping in any corner takes immediate rim damage and another hit each second', () => {
  const { x, y, size, border } = battleArena;
  for (const direction of ['down', 'right'] as const) {
    for (const sx of [x + border + 12, x + size - border - 12]) {
      for (const sy of [y + border + 10.5, y + size - border - 10.5]) {
        const battle = direction === 'right' ? sidewaysSnowTurn() : snowTurn(),
          hp = freshPartyHP();
        battle.soul = { x: sx, y: sy };
        attackState(battle).nextWaveIn = 100;
        advanceSnowAttack(battle, hp, 0.01, () => 0);
        assert.equal(hp.Kris, 75);
        advanceSnowAttack(battle, hp, 0.99, () => 0);
        assert.equal(hp.Kris, 50);
        assert.equal(attackState(battle).height, 0);
      }
    }
  }
});

test('rim thickness stays fixed as the main snow grows, and the path attack has no rim', () => {
  const { x, y, border } = battleArena,
    rim = battleSettings.snowBorderDepth;
  for (const battle of [snowTurn(), sidewaysSnowTurn()]) {
    for (const height of [0, 60, 90]) {
      attackState(battle).height = height;
      battle.soul = { x: x + border + rim + 11, y: y + border + rim + 11 };
      assert.equal(isSoulInSnow(battle), true);
      battle.soul.x += 2;
      assert.equal(isSoulInSnow(battle), false);
    }
  }
  const path = pathSnowTurn();
  path.soul = { x: x + border + 12, y: y + border + 10.5 };
  assert.equal(isSoulInSnow(path), false);
});
