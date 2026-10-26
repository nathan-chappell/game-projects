import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEncounter,
  startKrisTurn,
  attackEnemy,
  defend,
  projectileDamage,
  addTP,
  proceed,
  advanceBattleTime,
  useHealingItem,
  krisActions,
} from '../src/battle-rules.js';
import { freshInventory, freshPartyHP } from '../src/config.js';

const krisTurn = () => {
  const battle = createEncounter();
  startKrisTurn(battle);
  return battle;
};

test('Kris acts first and an attack deals 75 HP exactly once', () => {
  const battle = krisTurn();
  assert.equal(battle.turn, 'Kris');
  assert.equal(battle.enemy.name, '???');
  assert.equal(battle.enemy.hp, 1000);
  assert.equal(attackEnemy(battle), true);
  assert.equal(battle.enemy.hp, 925);
  assert.equal(battle.turn, 'Flowey');
  assert.equal(attackEnemy(battle), false);
  assert.equal(battle.enemy.hp, 925);
  assert.ok(!krisActions.includes('spare'));
});

test('Defend carries reduced damage into the future enemy turn', () => {
  const battle = krisTurn();
  assert.equal(defend(battle), true);
  assert.equal(battle.turn, 'Flowey');
  assert.equal(projectileDamage(battle, 10), 5);
  startKrisTurn(battle);
  assert.equal(projectileDamage(battle, 10), 10);
});

test('Proceed needs and spends 100 TP on each of three separate Kris turns', () => {
  const battle = krisTurn();
  addTP(battle, 99);
  assert.equal(proceed(battle), false);
  assert.equal(battle.tp, 99);
  assert.equal(battle.proceedCount, 0);
  for (let count = 1; count <= 3; count++) {
    addTP(battle, 150);
    assert.equal(battle.tp, 100);
    assert.equal(proceed(battle), true);
    assert.equal(battle.tp, 0);
    assert.equal(battle.proceedCount, count);
    assert.equal(proceed(battle), false);
    advanceBattleTime(battle, 1.2);
    if (count < 3) {
      assert.equal(battle.turn, 'Flowey');
      assert.equal(battle.enemy.visible, true);
      startKrisTurn(battle);
      assert.equal(proceed(battle), false);
    } else {
      assert.equal(battle.phase, 'vanishing');
      advanceBattleTime(battle, 0.6);
      assert.equal(battle.phase, 'victory');
      assert.equal(battle.enemy.visible, false);
      assert.equal(startKrisTurn(battle), false);
    }
  }
  assert.equal(createEncounter(true).enemy.visible, false);
});

test('healing uses real carried items, rolls 35–45, caps HP, and allows reviving', () => {
  const hp = freshPartyHP(),
    bag = freshInventory();
  hp.Kris = 10;
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris'), null);
  bag.items.gCandy = 3;
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris', () => 0).restored, 35);
  assert.equal(hp.Kris, 45);
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris', () => 0.999).restored, 45);
  assert.equal(hp.Kris, 90);
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris', () => 0.999).restored, 10);
  assert.equal(hp.Kris, 100);
  bag.items.gCandy = 1;
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Kris'), null);
  assert.equal(bag.items.gCandy, 1);
  hp.Flowey = 0;
  assert.equal(useHealingItem(hp, bag, 'gCandy', 'Flowey', () => 0).restored, 35);
  assert.equal(bag.items.gCandy, 0);
});
