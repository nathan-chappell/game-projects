import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceHammers, createHammerMinigame, setHammerAimKey, throwHammer } from './hammers.ts';
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
test('Tenna TVs at every height hit Susie once; unshot Flowey TVs pass harmlessly', () => {
  for (const fps of [30, 60, 144]) {
    for (const lane of [0, 1, 2]) {
      for (const flowey of [false, true]) {
        const m = target(flowey);
        m.tvs[0].lane = lane;
        setHammerAimKey(m, 'ArrowUp', true);
        for (let i = 0; i < 2 * fps; i++) advanceHammers(m, 1 / fps);
        assert.equal(m.misses, flowey ? 0 : 1);
        assert.equal(m.tvs[0].resolved, true);
        advanceHammers(m, 1);
        assert.equal(m.misses, flowey ? 0 : 1);
        assert.equal(m.points, 0);
      }
    }
  }
});
test('mouse and keyboard aim hammers freely while Susie throws from a fixed position', () => {
  const m = target();
  throwHammer(m, 358, 400);
  assert.equal(m.hammers[0].x, 126);
  assert.equal(m.hammers[0].y, 260);
  assert.ok(m.hammers[0].vy > 0);
  assert.ok(m.hammers[0].vx > 0);
  m.tvs = [];
  setHammerAimKey(m, 'ArrowUp', true);
  setHammerAimKey(m, 'ArrowLeft', true);
  advanceHammers(m, 0.2);
  assert.ok(m.cursor.x < 400);
  assert.ok(m.cursor.y < 358);
  setHammerAimKey(m, 'ArrowUp', false);
  setHammerAimKey(m, 'ArrowLeft', false);
  const stopped = { ...m.cursor };
  advanceHammers(m, 0.3);
  assert.deepEqual(m.cursor, stopped);
  throwHammer(m);
  assert.equal(m.hammers.at(-1)?.y, 260);
});
test('crosshair movement is frame independent and stays within the target area', () => {
  for (const fps of [30, 60, 144]) {
    const m = target();
    m.tvs = [];
    setHammerAimKey(m, 'ArrowRight', true);
    for (let i = 0; i < fps / 2; i++) advanceHammers(m, 1 / fps);
    assert.ok(Math.abs(m.cursor.x - 550) < 0.01);
    advanceHammers(m, 3);
    assert.equal(m.cursor.x, 610);
    setHammerAimKey(m, 'ArrowUp', true);
    advanceHammers(m, 3);
    assert.equal(m.cursor.y, 120);
  }
});
test('faster TV waves leave a clear gap and a different height after every Flowey', () => {
  for (const random of [() => 0, () => 0.5, () => 0.99, Math.random]) {
    const m = createHammerMinigame(random);
    for (let i = 1; i < m.tvs.length; i++) {
      const previous = m.tvs[i - 1],
        next = m.tvs[i];
      if (previous.flowey) {
        assert.ok(next.spawn - previous.spawn >= 1.04);
        assert.notEqual(next.lane, previous.lane);
      }
    }
    assert.ok(m.tvs.length > 18);
  }
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
