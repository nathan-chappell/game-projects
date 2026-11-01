import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { createTennaEncounter } from '../../rooms/backstage/tenna-finale.ts';
import { advanceSnowAttack, defend, completeTennaCue, startNextEnemyAttack } from '../shared/rules.ts';
import { battleArena, battleSettings } from '../shared/settings.ts';
import { isGrazingHazard } from '../shared/graze.ts';
import { attackState } from '../shared/test-state.ts';
import { createTvBolts, advanceTvBolts, boltTouches, tvBoltSettings } from './tv-bolts.ts';
function encounter() {
  const b = createTennaEncounter();
  b.enemyAttackCount = 1;
  startNextEnemyAttack(b, '');
  return b;
}
test('Tenna opens with Helpers, follows with the TV and cycles back without borrowing other bosses’ attacks', () => {
  const b = createTennaEncounter();
  for (let n = 0; n < 4; n++) defend(b);
  assert.equal(b.phase, 'tennaCue');
  completeTennaCue(b);
  assert.equal(attackState(b).direction, 'saxophones');
  startNextEnemyAttack(b, '');
  assert.equal(attackState(b).direction, 'tvBolts');
  assert.equal(b.turn, 'Tenna');
  startNextEnemyAttack(b, '');
  assert.equal(b.phase, 'tennaCue');
  completeTennaCue(b);
  assert.equal(attackState(b).direction, 'saxophones');
  b.repeatAttack = true;
  b.lastEnemyAttack = 'tvBolts';
  startNextEnemyAttack(b, '');
  assert.equal(attackState(b).direction, 'tvBolts');
});
test('TV moves both directions, fires quickly, warns before bursts of exactly five, and finishes', () => {
  for (const fps of [30, 60, 144]) {
    const a = createTvBolts(battleArena, () => 0);
    let lastX = a.tvX,
      left = false,
      right = false,
      burst = false,
      warning = false,
      done = false;
    for (let n = 0; n < fps * 12 && !done; n++) {
      const oldBursts = a.bursts;
      done = advanceTvBolts(a, 1 / fps, () => 0);
      left ||= a.tvX < lastX;
      right ||= a.tvX > lastX;
      lastX = a.tvX;
      assert.ok(a.tvX >= battleArena.x + 24 && a.tvX <= battleArena.x + battleArena.size - 24);
      warning ||= a.burstAt !== null;
      if (a.bursts > oldBursts) {
        assert.equal(a.bolts.filter((b) => b.burst).length, 5);
        burst = true;
      }
      if (a.age < tvBoltSettings.warmup) assert.equal(a.bolts.length, 0);
    }
    assert.ok(left && right && warning && burst);
    assert.equal(done, true);
    assert.equal(a.bolts.length, 0);
  }
  const early = createTvBolts(battleArena, () => 0),
    late = createTvBolts(battleArena, () => 0.99);
  assert.notEqual(early.nextGlitch, late.nextGlitch);
});
test('TV hits living teammates for 30 with shared immunity, respects Defend and invincibility', () => {
  for (const [invincible, multiplier, hpAfter] of [
    [false, 1, 70],
    [false, 0.5, 85],
    [true, 1, 100],
  ] as const) {
    const b = encounter(),
      hp = freshPartyHP();
    hp.Kris = 0;
    b.invincible = invincible;
    b.projectileDamageMultiplier = multiplier;
    advanceSnowAttack(b, hp, 1, () => 0);
    const a = attackState(b).tvBolts!;
    b.soul = { x: a.bolts[0].x, y: a.bolts[0].y };
    advanceSnowAttack(b, hp, 1 / 60, () => 0);
    assert.equal(hp.Flowey, hpAfter);
    assert.equal(hp.Kris, 0);
    advanceSnowAttack(b, hp, 0.1, () => 0);
    assert.equal(hp.Flowey, hpAfter);
  }
});
test('bolt grazing matches damage geometry and the TV turn ends naturally', () => {
  const b = encounter(),
    hp = freshPartyHP();
  b.invincible = true;
  advanceSnowAttack(b, hp, 1, () => 0);
  const bolt = attackState(b).tvBolts!.bolts[0];
  b.soul = { x: bolt.x, y: bolt.y };
  assert.equal(boltTouches(bolt, b.soul), true);
  assert.equal(isGrazingHazard(b, battleSettings, battleArena), false);
  b.soul = { x: bolt.x - 25, y: bolt.y };
  assert.equal(boltTouches(bolt, b.soul), false);
  assert.equal(isGrazingHazard(b, battleSettings, battleArena), true);
  for (let i = 0; i < 12 * 60 && b.phase === 'enemy'; i++) advanceSnowAttack(b, hp, 1 / 60, () => 0);
  assert.equal(b.phase, 'kris');
  assert.equal(b.snowAttack, null);
});
