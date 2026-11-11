import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceVesselRain, createVesselRain, type VesselSword, vesselRainArena } from './sword-rain.ts';
import { createVesselEncounter } from './entrance.ts';
import {
  advanceSnowAttack,
  beginEnemyAttack,
  moveSoul,
  soulArena,
  startNextEnemyAttack,
} from '../shared/rules.ts';

const hp = () => ({ Kris: 100, Flowey: 100, Susie: 100, Ralsey: 100 });
const sword = (kind: VesselSword['kind'], x = 320, y = 240): VesselSword => ({
  kind,
  x,
  y,
  vx: 0,
  vy: 0,
  angle: Math.PI / 2,
  scale: kind === 'mini' ? 0.4 : 1,
  age: 0,
  active: true,
  hitOpponent: false,
});
function fixture(kind: VesselSword['kind']) {
  const b = createVesselEncounter();
  beginEnemyAttack(b, 'vesselRain', 'Rain');
  assert.equal(b.snowAttack?.direction, 'vesselRain');
  const rain = b.snowAttack!.vesselRain!;
  rain.nextVolley = 10;
  rain.swords.push(sword(kind));
  return b;
}

test('a floor impact removes the falling sword and emits exactly four upward mini swords once', () => {
  const rain = createVesselRain();
  rain.nextVolley = 10;
  rain.swords.push(sword('falling', 320, 445));
  advanceVesselRain(rain, 1 / 60, { x: 10, y: 10 });
  assert.equal(rain.bursts.length, 1);
  assert.equal(rain.swords.length, 4);
  assert.ok(rain.swords.every((s) => s.kind === 'mini' && s.vy < 0));
  assert.ok(rain.swords[0].vx < 0 && rain.swords[3].vx > 0);
  advanceVesselRain(rain, 0.3, { x: 10, y: 10 });
  assert.equal(rain.bursts.length, 1);
  assert.equal(rain.swords.length, 4);
});

test('fourteen warned pairs finish in finite time at 30, 60 and 144 FPS', () => {
  for (const fps of [30, 60, 144]) {
    const rain = createVesselRain();
    let finished = false,
      frames = 0,
      sawWarning = false,
      sawMinis = false;
    while (!finished && frames++ < fps * 20) {
      finished = advanceVesselRain(rain, 1 / fps, { x: 320, y: 240 }, () => 0.37);
      sawWarning ||= rain.warnings.length > 0;
      sawMinis ||= rain.swords.some((s) => s.kind === 'mini');
      assert.ok(rain.swords.length < 70);
    }
    assert.ok(finished && sawWarning && sawMinis);
    assert.equal(rain.volleys, 14);
    assert.ok(rain.age > 13 && rain.age < 16);
  }
});

test('soul can reach all screen edges with no snow slowdown', () => {
  const b = fixture('falling');
  assert.deepEqual(soulArena(b), vesselRainArena);
  moveSoul(b, new Set(['left', 'up']), 10);
  assert.deepEqual(b.soul, { x: 12, y: 10.5 });
  moveSoul(b, new Set(['right', 'down']), 10);
  assert.deepEqual(b.soul, { x: 628, y: 469.5 });
});

test('swords deal 40 or 15, respect Defend and do not damage a dead teammate', () => {
  for (const [kind, damage] of [
    ['falling', 40],
    ['launched', 40],
    ['mini', 15],
  ] as const) {
    const b = fixture(kind),
      party = hp();
    party.Kris = 0;
    b.defending = true;
    b.projectileDamageMultiplier = 0.5;
    advanceSnowAttack(b, party, 1 / 60, () => 0);
    assert.equal(party.Kris, 0);
    assert.equal(party.Flowey, 100 - Math.ceil(damage * 0.5));
    assert.equal(b.enemy.hp, 10000);
    advanceSnowAttack(b, party, 0.1, () => 0);
    assert.equal(party.Flowey, 100 - Math.ceil(damage * 0.5));
  }
});

test('near-misses award TP on the normal half-second timer', () => {
  const b = fixture('falling'),
    party = hp();
  b.snowAttack!.vesselRain!.swords[0].x = 343;
  advanceSnowAttack(b, party, 1 / 60, () => 0);
  assert.equal(b.tp, 3);
  assert.equal(b.snowAttack!.grazeActive, true);
  assert.equal(party.Kris, 100);
  b.snowAttack!.vesselRain!.swords[0].vy = -1;
  advanceSnowAttack(b, party, 0.25, () => 0);
  assert.equal(b.tp, 3);
});

test('edge warnings can originate on all four sides and lock their aim before launch', () => {
  for (let side = 0; side < 4; side++) {
    const rain = createVesselRain('edges');
    const rolls = [(side + 0.1) / 4, 0, 0.5, 0.5];
    advanceVesselRain(rain, 0.7, { x: 320, y: 240 }, () => rolls.shift() ?? 0.5);
    assert.equal(rain.warnings.length, 2);
    const warning = rain.warnings[0];
    assert.equal(side < 2 ? warning.x : warning.y, [-40, 680, -40, 520][side]);
    const aim = warning.angle;
    advanceVesselRain(rain, 0.51, { x: 50, y: 50 }, () => 0.5);
    assert.equal(rain.swords[0].kind, 'launched');
    assert.equal(rain.swords[0].angle, aim);
    assert.equal(rain.swords.length, 2);
  }
});

test('a launched sword bursts on each destination edge into four inward mini swords', () => {
  for (const [x, y, angle, axis, sign] of [
    [605, 240, 0, 'vx', -1],
    [35, 240, Math.PI, 'vx', 1],
    [320, 35, -Math.PI / 2, 'vy', 1],
    [320, 445, Math.PI / 2, 'vy', -1],
  ] as const) {
    const rain = createVesselRain('edges');
    rain.nextVolley = 100;
    rain.swords.push({
      ...sword('launched', x, y),
      angle,
      vx: Math.cos(angle) * 270,
      vy: Math.sin(angle) * 270,
    });
    advanceVesselRain(rain, 1 / 60, { x: 320, y: 240 });
    assert.equal(rain.bursts.length, 1);
    assert.equal(rain.swords.length, 4);
    assert.ok(rain.swords.every((s) => s.kind === 'mini' && s[axis] * sign > 0));
    advanceVesselRain(rain, 0.1, { x: 320, y: 240 });
    assert.equal(rain.bursts.length, 1);
  }
});

test('Vessel alternates rain and edge attacks and returns to the party after each', () => {
  const b = createVesselEncounter(),
    party = hp();
  b.invincible = true;
  for (const pattern of ['rain', 'edges', 'rain', 'edges']) {
    startNextEnemyAttack(b, '');
    assert.equal(b.snowAttack?.vesselRain?.pattern, pattern);
    advanceSnowAttack(b, party, 20, () => 0.37);
    assert.equal(b.phase, 'kris');
    assert.equal(b.snowAttack, null);
  }
  assert.equal(b.enemy.hp, 10000);
});
