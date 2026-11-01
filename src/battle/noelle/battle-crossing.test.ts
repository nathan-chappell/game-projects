import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import {
  advanceSnowAttack,
  attackEnemy,
  createEncounter,
  defend,
  isSoulInSnow,
  moveSoul,
  snowAttackStatus,
  soulArena,
  startKrisTurn,
} from '../shared/rules.ts';
import { battleArena, battleSettings } from '../shared/settings.ts';
import { attackState } from '../shared/test-state.ts';
import { createCrossingAttack, crossingHazards, crossingSettings } from './crossing.ts';

const crossingTurn = (defending = false) => {
  const battle = createEncounter();
  startKrisTurn(battle);
  battle.enemyAttackCount = 4;
  (defending ? defend : attackEnemy)(battle);
  (defending ? defend : attackEnemy)(battle);
  return battle;
};

test('the fifth attack uses the fixed box, has no snow rim, and gives the player time to prepare', () => {
  const battle = crossingTurn(),
    hp = freshPartyHP();
  assert.equal(attackState(battle).direction, 'crossing');
  assert.equal(soulArena(battle), battleArena);
  assert.equal(isSoulInSnow(battle), false);
  advanceSnowAttack(battle, hp, crossingSettings.warmup - 0.01, () => 0);
  assert.deepEqual(hp, freshPartyHP());
  assert.match(snowAttackStatus(battle), /^Snowballs: \d+s left$/);
});

test('large snowballs move from both sides while all four small corner balls remain fixed', () => {
  const crossing = createCrossingAttack(),
    before = crossingHazards(crossing, battleArena);
  crossing.age = crossingSettings.warmup + 1;
  const after = crossingHazards(crossing, battleArena);
  assert.equal(before.large.length, 12);
  assert.equal(before.small.length, 4);
  assert.deepEqual(after.small, before.small);
  after.large.forEach((ball, index) => assert.notDeepEqual(ball, before.large[index]));
  assert.ok(after.large[1].x > before.large[1].x);
  assert.ok(after.large[5].x < before.large[5].x);
  assert.ok(after.large[9].x > before.large[9].x);
});

test('crossing snowballs wrap around beyond the screen, keeping a continuous stream', () => {
  const crossing = createCrossingAttack();
  for (const age of [0, 2, 5, 10, 14]) {
    crossing.age = age;
    const { large } = crossingHazards(crossing, battleArena);
    assert.equal(large.length, 12);
    assert.ok(
      large.every(
        (ball) => ball.x >= -crossingSettings.largeRadius && ball.x < 640 + crossingSettings.largeRadius,
      ),
    );
    assert.ok(
      large.every(
        (ball) => ball.y - crossingSettings.largeRadius >= 24 && ball.y + crossingSettings.largeRadius <= 290,
      ),
    );
  }
});

test('crossing, fixed, and spinning snowballs deal 10, Defend halves the hit, and overlap respects immunity', () => {
  for (const defending of [false, true]) {
    for (const size of ['large', 'small', 'spinning'] as const) {
      const battle = crossingTurn(defending),
        hp = freshPartyHP();
      attackState(battle).crossing!.age = crossingSettings.warmup;
      const hazards = crossingHazards(present(attackState(battle).crossing), battleArena);
      battle.soul = { ...hazards[size][size === 'large' ? 2 : 0] };
      assert.equal(isSoulInSnow(battle), false);
      advanceSnowAttack(battle, hp, 0.01, () => 0);
      assert.equal(hp.Kris, defending ? 95 : 90);
      assert.equal(hp.Flowey, 100);
      advanceSnowAttack(battle, hp, 0.05, () => 0);
      assert.equal(hp.Kris, defending ? 95 : 90);
    }
  }
});

test('four extra snowballs spin around the center while staying completely inside the box', () => {
  const crossing = createCrossingAttack(),
    before = crossingHazards(crossing, battleArena);
  for (const age of [2, 5, 10, 14]) {
    crossing.age = age;
    const after = crossingHazards(crossing, battleArena);
    assert.equal(after.spinning.length, 4);
    assert.deepEqual(after.small, before.small);
    after.spinning.forEach((ball, index) => {
      assert.notDeepEqual(ball, before.spinning[index]);
      assert.ok(
        Math.abs(Math.hypot(ball.x - 320, ball.y - 163) - crossingSettings.spinnerOrbitRadius) < 1e-9,
      );
      assert.ok(ball.x - crossingSettings.spinnerRadius > battleArena.x + battleArena.border);
      assert.ok(
        ball.x + crossingSettings.spinnerRadius < battleArena.x + battleArena.size - battleArena.border,
      );
      assert.ok(ball.y - crossingSettings.spinnerRadius > battleArena.y + battleArena.border);
      assert.ok(
        ball.y + crossingSettings.spinnerRadius < battleArena.y + battleArena.size - battleArena.border,
      );
    });
  }
});

test('stationary small snowballs remain dangerous, but do not create snow slowdown', () => {
  const battle = crossingTurn(),
    hp = freshPartyHP();
  battle.soul = { ...crossingHazards(present(attackState(battle).crossing), battleArena).small[0] };
  advanceSnowAttack(battle, hp, crossingSettings.warmup - 0.01, () => 0);
  assert.equal(hp.Kris, 100);
  advanceSnowAttack(battle, hp, 0.02, () => 0);
  assert.equal(hp.Kris, 90);
  advanceSnowAttack(battle, hp, battleSettings.soulHitCooldown + 0.02, () => 0);
  assert.equal(hp.Kris, 80);
  const before = battle.soul.x;
  moveSoul(battle, new Set(['right']), 0.1);
  assert.equal(battle.soul.x - before, 15);
});

test('snowballs ignore fallen teammates and can defeat the final survivor', () => {
  const battle = crossingTurn(),
    hp = freshPartyHP();
  attackState(battle).crossing!.age = crossingSettings.warmup;
  battle.soul = { ...crossingHazards(present(attackState(battle).crossing), battleArena).small[0] };
  hp.Kris = 0;
  hp.Flowey = 5;
  advanceSnowAttack(battle, hp, 0.01, () => 0);
  assert.equal(hp.Kris, 0);
  assert.equal(hp.Flowey, 0);
  assert.equal(hp.Susie, 100);
  assert.match(battle.message, /Flowey is down/);
});

test('staying in the center takes damage from crossing snowballs', () => {
  const battle = crossingTurn(),
    hp = freshPartyHP();
  battle.soul = { x: battleArena.x + battleArena.size / 2, y: battleArena.y + battleArena.size / 2 };
  for (let frame = 0; frame < 900 && battle.snowAttack?.endingAge === null; frame++)
    advanceSnowAttack(battle, hp, 1 / 60, () => 0.5);
  assert.ok(hp.Kris + hp.Flowey < 200);
});

test('the crossing attack finishes, clears its hazards, and allows falling snow as the next random attack', (t) => {
  t.mock.method(Math, 'random', () => 0);
  const battle = crossingTurn(),
    hp = freshPartyHP();
  attackState(battle).hitCooldown = 100;
  advanceSnowAttack(battle, hp, crossingSettings.duration + 0.01, () => 0);
  assert.notEqual(attackState(battle).endingAge, null);
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.1, () => 0);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.snowAttack, null);
  assert.deepEqual(hp, freshPartyHP());
  attackEnemy(battle);
  attackEnemy(battle);
  assert.equal(attackState(battle).direction, 'down');
});
