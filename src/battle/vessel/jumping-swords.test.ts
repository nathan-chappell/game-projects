import assert from 'node:assert/strict';
import test from 'node:test';
import { createVesselEncounter } from './entrance.ts';
import { advanceSnowAttack, moveSoul, startNextEnemyAttack } from '../shared/rules.ts';
import { advanceVesselRain, createVesselRain, type VesselSword } from './sword-rain.ts';

function fixture() {
  const b = createVesselEncounter();
  b.enemyAttackCount = 3;
  startNextEnemyAttack(b, '');
  return b;
}

test('blue soul jumps with gravity and cannot fly or auto-jump while jump is held', () => {
  for (const fps of [30, 60, 144]) {
    const b = fixture();
    assert.equal(b.snowAttack!.vesselRain!.pattern, 'jump');
    assert.equal(b.soul!.y, 469.5);
    let peak = b.soul!.y;
    for (let i = 0; i < fps * 2; i++) {
      moveSoul(b, new Set(['up']), 1 / fps);
      peak = Math.min(peak, b.soul!.y);
    }
    assert.ok(peak > 400 && peak < 410);
    assert.equal(b.soul!.y, 469.5);
    moveSoul(b, new Set(), 1 / fps);
    moveSoul(b, new Set(['up']), 1 / fps);
    assert.ok(b.soul!.y < 469.5);
  }
});

test('releasing jump shortens the hop and down cannot move the blue soul through the floor', () => {
  function peak(release: boolean) {
    const b = fixture();
    let peak = 480;
    for (let i = 0; i < 100; i++) {
      moveSoul(b, new Set(release && i > 5 ? [] : ['jump']), 1 / 120);
      peak = Math.min(peak, b.soul!.y);
    }
    return peak;
  }
  assert.ok(peak(true) > peak(false) + 20);
  const b = fixture();
  moveSoul(b, new Set(['right', 'down']), 10);
  assert.deepEqual(b.soul, { x: 628, y: 469.5 });
});

test('ten floor swords come from both sides and exactly one red sword emits four faster red minis', () => {
  const rain = createVesselRain('jump');
  const big = new Set<VesselSword>(),
    mini = new Set<VesselSword>();
  let finished = false;
  for (let frame = 0; frame < 60 * 20 && !finished; frame++) {
    finished = advanceVesselRain(rain, 1 / 60, { x: 320, y: 469.5 });
    for (const sword of rain.swords) (sword.kind === 'mini' ? mini : big).add(sword);
  }
  assert.equal(finished, true);
  assert.equal(big.size, 10);
  assert.equal([...big].filter((s) => s.red).length, 1);
  assert.ok([...big].some((s) => s.vx > 0) && [...big].some((s) => s.vx < 0));
  assert.ok([...big].every((s) => Math.abs(s.y - 468) < 1e-8 && Math.abs(s.vx) === 330));
  assert.equal(mini.size, 4);
  assert.ok([...mini].every((s) => s.red && s.vy < 0 && Math.abs(Math.hypot(s.vx, s.vy) - 300) < 1e-8));
});

test('a timed jump clears a floor sword that hits a standing soul', () => {
  for (const jump of [false, true]) {
    const b = fixture(),
      hp = { Kris: 100, Flowey: 100, Susie: 100, Ralsey: 100 };
    const rain = b.snowAttack!.vesselRain!;
    rain.nextVolley = 100;
    rain.swords.push({
      kind: 'sweeping',
      x: 170,
      y: 468,
      vx: 330,
      vy: 0,
      angle: 0,
      scale: 1,
      age: 0,
      active: true,
      hitOpponent: false,
    });
    for (let frame = 0; frame < 60; frame++) {
      moveSoul(b, new Set(jump ? ['up'] : []), 1 / 60);
      advanceSnowAttack(b, hp, 1 / 60, () => 0);
    }
    assert.equal(hp.Kris, jump ? 100 : 60);
  }
});
