import {
  requestSpecialAttack,
  toggleInvincibility,
  toggleRepeatAttack,
} from '../../../tests/fixtures/combat-tools.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { crossingHazards } from '../noelle/crossing.ts';
import { greenGoal } from '../noelle/goal.ts';
import { createOrbitAttack, orbitHazards } from '../noelle/orbit.ts';
import {
  advanceSnowAttack,
  attackEnemy,
  createEncounter,
  defend,
  isSoulInSnow,
  snowPathBounds,
  startKrisTurn,
} from './rules.ts';
import { battleArena, battleSettings, enemyAttacks } from './settings.ts';
import { attackState } from './test-state.ts';

function enemyTurn(index: number, buffed = true, defending = false) {
  const battle = createEncounter();
  startKrisTurn(battle);
  battle.strongerAttacks = buffed;
  battle.enemyAttackCount = index;
  battle.strongerAttackCount = index;
  (defending ? defend : attackEnemy)(battle);
  (defending ? defend : attackEnemy)(battle);
  return battle;
}

test('stronger attacks cycle from 1 through 5 independently of earlier rounds, and a new special resets to 1', (t) => {
  t.mock.method(Math, 'random', () => {
    throw new Error('Stronger attack order must not use random selection.');
  });
  const battle = createEncounter();
  startKrisTurn(battle);
  battle.strongerAttacks = true;
  battle.goalAttackUsed = true;
  battle.enemyAttackCount = 53;
  for (let index = 0; index < 12; index++) {
    defend(battle);
    defend(battle);
    assert.equal(attackState(battle).direction, enemyAttacks[index % enemyAttacks.length]);
    assert.equal(attackState(battle).buffed, true);
    assert.equal(battle.strongerAttackCount, index + 1);
    if (index < 11) startKrisTurn(battle);
  }
  requestSpecialAttack(battle);
  assert.equal(attackState(battle).direction, 'goal');
  startKrisTurn(battle);
  assert.equal(battle.strongerAttackCount, 0);
  defend(battle);
  defend(battle);
  assert.equal(attackState(battle).direction, 'down');
  assert.equal(attackState(battle).buffed, true);
});

test('reaching the green goal starts stronger attacks in order after the end pause', (t) => {
  t.mock.method(Math, 'random', () => 0.99);
  const battle = createEncounter(),
    hp = freshPartyHP();
  startKrisTurn(battle);
  battle.enemy.hp = 1500;
  defend(battle);
  defend(battle);
  assert.equal(attackState(battle).direction, 'goal');
  assert.equal(attackState(battle).buffed, false);
  assert.equal(battle.strongerAttacks, false);
  battle.soul = { x: greenGoal.x, y: greenGoal.y };
  advanceSnowAttack(battle, hp, 0.01, () => 0);
  assert.equal(battle.strongerAttacks, false);
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.01, () => 0);
  assert.equal(battle.strongerAttacks, true);
  assert.equal(battle.enemyAttackCount, 0);
  defend(battle);
  defend(battle);
  assert.equal(attackState(battle).direction, 'down');
  assert.equal(attackState(battle).buffed, true);
  startKrisTurn(battle);
  defend(battle);
  defend(battle);
  assert.equal(attackState(battle).direction, 'right');
  assert.equal(attackState(battle).buffed, true);
  assert.equal(createEncounter().strongerAttacks, false);
});

test('all five stronger patterns retain their order after testing repeats are switched off', (t) => {
  let roll = 0;
  t.mock.method(Math, 'random', () => roll);
  for (let index = 0; index < enemyAttacks.length; index++) {
    roll = (index + 0.1) / enemyAttacks.length;
    const battle = enemyTurn(index);
    assert.equal(attackState(battle).direction, enemyAttacks[index]);
    assert.equal(attackState(battle).buffed, true);
    toggleRepeatAttack(battle);
    toggleInvincibility(battle);
    const count = battle.enemyAttackCount;
    const strongerCount = battle.strongerAttackCount;
    startKrisTurn(battle);
    attackEnemy(battle);
    attackEnemy(battle);
    assert.equal(attackState(battle).direction, enemyAttacks[index]);
    assert.equal(attackState(battle).buffed, true);
    assert.equal(battle.enemyAttackCount, count);
    assert.equal(battle.strongerAttackCount, strongerCount);
    assert.equal(battle.invincible, true);
    toggleRepeatAttack(battle);
    startKrisTurn(battle);
    attackEnemy(battle);
    attackEnemy(battle);
    assert.equal(attackState(battle).direction, enemyAttacks[(index + 1) % enemyAttacks.length]);
    assert.equal(attackState(battle).buffed, true);
  }
});

test('falling and sideways patterns spawn five spread-out snowballs and deal 22 damage, or 11 with Defend', (t) => {
  let roll = 0;
  t.mock.method(Math, 'random', () => roll);
  for (const index of [0, 1]) {
    roll = (index + 0.1) / enemyAttacks.length;
    for (const buffed of [false, true]) {
      for (const defending of [false, true]) {
        const battle = enemyTurn(index, buffed, defending),
          hp = freshPartyHP();
        advanceSnowAttack(battle, hp, battleSettings.snowStartDelay + 0.01, () => 0.5);
        assert.equal(attackState(battle).balls.length, buffed ? 5 : 3);
        const positions = attackState(battle).balls.map((ball) => (index === 0 ? ball.x : ball.y));
        assert.equal(new Set(positions).size, buffed ? 5 : 3);
        attackState(battle).balls = [{ ...present(battle.soul), velocity: 0, hit: false }];
        advanceSnowAttack(battle, hp, 0.01, () => 0);
        const damage = buffed ? 22 : 15;
        assert.equal(hp.Kris, 100 - (defending ? Math.round(damage / 2) : damage));
        assert.equal(hp.Flowey, 100);
        assert.equal(hp.Susie, 100);
      }
    }
  }
});

test('stronger path uses a 64-pixel gap instead of 80 while retaining the same winding route', (t) => {
  t.mock.method(Math, 'random', () => 0.41);
  const original = enemyTurn(2, false),
    stronger = enemyTurn(2);
  attackState(original).pathAge = attackState(stronger).pathAge = 4.5;
  for (const row of [60, 100, 160, 220, 260]) {
    const before = snowPathBounds(original, row),
      after = snowPathBounds(stronger, row);
    assert.equal(before!.right - before!.left, 80);
    assert.equal(after!.right - after!.left, 64);
    assert.equal(before!.left + before!.right, after!.left + after!.right);
  }
});

test('stronger bottom, side, orbit-rim and path snow deal 32 or 37 immediately and each second', (t) => {
  let roll = 0;
  t.mock.method(Math, 'random', () => roll);
  for (const index of [0, 1, 2, 3]) {
    roll = (index + 0.1) / enemyAttacks.length;
    const battle = enemyTurn(index, true, true),
      hp = freshPartyHP();
    const snow = battle.snowAttack;
    snow!.nextWaveIn = 100;
    snow!.hitCooldown = 100;
    if (index === 2) {
      snow!.pathAge = 4.5;
      battle.soul = { x: 400, y: 163 };
    } else if (index === 3) {
      snow!.orbit!.box.vx = snow!.orbit!.box.vy = 0;
      battle.soul = { x: snow!.orbit!.box.x + 16, y: snow!.orbit!.box.y + 60 };
    } else battle.soul = index === 0 ? { x: 240, y: 260 } : { x: 418, y: 90 };
    assert.equal(isSoulInSnow(battle), true);
    const damage = index === 2 ? 37 : 32;
    advanceSnowAttack(battle, hp, 0.01, () => 0);
    assert.equal(hp.Kris, 100 - damage);
    advanceSnowAttack(battle, hp, index === 2 ? 1 : 0.99, () => 0);
    assert.equal(hp.Kris, 100 - damage * 2);
    assert.equal(hp.Flowey, 100);
  }
});

test('stronger orbit has 18 snowballs with 17-damage cube and balls, without changing the saved hard cube', (t) => {
  t.mock.method(Math, 'random', () => 0.61);
  assert.equal(createOrbitAttack('hard').cubeDamage, 50);
  for (const defending of [false, true]) {
    for (const hazard of ['cube', 'ball'] as const) {
      const battle = enemyTurn(3, true, defending),
        hp = freshPartyHP(),
        orbit = attackState(battle).orbit;
      assert.equal(orbit!.variant, 'buffed');
      orbit!.age = 0.8;
      orbit!.box.vx = orbit!.box.vy = 0;
      const { cube, balls } = orbitHazards(present(orbit));
      assert.equal(balls.length, 18);
      if (hazard === 'cube') battle.soul = { x: cube.x, y: cube.y };
      else {
        orbit!.box.x = 300;
        orbit!.box.y = 100;
        battle.soul = { ...balls[0] };
      }
      assert.equal(isSoulInSnow(battle), false);
      advanceSnowAttack(battle, hp, 0.01, () => 0);
      assert.equal(hp.Kris, defending ? 91 : 83);
      advanceSnowAttack(battle, hp, 0.05, () => 0);
      assert.equal(hp.Kris, defending ? 91 : 83);
    }
  }
});

test('stronger crossing has 18 moving, 4 fixed and 6 spinning balls; every kind deals 17, or 9 with Defend', (t) => {
  t.mock.method(Math, 'random', () => 0.81);
  for (const defending of [false, true]) {
    for (const hazard of ['large', 'small', 'spinning'] as const) {
      const battle = enemyTurn(4, true, defending),
        hp = freshPartyHP();
      attackState(battle).crossing!.age = 0.8;
      const hazards = crossingHazards(present(attackState(battle).crossing), battleArena);
      assert.equal(hazards.large.length, 18);
      assert.equal(hazards.small.length, 4);
      assert.equal(hazards.spinning.length, 6);
      battle.soul = { ...hazards[hazard][hazard === 'large' ? 2 : 0] };
      hp.Kris = 0;
      advanceSnowAttack(battle, hp, 0.01, () => 0);
      assert.equal(hp.Flowey, defending ? 91 : 83);
      assert.equal(hp.Kris, 0);
      toggleInvincibility(battle);
      battle.soul = {
        ...crossingHazards(present(attackState(battle).crossing), battleArena)[hazard][
          hazard === 'large' ? 2 : 0
        ],
      };
      advanceSnowAttack(battle, hp, 0.01, () => 0);
      assert.equal(hp.Flowey, defending ? 91 : 83);
    }
  }
});
