import { knightRiftDuel, riftClashes } from './rift-choreography.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createKnightEncounter } from './introduction.ts';
import { advanceKnightRift, knightRiftSettings, knightRiftFrame } from './rift.ts';
import { startKrisTurn, startNextEnemyAttack, advanceSnowAttack } from '../shared/rules.ts';
import { canPartyAct, canControlSoul } from '../shared/availability.ts';

const hp = () => ({ Kris: 100, Flowey: 100, Susie: 150, Ralsey: 100 });
test('the cutscene starts after enemy round seven, never after an individual teammate turn', () => {
  const b = createKnightEncounter();
  for (let round = 1; round <= 7; round++) {
    startNextEnemyAttack(b, '');
    assert.equal(b.phase, 'enemy');
    assert.equal(b.enemyAttackCount, round);
    startKrisTurn(b, hp());
    assert.equal(b.phase, round === 7 ? 'knightRift' : 'kris');
  }
  assert.equal(canPartyAct(b), false);
  assert.equal(canControlSoul(b), false);
  assert.equal(b.soul, null);
  assert.equal(b.snowAttack, null);
  assert.equal(b.defending, false);
  assert.equal(b.holdBreath, false);
  assert.equal(b.animationAge, 0);
});
test('natural seventh attack completion enters the same cinematic at different frame rates', () => {
  for (const fps of [30, 60, 144]) {
    const b = createKnightEncounter(),
      party = hp();
    b.enemyAttackCount = 6;
    b.invincible = true;
    startNextEnemyAttack(b, '');
    for (let i = 0; i < 15 * fps && b.phase === 'enemy'; i++) advanceSnowAttack(b, party, 1 / fps, () => 0);
    assert.equal(b.phase, 'knightRift');
    assert.deepEqual(party, hp());
    for (const dt of [0, -1, NaN, Infinity]) assert.equal(advanceKnightRift(b, dt), false);
    let done = false;
    for (let i = 0; i < 12 * fps && !done; i++) done = advanceKnightRift(b, 1 / fps);
    assert.equal(done, true);
    assert.equal(b.animationAge, knightRiftSettings.duration);
  }
});
test('raised pose, sword clash, dark/light fountain and whiteout have ordered beats', () => {
  assert.equal(knightRiftFrame(0.5).raised, true);
  assert.ok(knightRiftDuel(1.9).strength > 0);
  assert.equal(knightRiftFrame(4).fountain, 0);
  assert.ok(knightRiftFrame(7).fountain > 0);
  assert.equal(knightRiftFrame(10).whiteout, 1);
  assert.ok(Math.abs(knightRiftFrame(11.2).fade - 1) < 1e-9);
});

test('four distinct exchanges meet at actual blade intersections and hold their impact poses', () => {
  const heights = new Set<number>();
  for (const time of riftClashes) {
    const pose = knightRiftDuel(time),
      held = knightRiftDuel(time + 0.05);
    assert.ok(pose.contact);
    assert.ok(pose.contact.x >= pose.roaring.x && pose.contact.x <= pose.kaizo.x);
    assert.deepEqual(held.roaring, pose.roaring);
    assert.deepEqual(held.kaizo, pose.kaizo);
    assert.equal(pose.strength, 1);
    heights.add(Math.round(pose.contact.y));
  }
  assert.ok(heights.size >= 3);
});
test('rift choreography stays finite, preserves both fighters and fixes the reduced-motion camera', () => {
  for (let age = 0; age < 11.3; age += 1 / 120) {
    const pose = knightRiftDuel(age),
      reduced = knightRiftDuel(age, true);
    assert.ok(pose.roaring.x < pose.kaizo.x);
    assert.ok(Object.values(pose.roaring).every(Number.isFinite));
    assert.ok(Object.values(pose.kaizo).every(Number.isFinite));
    assert.equal(reduced.zoom, 1);
    assert.equal(reduced.cameraX, 320);
    assert.equal(reduced.cameraY, 240);
  }
});
