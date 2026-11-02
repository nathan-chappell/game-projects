import type { Encounter } from '../shared/types.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { createTennaEncounter } from '../../rooms/backstage/tenna-finale.ts';
import { requestTennaMinigame, finishTennaMinigame, advanceBattleTime } from '../shared/rules.ts';
import { beginTennaMinigame } from './minigame.ts';
import { advanceSurfer, createSurferMinigame, jumpSurfer, surferSettings } from './surfers.ts';
function currentMinigame(b: Encounter) {
  if (!b.minigame) throw new Error('Missing minigame');
  return b.minigame;
}
test('Surfers follows the gallery, preserves the one-time introduction, and cycles back to shooting', () => {
  const b = createTennaEncounter(),
    hp = freshPartyHP();
  requestTennaMinigame(b);
  beginTennaMinigame(b, () => 0);
  assert.equal(currentMinigame(b).kind, 'shooting');
  finishTennaMinigame(b, hp);
  b.phase = 'kris';
  b.turn = 'Kris';
  requestTennaMinigame(b);
  assert.equal(b.phase, 'minigame');
  assert.equal(currentMinigame(b).kind, 'surf');
  finishTennaMinigame(b, hp);
  b.phase = 'kris';
  b.turn = 'Kris';
  requestTennaMinigame(b);
  assert.equal(currentMinigame(b).kind, 'shooting');
});
test('each rock crash removes ten points once and gold coins give five each', () => {
  const m = createSurferMinigame();
  for (const r of m.rocks) r.x = 10000;
  for (const c of m.coins) c.x = 10000;
  m.rocks[0].x = surferSettings.playerX;
  advanceSurfer(m, 0.01);
  assert.equal(m.points, -10);
  assert.equal(m.misses, 1);
  advanceSurfer(m, 0.05);
  assert.equal(m.points, -10);
  assert.equal(m.misses, 1);
  m.coins[0].x = surferSettings.playerX;
  m.coins[0].y = 300;
  advanceSurfer(m, 0.01);
  assert.equal(m.points, -5);
  assert.equal(m.coinsCollected, 1);
  advanceSurfer(m, 0.01);
  assert.equal(m.points, -5);
  assert.equal(m.coinsCollected, 1);
});
test('Flowey appears on exactly one rock and offers exactly one ten-point purple coin', () => {
  const m = createSurferMinigame();
  assert.equal(m.rocks.filter((r) => r.flowey).length, 1);
  assert.equal(m.coins.filter((c) => c.purple).length, 1);
  for (const r of m.rocks) r.x = 10000;
  for (const c of m.coins) c.x = 10000;
  const purple = m.coins.find((c) => c.purple)!;
  purple.x = 140;
  purple.y = 300;
  advanceSurfer(m, 0.01);
  assert.equal(m.points, 10);
  assert.equal(m.purpleCollected, true);
  advanceSurfer(m, 0.1);
  assert.equal(m.points, 10);
});
test('jumping clears every rock and reaches Flowey’s coin at different frame rates', () => {
  for (const fps of [30, 60, 144]) {
    const m = createSurferMinigame();
    let done = false;
    for (let i = 0; i < fps * 16 && !done; i++) {
      if (m.rocks.some((r) => r.x > 140 && r.x < 212)) jumpSurfer(m);
      done = advanceSurfer(m, 1 / fps);
    }
    assert.equal(done, true);
    assert.equal(m.age, 15);
    assert.equal(m.misses, 0);
    assert.equal(m.purpleCollected, true);
    assert.ok(m.points >= 10);
  }
  const m = createSurferMinigame();
  assert.equal(jumpSurfer(m), true);
  assert.equal(jumpSurfer(m), false);
  advanceSurfer(m, 0.2);
  assert.equal(jumpSurfer(m), false);
});
test('Surfers ends at fifteen seconds, settles coin/rock points without X damage, and cannot reduce total score below zero', () => {
  const b = createTennaEncounter(),
    hp = freshPartyHP();
  b.minigameIntroSeen = true;
  b.minigameCount = 1;
  b.score = 100;
  requestTennaMinigame(b);
  assert.equal(currentMinigame(b).kind, 'surf');
  if (b.minigame!.kind !== 'surf') throw new Error('Expected Surfers');
  b.minigame!.points = -10;
  b.minigame!.misses = 1;
  finishTennaMinigame(b, hp);
  assert.equal(b.score, 90);
  assert.deepEqual(hp, freshPartyHP());
  assert.equal(b.turn, 'Flowey');
  b.phase = 'kris';
  b.turn = 'Kris';
  b.minigameCount = 1;
  requestTennaMinigame(b);
  advanceBattleTime(b, 14.99, hp);
  assert.equal(b.phase, 'minigame');
  advanceBattleTime(b, 0.01, hp);
  assert.equal(b.phase, 'flowey');
  assert.equal(b.minigame, null);
  assert.deepEqual(hp, freshPartyHP());
  b.phase = 'kris';
  b.turn = 'Kris';
  b.minigameCount = 1;
  b.score = 0;
  requestTennaMinigame(b);
  const round = currentMinigame(b);
  if (round.kind !== 'surf') throw new Error('Expected Surfers');
  round.points = -50;
  finishTennaMinigame(b, hp);
  assert.equal(b.score, 0);
});
