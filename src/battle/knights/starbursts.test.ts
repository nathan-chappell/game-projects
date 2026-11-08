import assert from 'node:assert/strict';
import test from 'node:test';
import { createStarbursts, advanceStarbursts, starburstSettings, starTouchesSoul } from './starbursts.ts';
import { createKnightEncounter } from './introduction.ts';
import { battleArena, battleSettings } from '../shared/settings.ts';
import { advanceSnowAttack, defend, startNextEnemyAttack, useDarkAct } from '../shared/rules.ts';
import { isGrazingHazard } from '../shared/graze.ts';
import { hitOpposingKnight } from './projectiles.ts';

const party = () => ({ Kris: 100, Flowey: 100, Susie: 100, Ralsey: 100 });
test('both knights cast stars that charge and explode once into exactly six inherited-owner shots', () => {
  const a = createStarbursts(battleArena);
  advanceStarbursts(a, 0.8);
  assert.equal(a.stars.length, 2);
  assert.equal(a.fragments.length, 0);
  advanceStarbursts(a, 1.69);
  assert.equal(a.explosions, 0);
  advanceStarbursts(a, 0.01);
  assert.equal(a.explosions, 2);
  assert.equal(a.fragments.length, 12);
  for (const owner of ['roaring', 'kaizo'] as const) {
    const shots = a.fragments.filter((s) => s.owner === owner);
    assert.equal(shots.length, 6);
    const directions = shots.map((s) => Math.atan2(s.vy, s.vx)).sort((x, y) => x - y);
    for (let i = 1; i < 6; i++) assert.ok(Math.abs(directions[i] - directions[i - 1] - Math.PI / 3) < 1e-8);
    assert.ok(shots.every((s) => Math.abs(Math.hypot(s.vx, s.vy) - 200) < 1e-8));
  }
  advanceStarbursts(a, 0.01);
  assert.equal(a.explosions, 2);
  assert.equal(a.fragments.length, 12, 'an exploded star cannot emit a second set');
  assert.ok(a.stars.every((s) => s.exploded && !s.active));
});
test('third attack completes at 30/60/144 FPS and retains five-damage opposing-knight hits', () => {
  const losses = [];
  for (const fps of [30, 60, 144]) {
    const b = createKnightEncounter(),
      hp = party();
    b.invincible = true;
    b.enemyAttackCount = 2;
    startNextEnemyAttack(b, '');
    assert.equal(b.snowAttack?.direction, 'knightStars');
    const attack = b.snowAttack!.knightStars!;
    for (let i = 0; i < 14 * fps && b.phase === 'enemy'; i++) advanceSnowAttack(b, hp, 1 / fps, () => 0);
    assert.equal(attack.waves, 5);
    assert.equal(attack.explosions, 10);
    assert.equal(b.phase, 'kris');
    assert.equal(b.snowAttack, null);
    assert.equal(b.soul, null);
    assert.deepEqual(hp, party());
    const result = [20000 - b.knightEnemies!.roaring.hp, 30000 - b.knightEnemies!.kaizo.hp];
    assert.ok(result.every((n) => n > 0 && n % 5 === 0));
    losses.push(result);
  }
  assert.deepEqual(losses[0], losses[1]);
  assert.deepEqual(losses[1], losses[2]);
});
test('star fragment hits honor owner damage, defense, invincibility, cooldown, and fallen party members', () => {
  for (const [owner, damage] of [
    ['roaring', 40],
    ['kaizo', 50],
  ] as const) {
    for (const invincible of [false, true]) {
      const b = createKnightEncounter(),
        hp = party();
      useDarkAct(b, hp);
      defend(b);
      b.enemyAttackCount = 2;
      b.invincible = invincible;
      startNextEnemyAttack(b, '');
      const a = b.snowAttack!.knightStars!;
      a.waves = starburstSettings.waves;
      a.fragments.push({
        id: 0,
        owner,
        hitOpponent: false,
        active: true,
        radius: 5,
        ...b.soul!,
        origin: { ...b.soul! },
        vx: 0,
        vy: 0,
        born: 0,
      });
      hp.Kris = 0;
      advanceSnowAttack(b, hp, 1 / 60, () => 0);
      assert.equal(hp.Flowey, invincible ? 100 : 100 - Math.round(damage * 0.75 * 0.5));
      const after = hp.Flowey;
      advanceSnowAttack(b, hp, 1 / 60, () => 0);
      assert.equal(hp.Flowey, after);
      assert.equal(hp.Kris, 0);
    }
  }
});
test('star grazing and damage use the same radius and destroyed shots cannot hurt or graze again', () => {
  const b = createKnightEncounter();
  b.enemyAttackCount = 2;
  startNextEnemyAttack(b, '');
  const a = b.snowAttack!.knightStars!;
  const shot = {
    id: 0,
    owner: 'roaring' as const,
    active: true,
    hitOpponent: false,
    radius: 5,
    x: b.soul!.x + 22,
    y: b.soul!.y,
    origin: { ...b.soul! },
    vx: 0,
    vy: 0,
    born: 0,
  };
  a.fragments.push(shot);
  assert.equal(starTouchesSoul(shot, b.soul!), false);
  assert.equal(isGrazingHazard(b, battleSettings, battleArena), true);
  assert.equal(hitOpposingKnight(b, shot), 5);
  assert.equal(hitOpposingKnight(b, shot), 0);
  assert.equal(isGrazingHazard(b, battleSettings, battleArena), false);
});
test('defeated owners stop casting while their already-cast stars still produce six fragments', () => {
  const a = createStarbursts(battleArena);
  advanceStarbursts(a, 0.8);
  advanceStarbursts(a, 1.71, (owner) => owner === 'kaizo');
  assert.equal(a.explosions, 2);
  assert.equal(a.fragments.filter((s) => s.owner === 'roaring').length, 6);
  advanceStarbursts(a, 0.1, (owner) => owner === 'kaizo');
  assert.equal(a.stars.filter((s) => s.owner === 'roaring').length, 1);
  assert.equal(a.stars.filter((s) => s.owner === 'kaizo').length, 2);
});
