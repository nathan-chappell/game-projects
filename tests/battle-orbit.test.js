import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitArena, orbitSettings, createOrbitAttack, advanceOrbitBox, orbitHazards, cubeTouchesSoul } from '../src/battle-orbit.js';
import {
  createEncounter, startKrisTurn, attackEnemy, defend, advanceSnowAttack,
  battleSettings, battleArena, soulArena, isSoulInSnow, moveSoul, snowAttackStatus,
} from '../src/battle-rules.js';
import { freshPartyHP } from '../src/config.js';

const orbitTurn = (defending = false) => {
  const battle = createEncounter();
  startKrisTurn(battle);
  battle.enemyAttackCount = 3;
  (defending ? defend : attackEnemy)(battle);
  (defending ? defend : attackEnemy)(battle);
  return battle;
};

test('the fourth attack starts the soul off-center, clear of the snow and cube, with time to prepare', () => {
  const battle = orbitTurn(), hp = freshPartyHP(), box = soulArena(battle);
  assert.equal(battle.snowAttack.direction, 'orbit');
  assert.equal(box.size, orbitSettings.boxSize);
  assert.ok(battle.soul.x > box.x + box.size / 2);
  assert.ok(battle.soul.y < box.y + box.size / 2);
  assert.equal(isSoulInSnow(battle), false);
  const { cube } = orbitHazards(battle.snowAttack.orbit);
  assert.equal(cubeTouchesSoul(cube, battle.soul, 24, 21), false);
  const before = structuredClone(box);
  advanceSnowAttack(battle, hp, orbitSettings.warmup - 0.01, () => 0);
  assert.deepEqual(box, before);
  assert.deepEqual(hp, freshPartyHP());
  assert.match(snowAttackStatus(battle), /^Orbit: \d+s left$/);
});

test('the box bounces off all four outer walls and carries the soul without changing its relative position', () => {
  const orbit = createOrbitAttack(), soul = { x: orbit.box.x + 90, y: orbit.box.y + 70 };
  const turns = new Set();
  for (let frame = 0; frame < 960; frame++) {
    const vx = orbit.box.vx, vy = orbit.box.vy;
    advanceOrbitBox(orbit, soul, 1 / 60);
    if (vx !== orbit.box.vx) turns.add(vx > 0 ? 'right' : 'left');
    if (vy !== orbit.box.vy) turns.add(vy > 0 ? 'bottom' : 'top');
    const box = orbit.box;
    assert.ok(box.x >= orbitArena.x + orbitArena.border);
    assert.ok(box.x + box.size <= orbitArena.x + orbitArena.width - orbitArena.border);
    assert.ok(box.y >= orbitArena.y + orbitArena.border);
    assert.ok(box.y + box.size <= orbitArena.y + orbitArena.height - orbitArena.border);
    assert.ok(Math.abs(soul.x - box.x - 90) < 1e-8);
    assert.ok(Math.abs(soul.y - box.y - 70) < 1e-8);
  }
  assert.deepEqual([...turns].sort(), ['bottom', 'left', 'right', 'top']);
});

test('large time steps reflect wall overshoot instead of letting the box escape', () => {
  const orbit = createOrbitAttack(), soul = { x: orbit.box.x + 80, y: orbit.box.y + 80 };
  advanceOrbitBox(orbit, soul, 12);
  const box = orbit.box;
  assert.ok(box.x >= orbitArena.x + orbitArena.border);
  assert.ok(box.x + box.size <= orbitArena.x + orbitArena.width - orbitArena.border);
  assert.ok(box.y >= orbitArena.y + orbitArena.border);
  assert.ok(box.y + box.size <= orbitArena.y + orbitArena.height - orbitArena.border);
  assert.ok(Math.abs(soul.x - box.x - 80) < 1e-8);
  assert.ok(Math.abs(soul.y - box.y - 80) < 1e-8);
});

test('normal play uses ten snowballs and the saved hard pattern retains all eighteen', () => {
  assert.equal(createOrbitAttack().variant, 'normal');
  for (const [variant, count] of [['normal', 10], ['hard', 18]]) {
    const orbit = createOrbitAttack(variant), before = orbitHazards(orbit);
    orbit.age = 5;
    const after = orbitHazards(orbit);
    assert.equal(after.balls.length, count);
    assert.equal(after.cube.x, before.cube.x);
    assert.equal(after.cube.y, before.cube.y);
    assert.notEqual(after.cube.angle, before.cube.angle);
    after.balls.forEach((ball, index) => {
      assert.notDeepEqual(ball, before.balls[index]);
      assert.ok(ball.x - orbitSettings.ballRadius > orbitArena.x + orbitArena.border);
      assert.ok(ball.x + orbitSettings.ballRadius < orbitArena.x + orbitArena.width - orbitArena.border);
      assert.ok(ball.y - orbitSettings.ballRadius > orbitArena.y + orbitArena.border);
      assert.ok(ball.y + orbitSettings.ballRadius < orbitArena.y + orbitArena.height - orbitArena.border);
    });
  }
});

test('cube collisions follow its rotation rather than an oversized rectangular hit area', () => {
  const cube = { x: 320, y: 151, size: 54, angle: 0 }, corner = { x: 354, y: 185 };
  assert.equal(cubeTouchesSoul(cube, corner, 24, 21), true);
  cube.angle = Math.PI / 4;
  assert.equal(cubeTouchesSoul(cube, corner, 24, 21), false);
  assert.equal(cubeTouchesSoul(cube, { x: 320, y: 151 }, 24, 21), true);
  assert.equal(cubeTouchesSoul(cube, { x: 400, y: 151 }, 24, 21), false);
});

test('normal cube hits deal 10, saved hard cube hits deal 50, and Defend and hit immunity still apply', () => {
  for (const [variant, cubeDamage] of [['normal', 10], ['hard', 50]]) {
    for (const defending of [false, true]) {
      for (const hazard of ['cube', 'ball']) {
        const battle = orbitTurn(defending), hp = freshPartyHP();
        battle.snowAttack.orbit = createOrbitAttack(variant);
        const orbit = battle.snowAttack.orbit;
        orbit.age = orbitSettings.warmup;
        orbit.box.vx = orbit.box.vy = 0;
        const { cube, balls } = orbitHazards(orbit);
        if (hazard === 'cube') battle.soul = { x: cube.x, y: cube.y };
        else {
          orbit.box.x = 300;
          orbit.box.y = 100;
          battle.soul = { ...balls[0] };
        }
        assert.equal(isSoulInSnow(battle), false);
        const damage = (hazard === 'cube' ? cubeDamage : 10) * (defending ? 0.5 : 1);
        advanceSnowAttack(battle, hp, 0.01, () => 0);
        assert.equal(hp.Kris, 100 - damage);
        assert.equal(hp.Flowey, 100);
        advanceSnowAttack(battle, hp, 0.05, () => 0);
        assert.equal(hp.Kris, 100 - damage);
      }
    }
  }
});

test('ice hits ignore fallen teammates and can defeat the last survivor without negative HP', () => {
  const battle = orbitTurn(), hp = freshPartyHP(), orbit = battle.snowAttack.orbit;
  hp.Kris = 0;
  hp.Flowey = 5;
  orbit.age = orbitSettings.warmup;
  orbit.box.vx = orbit.box.vy = 0;
  const { cube } = orbitHazards(orbit);
  battle.soul = { x: cube.x, y: cube.y };
  advanceSnowAttack(battle, hp, 0.01, () => 0);
  assert.equal(hp.Kris, 0);
  assert.equal(hp.Flowey, 0);
  assert.equal(hp.Susie, 100);
  assert.match(battle.message, /Flowey is down/);
});

test('movement and damaging snow borders use the moving box, not the old arena position', () => {
  const battle = orbitTurn(), hp = freshPartyHP(), orbit = battle.snowAttack.orbit;
  orbit.box.x = 40;
  orbit.box.y = 30;
  orbit.box.vx = orbit.box.vy = 0;
  battle.soul = { x: 120, y: 110 };
  assert.equal(isSoulInSnow(battle), false);
  moveSoul(battle, new Set(['left']), 10);
  assert.equal(battle.soul.x, 40 + orbit.box.border + battleSettings.soulWidth / 2);
  assert.equal(isSoulInSnow(battle), true);
  advanceSnowAttack(battle, hp, 0.01, () => 0);
  assert.equal(hp.Kris, 75);
  moveSoul(battle, new Set(['up']), 10);
  assert.equal(battle.soul.y, 30 + orbit.box.border + battleSettings.soulHeight / 2);
});

test('the orbit attack ends, clears its moving geometry, and advances to the crossing snowballs', () => {
  const battle = orbitTurn(), hp = freshPartyHP();
  battle.snowAttack.hitCooldown = 100;
  advanceSnowAttack(battle, hp, orbitSettings.duration + 0.01, () => 0);
  assert.notEqual(battle.snowAttack.endingAge, null);
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.1, () => 0);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.snowAttack, null);
  assert.equal(soulArena(battle), battleArena);
  assert.deepEqual(hp, freshPartyHP());
  attackEnemy(battle);
  attackEnemy(battle);
  assert.equal(battle.snowAttack.direction, 'crossing');
});
