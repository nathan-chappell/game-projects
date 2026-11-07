import type { Encounter } from '../shared/types.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createKnightEncounter } from './introduction.ts';
import {
  advanceCrossingSwords,
  createCrossingSwords,
  edgeMiniVolley,
  edgeMiniSettings,
  crossingSafePoint,
  crossingSwordSettings,
  crossingSwordTouches,
  crossingWarnings,
  crossingWave,
} from './crossing-swords.ts';
import {
  advanceSnowAttack,
  defend,
  startKrisTurn,
  startNextEnemyAttack,
  useDarkAct,
} from '../shared/rules.ts';
import { battleArena } from '../shared/settings.ts';
import { hitOpposingKnight } from './projectiles.ts';

const hp = () => ({ Kris: 100, Flowey: 100, Susie: 100, Ralsey: 100 });
test('crossing swords warn first and have exactly six increasingly fast, mixed-color diagonal waves', () => {
  const a = createCrossingSwords(battleArena);
  assert.equal(crossingWarnings(a).length, 0);
  advanceCrossingSwords(a, 0.3);
  assert.equal(crossingWarnings(a).length, 10);
  assert.equal(a.swords.length, 0);
  const speeds = [];
  for (let wave = 0; wave < 6; wave++) {
    const swords = crossingWave(a, wave);
    speeds.push(swords[0].speed);
    assert.ok(swords.some((s) => s.owner === 'roaring'));
    assert.ok(swords.some((s) => s.owner === 'kaizo'));
    assert.ok(swords.some((s) => Math.sin(s.angle) > 0.5));
    assert.ok(swords.some((s) => Math.sin(s.angle) < -0.5));
  }
  assert.deepEqual(speeds, [620, 720, 820, 920, 1020, 1120]);
  let finished = false,
    maxID = 0;
  for (let i = 0; i < 12 * 60 && !finished; i++) {
    const r = advanceCrossingSwords(a, 1 / 60);
    for (const sword of a.swords) if (!sword.scale) maxID = Math.max(maxID, sword.id);
    for (const sword of r.arrived) sword.hitOpponent = true;
    finished = r.finished;
  }
  assert.equal(a.waves, crossingSwordSettings.waves);
  assert.equal(maxID, 59);
  assert.equal(finished, true);
});
test('each wave has a real soul-sized safe pocket and the warning paths match live trajectories', () => {
  const a = createCrossingSwords(battleArena);
  for (let wave = 0; wave < 6; wave++) {
    const point = crossingSafePoint(a, wave);
    const swords = crossingWave(a, wave);
    for (const sword of swords) {
      for (let distance = 250; distance <= 550; distance += 5) {
        sword.x = sword.origin.x + Math.cos(sword.angle) * distance;
        sword.y = sword.origin.y + Math.sin(sword.angle) * distance;
        assert.equal(crossingSwordTouches(sword, point, 24, 21), false);
      }
    }
  }
  const first = crossingSafePoint(a, 0),
    last = crossingSafePoint(a, 5);
  assert.ok(Math.hypot(first.x - last.x, first.y - last.y) > 50);
});
test('rotated blade collisions distinguish hits from grazes without counting inactive projectiles', () => {
  const a = createCrossingSwords(battleArena),
    sword = crossingWave(a, 0)[0];
  sword.x = 320;
  sword.y = 160;
  assert.equal(crossingSwordTouches(sword, { x: 320, y: 160 }), true);
  assert.equal(crossingSwordTouches(sword, { x: 320, y: 260 }), false);
  const near = { x: sword.x - Math.sin(sword.angle) * 34, y: sword.y + Math.cos(sword.angle) * 34 };
  assert.equal(crossingSwordTouches(sword, near), false);
  assert.equal(crossingSwordTouches(sword, near, 24, 21, 10), true);
  sword.hitOpponent = true;
  assert.equal(crossingSwordTouches(sword, { x: 320, y: 160 }), false);
});
test('second attack is selected after the first, then finishes at 30/60/144 FPS with five-damage crossfire', () => {
  const results = [];
  for (const fps of [30, 60, 144]) {
    const b = createKnightEncounter(),
      party = hp();
    b.invincible = true;
    startNextEnemyAttack(b, '');
    assert.equal(b.snowAttack?.direction, 'knightSwords');
    startKrisTurn(b, party);
    startNextEnemyAttack(b, '');
    assert.equal(b.snowAttack?.direction, 'knightCrossing');
    for (let i = 0; i < 12 * fps && b.phase === 'enemy'; i++) advanceSnowAttack(b, party, 1 / fps, () => 0);
    assert.equal(b.phase, 'kris');
    assert.equal(b.soul, null);
    assert.equal(b.snowAttack, null);
    assert.deepEqual(party, hp());
    const losses = [20000 - b.knightEnemies!.roaring.hp, 30000 - b.knightEnemies!.kaizo.hp];
    assert.ok(losses.every((loss) => loss > 0 && loss % 5 === 0));
    results.push(losses);
    startNextEnemyAttack(b, '');
    assert.equal((b as Encounter).snowAttack?.direction, 'knightSwords');
  }
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
});
test('both projectile colors retain party damage, defense reduction, cooldown and single opponent hits', () => {
  for (const [owner, damage] of [
    ['roaring', 40],
    ['kaizo', 50],
  ] as const) {
    const b = createKnightEncounter(),
      party = hp();
    useDarkAct(b, party);
    defend(b);
    b.enemyAttackCount = 1;
    startNextEnemyAttack(b, '');
    const a = b.snowAttack!.knightCrossing!;
    a.waves = 1;
    a.age = 1;
    const sword = crossingWave(a, 0).find((s) => s.owner === owner)!;
    sword.origin = { ...b.soul! };
    sword.x = sword.origin.x;
    sword.y = sword.origin.y;
    sword.launch = 1;
    a.swords = [sword];
    advanceSnowAttack(b, party, 1 / 60, () => 0);
    assert.equal(party.Kris, 100 - Math.round(damage * 0.75 * 0.5));
    const before = party.Kris;
    advanceSnowAttack(b, party, 1 / 60, () => 0);
    assert.equal(party.Kris, before);
    assert.equal(hitOpposingKnight(b, sword), 5);
    assert.equal(hitOpposingKnight(b, sword), 0);
  }
});

test('three mini swords warn on separate arena edges and keep their aim after the player moves', () => {
  const a = createCrossingSwords(battleArena);
  const target = { x: 300, y: 180 };
  advanceCrossingSwords(a, 0.3, () => true, target);
  assert.equal(a.miniWarnings.length, 3);
  const aim = a.miniWarnings.map((s) => ({ angle: s.angle, origin: { ...s.origin } }));
  const sides = new Set();
  for (const sword of a.miniWarnings) {
    assert.equal(sword.scale, edgeMiniSettings.scale);
    assert.equal(sword.active, false);
    const left = a.arena.x + a.arena.border,
      top = a.arena.y + a.arena.border;
    const right = a.arena.x + a.arena.size - a.arena.border,
      bottom = a.arena.y + a.arena.size - a.arena.border;
    assert.ok(sword.x === left || sword.x === right || sword.y === top || sword.y === bottom);
    sides.add(sword.x === left ? 'left' : sword.x === right ? 'right' : sword.y === top ? 'top' : 'bottom');
    const dx = target.x - sword.x,
      dy = target.y - sword.y;
    assert.ok(Math.abs(dx * Math.sin(sword.angle) - dy * Math.cos(sword.angle)) < 1e-6);
    assert.ok(dx * Math.cos(sword.angle) + dy * Math.sin(sword.angle) > 0);
    assert.equal(crossingSwordTouches(sword, sword), false);
  }
  assert.equal(sides.size, 3);
  advanceCrossingSwords(a, 0.1, () => true, { x: 410, y: 250 });
  assert.deepEqual(
    a.miniWarnings.map((s) => ({ angle: s.angle, origin: s.origin })),
    aim,
  );
  advanceCrossingSwords(a, 0.5, () => true, { x: 410, y: 250 });
  const minis = a.swords.filter((s) => s.scale);
  assert.equal(minis.length, 3);
  assert.equal(a.miniWarnings.length, 0);
  assert.ok(minis.every((s) => s.active && s.speed === 340));
  assert.deepEqual(
    minis.map((s) => ({ angle: s.angle, origin: s.origin })),
    aim,
  );
});
test('mini sword hitboxes match their smaller artwork and defeated owners do not launch them', () => {
  const a = createCrossingSwords(battleArena);
  const mini = { ...edgeMiniVolley(a, 0, { x: 320, y: 163 })[0], x: 320, y: 160, angle: 0, active: true };
  assert.equal(crossingSwordTouches(mini, { x: 330, y: 166 }, 4, 4), false);
  assert.equal(crossingSwordTouches({ ...mini, scale: 1 }, { x: 330, y: 166 }, 4, 4), true);
  advanceCrossingSwords(a, 0.3, (owner) => owner === 'kaizo');
  assert.ok(a.miniWarnings.length > 0);
  assert.ok(a.miniWarnings.every((s) => s.owner === 'kaizo'));
  advanceCrossingSwords(a, 0.6, (owner) => owner === 'roaring');
  assert.ok(a.swords.every((s) => s.owner === 'roaring'));
  assert.equal(a.miniWarnings.length, 0);
});
