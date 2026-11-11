import { fillTPForTesting, requestSpecialAttack } from '../../../tests/fixtures/combat-tools.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { canUseBattleAction } from '../shared/availability.ts';
import {
  advanceBattleTime,
  attackEnemy,
  createEncounter,
  defend,
  friendlynessPellets,
  startKrisTurn,
} from '../shared/rules.ts';
import { attackState } from '../shared/test-state.ts';
import { pelletsDuration, pelletsFrame, pelletsImpactTime } from './pellets.ts';

function floweyTurn() {
  const b = createEncounter(),
    hp = freshPartyHP();
  startKrisTurn(b);
  defend(b);
  b.tp = 90;
  hp.Flowey = 20;
  return { b, hp };
}

test('Friendlyness Pellets reserves TP and healing once, deals damage on impact, then waits for the recoil', () => {
  const { b, hp } = floweyTurn();
  assert.equal(friendlynessPellets(b, hp), true);
  assert.equal(b.tp, 0);
  assert.equal(hp.Flowey, 55);
  assert.equal(b.enemy.hp, 3000);
  assert.equal(b.phase, 'pellets');
  assert.equal(b.snowAttack, null);
  advanceBattleTime(b, pelletsImpactTime - 0.001);
  assert.equal(b.enemy.hp, 3000);
  assert.equal(b.pelletsCast!.impacted, false);
  advanceBattleTime(b, 0.001);
  assert.equal(b.enemy.hp, 2850);
  assert.equal(b.hitDamage, 150);
  assert.equal(b.hitActor, 'Flowey');
  assert.equal(b.hitAge, 0);
  assert.equal(b.phase, 'pellets');
  advanceBattleTime(b, 0.25);
  assert.equal(b.enemy.hp, 2850);
  assert.equal(b.phase, 'pellets');
  advanceBattleTime(b, 0.25);
  assert.equal(b.enemy.hp, 2850);
  assert.equal(b.phase, 'enemy');
  assert.equal(attackState(b).direction, 'down');
  assert.equal(b.pelletsCast, null);
  assert.equal(hp.Flowey, 55);
  assert.equal(b.tp, 0);
});

test('pellet casting cannot be interrupted, double-cast, or bypassed with a party action or testing shortcut', () => {
  const { b, hp } = floweyTurn();
  friendlynessPellets(b, hp);
  const snapshot = structuredClone(b);
  assert.equal(friendlynessPellets(b, hp), false);
  assert.equal(attackEnemy(b), false);
  assert.equal(defend(b), false);
  assert.equal(fillTPForTesting(b), false);
  assert.equal(requestSpecialAttack(b), false);
  assert.equal(startKrisTurn(b), false);
  for (const action of ['attack', 'act', 'item', 'defend'] as const)
    assert.equal(canUseBattleAction(b, action), false);
  assert.deepEqual(b, snapshot);
  assert.equal(hp.Flowey, 55);
});

test('base and fast-kill pellets preserve the 1 HP floor and start Snowgrave only after the animation', () => {
  for (const [fastKill, enemyHP, damage] of [
    [false, 100, 99] as const,
    [true, 2000, 1000] as const,
    [true, 500, 499] as const,
  ]) {
    const { b, hp } = floweyTurn();
    b.fastKill = fastKill;
    b.enemy.hp = enemyHP;
    friendlynessPellets(b, hp);
    advanceBattleTime(b, pelletsImpactTime);
    assert.equal(b.hitDamage, damage);
    assert.equal(b.enemy.hp, enemyHP - damage);
    assert.equal(b.phase, 'pellets');
    assert.equal(b.snowAttack, null);
    advanceBattleTime(b, pelletsDuration - pelletsImpactTime);
    assert.equal(attackState(b).direction, enemyHP - damage === 1 ? 'snowgrave' : 'goal');
    assert.equal(b.enemy.hp, enemyHP - damage);
    assert.equal(hp.Flowey, 55);
  }
});

test('the white ring travels from Flowey to surround Noelle before closing; reduced motion keeps a still target ring', () => {
  const start = pelletsFrame(0.2),
    travel = pelletsFrame(0.7),
    surround = pelletsFrame(1),
    close = pelletsFrame(1.29);
  assert.equal(start.x, 178);
  assert.ok(travel.x > 178 && travel.x < 528);
  assert.equal(surround.x, 528);
  assert.equal(surround.y, 192);
  assert.equal(surround.radius, 76);
  assert.ok(close.radius < 10);
  for (const age of [0.2, 0.7, 1, 1.29]) {
    const still = pelletsFrame(age, true);
    assert.equal(still.x, 528);
    assert.equal(still.y, 192);
    assert.equal(still.radius, 76);
    assert.equal(still.rotation, 0);
  }
});
