import assert from 'node:assert/strict';
import test from 'node:test';
import { createVesselEncounter } from './entrance.ts';
import {
  markVesselAttackCleared,
  nextVesselAttackIndex,
  beginClearedVesselScene,
  vesselAttackAvailable,
  vesselAttackPatterns,
} from './progression.ts';
import { advanceBattleTime, advanceSnowAttack, startNextEnemyAttack } from '../shared/rules.ts';
const hp = () => ({ Kris: 100, Flowey: 100, Susie: 100, Ralsey: 100 });

test('cleared attacks never return even if the round pointer or number selection points at them', () => {
  const b = createVesselEncounter();
  b.invincible = true;
  for (const number of [4, 2, 1, 3]) {
    b.enemyAttackCount = number - 1;
    startNextEnemyAttack(b, '');
    assert.equal(b.snowAttack?.vesselRain?.pattern, vesselAttackPatterns[number - 1]);
    advanceSnowAttack(b, hp(), 20, () => 0.37);
    assert.equal(vesselAttackAvailable(b, number), false);
    assert.ok(b.vesselClearedAttacks!.includes(number));
    if (number !== 3) {
      b.enemyAttackCount = number - 1;
      assert.notEqual(nextVesselAttackIndex(b), number - 1);
    }
  }
  assert.equal(b.phase, 'vesselTransfer');
  assert.equal(b.turn, null);
  assert.equal(b.soul, null);
  assert.equal(b.snowAttack, null);
  assert.equal(b.enemy.hp, 10000);
  advanceBattleTime(b, 10, hp());
  startNextEnemyAttack(b, '');
  assert.equal(b.phase, 'vesselEntered');
  assert.equal(nextVesselAttackIndex(b), undefined);
  assert.equal(b.finalAttackComplete, false);
  assert.deepEqual(createVesselEncounter().vesselClearedAttacks, []);
});

test('interrupted attacks stay available; explicit completion records a unique clear', () => {
  const b = createVesselEncounter();
  startNextEnemyAttack(b, '');
  startNextEnemyAttack(b, '');
  assert.deepEqual(b.vesselClearedAttacks, []);
  assert.equal(vesselAttackAvailable(b, 1), true);
  markVesselAttackCleared(b);
  markVesselAttackCleared(b);
  assert.deepEqual(b.vesselClearedAttacks, [2]);
  assert.equal(beginClearedVesselScene(b), false);
  assert.equal(vesselAttackAvailable(b, 0), false);
  assert.equal(vesselAttackAvailable(b, 5), false);
});
