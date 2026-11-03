import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceHammers, createHammerMinigame, moveHammerLane, throwHammer } from './hammers.ts';
import { beginTennaMinigame, settleTennaMinigame } from './minigame.ts';
import { createTennaEncounter } from '../../rooms/backstage/tenna-finale.ts';
import { freshPartyHP } from '../../game/config.ts';
function target(flowey = false) {
  const m = createHammerMinigame(() => 0.5);
  m.tvs = [{ x: 300, lane: 1, spawn: 0, flowey, resolved: false }];
  return m;
}
test('hammer hits award five for Tenna and one X for Flowey, once per TV', () => {
  for (const flowey of [false, true]) {
    const m = target(flowey);
    assert.equal(throwHammer(m), true);
    assert.equal(throwHammer(m), false);
    advanceHammers(m, 0.5);
    assert.equal(m.points, flowey ? 0 : 5);
    assert.equal(m.misses, flowey ? 1 : 0);
    advanceHammers(m, 2);
    assert.equal(m.misses, flowey ? 1 : 0);
  }
});
test('TV collisions add one X; changing lanes safely dodges both kinds of TV', () => {
  for (const flowey of [false, true]) {
    const hit = target(flowey);
    advanceHammers(hit, 2);
    assert.equal(hit.misses, 1);
    const dodge = target(flowey);
    moveHammerLane(dodge, 'ArrowUp');
    advanceHammers(dodge, 2);
    assert.equal(dodge.misses, 0);
    assert.equal(dodge.points, 0);
  }
});
test('pointer throws choose the closest lane and movement stays in bounds', () => {
  const m = target();
  throwHammer(m, 358);
  assert.equal(m.lane, 2);
  assert.equal(m.hammers[0].lane, 2);
  moveHammerLane(m, 'ArrowDown');
  assert.equal(m.lane, 2);
  for (let i = 0; i < 4; i++) moveHammerLane(m, 'ArrowUp');
  assert.equal(m.lane, 0);
});
test('Hammer Time is third, cycles to gallery, banks only hit points and applies delayed X damage', () => {
  const b = createTennaEncounter(),
    hp = freshPartyHP();
  b.minigameCount = 2;
  b.phase = 'minigameIntro';
  beginTennaMinigame(b, () => 0.5);
  assert.equal(b.minigame?.kind, 'hammers');
  const m = target();
  m.points = 15;
  m.misses = 1;
  b.minigame = m;
  hp.Flowey = 0;
  assert.equal(hp.Kris, 100);
  const result = settleTennaMinigame(b, hp, () => 0);
  assert.equal(result?.points, 15);
  assert.equal(b.score, 15);
  assert.equal(hp.Kris, 90);
  assert.equal(hp.Susie, 90);
  assert.equal(hp.Flowey, 0);
  b.phase = 'minigameIntro';
  beginTennaMinigame(b);
  assert.equal(b.minigame?.kind, 'shooting');
});
test('incoming TVs and hammer hits are consistent at 30, 60 and 144 FPS and end at fifteen seconds', () => {
  for (const fps of [30, 60, 144]) {
    const m = target();
    throwHammer(m);
    let done = false;
    for (let frame = 0; frame < 15 * fps; frame++) done = advanceHammers(m, 1 / fps);
    assert.equal(done, true);
    assert.equal(m.age, 15);
    assert.equal(m.points, 5);
    assert.equal(m.misses, 0);
    assert.equal(throwHammer(m), false);
  }
});
