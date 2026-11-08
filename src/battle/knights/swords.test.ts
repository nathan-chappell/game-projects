import { edgeMiniVolley } from './crossing-swords.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createKnightEncounter } from './introduction.ts';
import { hitOpposingKnight, type KnightProjectile } from './projectiles.ts';
import {
  advanceKnightSwords,
  createKnightSwords,
  knightSwordLane,
  knightSwordSettings,
  knightSwordWarning,
} from './swords.ts';
import {
  advanceBattleTime,
  advanceSnowAttack,
  defend,
  moveSoul,
  spareInDark,
  startNextEnemyAttack,
  useDarkAct,
} from '../shared/rules.ts';
import { battleArena, battleSettings } from '../shared/settings.ts';
import { isGrazingHazard } from '../shared/graze.ts';

const party = () => ({ Kris: 100, Flowey: 100, Susie: 100, Ralsey: 100 });
test('owned projectiles deal opposing-knight damage once, independently of selected target and party defense', () => {
  const b = createKnightEncounter();
  b.projectileDamageMultiplier = 0.1;
  b.knightTarget = 'kaizo';
  b.enemy = b.knightEnemies!.kaizo;
  for (const [owner, target, amount] of [
    ['roaring', 'kaizo', 5],
    ['kaizo', 'roaring', 5],
  ] as const) {
    const shot: KnightProjectile = { owner, hitOpponent: false };
    const before = b.knightEnemies![target].hp;
    assert.equal(hitOpposingKnight(b, shot), amount);
    assert.equal(hitOpposingKnight(b, shot), 0);
    assert.equal(b.knightEnemies![target].hp, before - amount);
    assert.equal(b.turn, 'Kris');
    b.knightEnemies![target].hp = 3;
    assert.equal(hitOpposingKnight(b, { owner, hitOpponent: false }), 3);
    assert.equal(b.knightEnemies![target].hp, 0);
  }
});
test('the first wave warns, launches both colors at 600 px/s and leaves a soul-sized gap', () => {
  const attack = createKnightSwords(battleArena);
  advanceKnightSwords(attack, 0.4);
  assert.equal(knightSwordWarning(attack).length, 5);
  assert.equal(attack.swords.length, 0);
  advanceKnightSwords(attack, 0.5);
  assert.equal(attack.swords.length, 10);
  assert.equal(attack.swords.filter((s) => s.owner === 'roaring').length, 5);
  assert.equal(attack.swords.filter((s) => s.owner === 'kaizo').length, 5);
  const black = attack.swords[0],
    white = attack.swords[5];
  const x = black.x,
    wx = white.x;
  advanceKnightSwords(attack, 0.1);
  assert.ok(Math.abs(black.x - x - 60) < 1e-6);
  assert.ok(Math.abs(wx - white.x - 60) < 1e-6);
  assert.ok(!attack.swords.some((s) => s.y === knightSwordLane(attack, 2)));
  const gap = ((battleArena.size - 30) / (knightSwordSettings.lanes - 1)) * 2 - 32;
  assert.ok(gap > battleSettings.soulHeight + 20);
});
test('opponents take all twelve volleys at 30/60/144 FPS and control returns to Kris', () => {
  const totals: number[][] = [];
  for (const fps of [30, 60, 144]) {
    const b = createKnightEncounter(),
      hp = party();
    b.invincible = true;
    startNextEnemyAttack(b, '');
    for (let i = 0; i < fps * 13 && b.phase === 'enemy'; i++) {
      advanceBattleTime(b, 1 / fps, hp);
      advanceSnowAttack(b, hp, 1 / fps, () => 0);
    }
    const damage = [20000 - b.knightEnemies!.roaring.hp, 30000 - b.knightEnemies!.kaizo.hp];
    assert.ok(damage.every((n) => n >= 12 * 5 * 5 && n <= 12 * 5 * 5 + 12 * 3 * 5 && n % 5 === 0));
    totals.push(damage);
    assert.equal(b.phase, 'kris');
    assert.equal(b.snowAttack, null);
    assert.equal(b.soul, null);
    assert.equal(b.projectileDamageMultiplier, 1);
  }
  assert.deepEqual(totals[0], totals[1]);
  assert.deepEqual(totals[1], totals[2]);
});
test('black and white sword hits deal 40/50 with cooldown, and honor Hold Breath, Defend and fallen allies', () => {
  for (const [owner, base] of [
    ['roaring', 40],
    ['kaizo', 50],
  ] as const) {
    for (const mode of ['normal', 'breath', 'defend', 'both'] as const) {
      const b = createKnightEncounter(),
        hp = party();
      if (mode === 'breath' || mode === 'both') useDarkAct(b, hp);
      if (mode === 'defend' || mode === 'both') defend(b);
      startNextEnemyAttack(b, '');
      const attack = b.snowAttack!.knightSwords!;
      attack.age = 0.95;
      attack.waves = 1;
      const launch = attack.age - Math.abs(320 - (owner === 'roaring' ? 150 : 490)) / 600;
      attack.swords.push({ id: 0, x: 320, y: b.soul!.y, owner, launch, active: true, hitOpponent: false });
      hp.Kris = 0;
      const multiplier =
        (mode === 'breath' || mode === 'both' ? 0.75 : 1) * (mode === 'defend' || mode === 'both' ? 0.5 : 1);
      advanceSnowAttack(b, hp, 1 / 60, () => 0);
      assert.equal(hp.Flowey, 100 - Math.round(base * multiplier));
      assert.equal(hp.Kris, 0);
      advanceSnowAttack(b, hp, 1 / 60, () => 0);
      assert.equal(hp.Flowey, 100 - Math.round(base * multiplier));
    }
  }
});
test('soul movement, TP grazing and a reachable changing safe lane work together', () => {
  const b = createKnightEncounter(),
    hp = party();
  useDarkAct(b, hp);
  for (let i = 0; i < 3; i++) spareInDark(b);
  assert.equal(b.snowAttack?.direction, 'knightSwords');
  assert.equal(b.projectileDamageMultiplier, 0.75);
  const before = b.soul!.x;
  moveSoul(b, new Set(['right']), 0.1);
  assert.equal(b.soul!.x, before + 15);
  const attack = b.snowAttack!.knightSwords!;
  attack.swords.push({
    id: 1,
    owner: 'roaring',
    hitOpponent: false,
    x: b.soul!.x,
    y: b.soul!.y + 34,
    launch: 0,
    active: true,
  });
  assert.equal(isGrazingHazard(b, battleSettings, battleArena), true);
  // Isolate the large-sword lanes here; aimed minis require moving away from the warned position.
  const route = createKnightEncounter();
  const routeHP = party();
  startNextEnemyAttack(route, '');
  route.snowAttack!.knightSwords!.miniWaves = knightSwordSettings.waves;
  const gaps = [2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5];
  route.soul!.y = knightSwordLane(route.snowAttack!.knightSwords!, gaps[0]);
  for (let frame = 0; frame < 12 * 60 && route.phase === 'enemy'; frame++) {
    const a = route.snowAttack!.knightSwords!;
    const previous = Math.max(0, a.waves - 1);
    const index = a.age > 0.9 + previous * 0.85 + 0.48 ? Math.min(11, a.waves) : previous;
    const target = knightSwordLane(a, gaps[index]);
    if (Math.abs(target - route.soul!.y) > 2.5)
      moveSoul(route, new Set([target < route.soul!.y ? 'up' : 'down']), 1 / 60);
    advanceSnowAttack(route, routeHP, 1 / 60, () => 0);
  }
  assert.deepEqual(routeHP, hp);
});
test('defeated knights stop launching and projectiles still in flight can finish the encounter', () => {
  const b = createKnightEncounter(),
    hp = party();
  b.invincible = true;
  b.knightEnemies!.roaring.hp = 0;
  b.knightEnemies!.kaizo.hp = 5;
  startNextEnemyAttack(b, '');
  const a = b.snowAttack!.knightSwords!;
  a.swords.push({ id: 0, owner: 'roaring', x: 490, y: 160, launch: -1, active: true, hitOpponent: false });
  advanceSnowAttack(b, hp, 1 / 60, () => 0);
  assert.equal(b.phase, 'victory');
  assert.equal(b.knightEnemies!.kaizo.hp, 0);
  assert.equal(b.snowAttack, null);
  assert.equal(b.finalAttackPending, false);
  const model = createKnightSwords(battleArena);
  advanceKnightSwords(model, 1, (owner) => owner !== 'roaring');
  assert.ok(model.swords.every((shot) => shot.owner === 'kaizo'));
});

test('the first attack warns and fires three aimed mini swords with each large-sword wave', () => {
  const a = createKnightSwords(battleArena);
  const target = { x: 300, y: 180 };
  advanceKnightSwords(a, 0.4, () => true, target);
  assert.equal(a.miniWarnings.length, 3);
  const angles = a.miniWarnings.map((s) => s.angle);
  assert.ok(a.miniWarnings.every((s) => !s.active && s.scale === 0.4 && s.launch === 0.9));
  advanceKnightSwords(a, 0.1, () => true, { x: 400, y: 230 });
  assert.deepEqual(
    a.miniWarnings.map((s) => s.angle),
    angles,
  );
  advanceKnightSwords(a, 0.4, () => true, { x: 400, y: 230 });
  assert.equal(a.minis.length, 3);
  assert.equal(a.miniWarnings.length, 0);
  assert.deepEqual(
    a.minis.map((s) => s.angle),
    angles,
  );
  assert.ok(a.minis.every((s) => s.active && s.speed === 340));
  assert.equal(new Set(a.minis.map((s) => s.owner)).size, 2);
});

test('first-attack minis damage the party and award near-miss TP through their scaled hitboxes', () => {
  for (const [owner, damage] of [
    ['roaring', 40],
    ['kaizo', 50],
  ] as const) {
    const b = createKnightEncounter(),
      hp = party();
    startNextEnemyAttack(b, '');
    const a = b.snowAttack!.knightSwords!;
    a.waves = a.miniWaves = knightSwordSettings.waves;
    a.age = 1;
    const shot = edgeMiniVolley(a, 0, b.soul!)[0];
    shot.owner = owner;
    shot.active = true;
    shot.launch = 1;
    shot.angle = 0;
    shot.origin = { x: b.soul!.x - 340 / 60, y: b.soul!.y };
    shot.x = shot.origin.x;
    shot.y = shot.origin.y;
    a.minis = [shot];
    advanceSnowAttack(b, hp, 1 / 60, () => 0);
    assert.equal(hp.Kris, 100 - damage);
    shot.x = b.soul!.x + 7;
    shot.y = b.soul!.y + 22;
    assert.equal(isGrazingHazard(b, battleSettings, battleArena), true);
  }
});
