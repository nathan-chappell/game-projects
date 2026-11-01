import assert from 'node:assert/strict';
import test from 'node:test';
import { freshInventory, freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { partyStatusSettings, syncPartyStatus } from './party-status.ts';
import {
  advanceBattleTime,
  advanceSnowAttack,
  attackEnemy,
  createEncounter,
  skipFallenTurns,
  startKrisTurn,
  useBattleItem,
} from './rules.ts';
import { attackState } from './test-state.ts';

function enemyTurn() {
  const b = createEncounter();
  startKrisTurn(b);
  attackEnemy(b);
  attackEnemy(b);
  attackState(b).nextWaveIn = 100;
  return b;
}

for (const target of ['Kris', 'Flowey'] as const) {
  test(`${target} starts collapsing on lethal damage, stays down across turns and is not restarted by subsequent hits`, () => {
    const b = enemyTurn(),
      hp = freshPartyHP(),
      other = target === 'Kris' ? 'Flowey' : 'Kris';
    hp[target] = 10;
    attackState(b).balls = [{ ...present(b.soul), velocity: 0, hit: false }];
    advanceSnowAttack(b, hp, 0.001, () => (target === 'Kris' ? 0 : 0.99));
    assert.equal(hp[target], 0);
    assert.equal(b.partyStatus[target].mode, 'down');
    assert.equal(b.partyStatus[target].age, 0);
    assert.equal(b.partyStatus[other].mode, 'up');
    assert.equal(hp[other], 100);
    advanceBattleTime(b, 0.3, hp);
    assert.equal(b.partyStatus[target].age, 0.3);
    attackState(b).hitCooldown = 0;
    attackState(b).balls = [{ ...present(b.soul), velocity: 0, hit: false }];
    advanceSnowAttack(b, hp, 0.001, () => 0);
    assert.equal(hp[target], 0);
    assert.equal(hp[other], 85);
    assert.equal(b.partyStatus[target].age, 0.3);
    advanceBattleTime(b, 2, hp);
    assert.equal(b.partyStatus[target].age, partyStatusSettings.collapseSeconds);
    startKrisTurn(b, hp);
    skipFallenTurns(b, hp);
    assert.equal(b.turn, other === 'Kris' ? 'Kris' : 'Flowey');
    assert.equal(b.partyStatus[target].mode, 'down');
    advanceBattleTime(b, 10, hp);
    assert.equal(b.partyStatus[target].mode, 'down');
  });

  test(`${target} revives through G. Candy with a separate rise effect and can collapse again later`, () => {
    const b = enemyTurn(),
      hp = freshPartyHP(),
      bag = freshInventory();
    hp[target] = 0;
    syncPartyStatus(b, hp);
    advanceBattleTime(b, 2, hp);
    startKrisTurn(b, hp);
    skipFallenTurns(b, hp);
    bag.items.gCandy = 1;
    assert.equal(useBattleItem(b, hp, bag, 'gCandy', target, () => 0)!.restored, 35);
    assert.equal(b.partyStatus[target].mode, 'reviving');
    assert.equal(b.partyStatus[target].age, 0);
    advanceBattleTime(b, partyStatusSettings.reviveSeconds, hp);
    assert.equal(b.partyStatus[target].mode, 'up');
    assert.equal(b.partyStatus[target].age, 0);
    hp[target] = 0;
    syncPartyStatus(b, hp);
    assert.equal(b.partyStatus[target].mode, 'down');
    assert.equal(b.partyStatus[target].age, 0);
  });
}

test('Snowgrave healing revives both downed teammates and fresh encounters have independent animation state', () => {
  const b = enemyTurn(),
    hp = freshPartyHP();
  hp.Kris = hp.Flowey = 0;
  syncPartyStatus(b, hp);
  attackState(b).direction = 'snowgrave';
  startKrisTurn(b, hp);
  assert.equal(hp.Kris, 50);
  assert.equal(hp.Flowey, 50);
  assert.equal(b.partyStatus.Kris.mode, 'reviving');
  assert.equal(b.partyStatus.Flowey.mode, 'reviving');
  const first = createEncounter(),
    second = createEncounter();
  first.partyStatus.Kris.mode = 'down';
  assert.equal(second.partyStatus.Kris.mode, 'up');
  assert.equal(second.partyStatus.Flowey.mode, 'up');
});

for (const target of ['Susie', 'Ralsey'] as const) {
  test(`${target} collapses once in the four-person battle and rises after healing`, async () => {
    const { createTennaEncounter } = await import('../../rooms/backstage/tenna-finale.ts');
    const b = createTennaEncounter(),
      hp = freshPartyHP(),
      bag = freshInventory();
    hp[target] = 0;
    syncPartyStatus(b, hp);
    assert.equal(b.partyStatus[target].mode, 'down');
    advanceBattleTime(b, 0.5, hp);
    const age = b.partyStatus[target].age;
    syncPartyStatus(b, hp);
    assert.equal(b.partyStatus[target].age, age);
    bag.items.gCandy = 1;
    assert.equal(useBattleItem(b, hp, bag, 'gCandy', target, () => 0)!.restored, 35);
    assert.equal(b.partyStatus[target].mode, 'reviving');
    advanceBattleTime(b, partyStatusSettings.reviveSeconds, hp);
    assert.equal(b.partyStatus[target].mode, 'up');
  });
}
