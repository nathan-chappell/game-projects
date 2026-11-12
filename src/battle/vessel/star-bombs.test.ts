import assert from 'node:assert/strict';
import test from 'node:test';
import { createStarBomb, starBombSettings, type StarBomb } from './star-bombs.ts';
import { advanceVesselRain, createVesselRain } from './sword-rain.ts';
import { createVesselEncounter } from './entrance.ts';
import { advanceSnowAttack, beginEnemyAttack } from '../shared/rules.ts';

test('stars spawn inside the screen, away from the soul and each other even with a fixed RNG', () => {
  const soul = { x: 247.2, y: 188 },
    bombs: StarBomb[] = [];
  for (let i = 0; i < 4; i++) {
    const bomb = createStarBomb(soul, bombs, () => 0.37);
    assert.ok(bomb.x >= 40 && bomb.x <= 600 && bomb.y >= 40 && bomb.y <= 440);
    assert.ok(Math.hypot(bomb.x - soul.x, bomb.y - soul.y) >= 90);
    assert.ok(bombs.every((other) => Math.hypot(bomb.x - other.x, bomb.y - other.y) >= 80));
    bombs.push(bomb);
  }
});

test('each star warns before bursting exactly once into eight faster red swords in all directions', () => {
  const rain = createVesselRain('bombs');
  rain.nextVolley = 100;
  rain.bombs.push({ x: 320, y: 240, age: 0, angle: 0 });
  advanceVesselRain(rain, 1, { x: 20, y: 20 });
  assert.equal(rain.bombs.length, 1);
  assert.equal(rain.swords.length, 0);
  advanceVesselRain(rain, 0.11, { x: 20, y: 20 });
  assert.equal(rain.bombs.length, 0);
  assert.equal(rain.swords.length, 8);
  assert.equal(rain.bursts.length, 1);
  assert.equal(rain.bursts[0].radial, true);
  for (const [i, sword] of rain.swords.entries()) {
    assert.equal(sword.red, true);
    assert.equal(sword.kind, 'mini');
    assert.ok(Math.abs(Math.hypot(sword.vx, sword.vy) - 300) < 1e-9);
    assert.equal(sword.angle, (i / 8) * Math.PI * 2);
  }
  advanceVesselRain(rain, 0.1, { x: 20, y: 20 });
  assert.equal(rain.swords.length, 8);
  assert.equal(rain.bursts.length, 1);
});

test('red swords deal 25 damage with the existing cooldown and Defend reduction', () => {
  for (const defending of [false, true]) {
    const b = createVesselEncounter();
    beginEnemyAttack(b, 'vesselRain', '');
    b.snowAttack!.vesselRain = createVesselRain('bombs');
    const rain = b.snowAttack!.vesselRain!;
    rain.nextVolley = 100;
    rain.swords.push({
      kind: 'mini',
      x: 320,
      y: 240,
      vx: 0,
      vy: 0,
      angle: 0,
      scale: 0.4,
      age: 0,
      active: true,
      hitOpponent: false,
      red: true,
    });
    b.projectileDamageMultiplier = defending ? 0.5 : 1;
    const hp = { Kris: 100, Flowey: 0, Susie: 100, Ralsey: 100 };
    advanceSnowAttack(b, hp, 1 / 60, () => 0);
    assert.equal(hp.Kris, defending ? 87 : 75);
    assert.equal(hp.Flowey, 0);
    advanceSnowAttack(b, hp, 0.1, () => 0);
    assert.equal(hp.Kris, defending ? 87 : 75);
    assert.equal(b.enemy.hp, 10000);
  }
  assert.equal(starBombSettings.damage, 25);
});

test('the star attack clears its bombs and swords at different frame rates', () => {
  for (const fps of [30, 60, 144]) {
    const rain = createVesselRain('bombs');
    let finished = false;
    for (let frame = 0; frame < fps * 20 && !finished; frame++)
      finished = advanceVesselRain(rain, 1 / fps, { x: 320, y: 240 }, () => 0.37);
    assert.equal(finished, true);
    assert.equal(rain.bombs.length, 0);
    assert.equal(rain.swords.length, 0);
    assert.equal(rain.volleys, 14);
  }
});
