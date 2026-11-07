import assert from 'node:assert/strict';
import test from 'node:test';
import { knightCameraShot } from './knight-cinematography.ts';
import { knightDuelPose, knightImpactTimes, knightSequenceSeconds } from './knight-choreography.ts';

test('charge holds its anticipation, snaps forward and recoils after the blocked hit', () => {
  assert.ok(knightDuelPose(2.8).roaring.x < 120);
  assert.ok(knightDuelPose(3).roaring.x - knightDuelPose(2.8).roaring.x > 290);
  const hit = knightDuelPose(3.05),
    held = knightDuelPose(3.12);
  assert.ok(Math.abs(hit.roaring.x - held.roaring.x) < 1e-8);
  assert.ok(knightDuelPose(3.36).kaizo.x > hit.kaizo.x);
  assert.notEqual(knightDuelPose(3.36).kaizo.lean, hit.kaizo.lean);
});
test('close-ups precede their own Swoons and both attacks retain the original blocked handoff', () => {
  assert.equal(knightCameraShot(4.9).portrait, 'roaring');
  assert.equal(knightCameraShot(7.35).portrait, 'kaizo');
  assert.equal(knightCameraShot(6).portrait, null);
  assert.equal(knightDuelPose(6).phase, 'roaringSwoon');
  assert.equal(knightDuelPose(8.4).phase, 'kaizoSwoon');
  assert.deepEqual(knightImpactTimes, [3.05, 6.15, 8.55]);
  assert.equal(knightDuelPose(knightSequenceSeconds).phase, 'threeTeams');
});
test('reduced motion keeps a fixed unobstructed wide shot throughout the sequence', () => {
  for (let age = 0; age <= 11; age += 0.05) {
    const camera = knightCameraShot(age, true);
    assert.deepEqual(camera, { zoom: 1, x: 320, y: 240, portrait: null, portraitProgress: 0, letterbox: 0 });
    const normal = knightCameraShot(age);
    assert.ok(normal.zoom >= 1 && normal.zoom < 1.15);
    assert.ok(Number.isFinite(normal.x) && Number.isFinite(normal.y));
  }
});
