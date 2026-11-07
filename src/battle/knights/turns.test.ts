import assert from 'node:assert/strict';
import test from 'node:test';
import { createKnightEncounter } from './introduction.ts';
import { darkActInfo } from '../dark/dark-acts.ts';
import { battlePartyNames, canUseBattleAction } from '../shared/availability.ts';
import { projectileDamage } from '../shared/resources.ts';
import {
  advanceBattleTime,
  attackEnemy,
  defend,
  skipFallenTurns,
  spareInDark,
  startKrisTurn,
  useBattleItem,
  useDarkAct,
} from '../shared/rules.ts';
import { pelletsDuration } from '../noelle/pellets.ts';

const hp = () => ({ Kris: 100, Flowey: 50, Susie: 100, Ralsey: 100 });
test('knight battle has four party turns and separate 20000/30000 HP opponents', () => {
  const b = createKnightEncounter();
  assert.deepEqual(battlePartyNames(b), ['Kris', 'Flowey', 'Susie', 'Ralsey']);
  assert.equal(b.knightEnemies?.roaring.maxHP, 20000);
  assert.equal(b.knightEnemies?.kaizo.maxHP, 30000);
  assert.equal(b.enemy, b.knightEnemies?.roaring);
  for (const name of battlePartyNames(b)) {
    assert.equal(b.turn, name);
    assert.equal(canUseBattleAction(b, 'attack'), true);
    defend(b);
  }
  assert.equal(b.phase, 'enemy');
  assert.equal(b.tp, 40);
  assert.equal(b.snowAttack, null, 'no borrowed enemy pattern starts before knight attacks are designed');
});
test('Hold Breath is free, protects the whole team for one enemy turn, and stacks with Defend', () => {
  const b = createKnightEncounter();
  assert.equal(darkActInfo(b).cost, 0);
  assert.equal(useDarkAct(b, hp()), true);
  assert.equal(b.turn, 'Flowey');
  assert.equal(b.tp, 0);
  assert.equal(projectileDamage(b, 100), 75);
  defend(b);
  assert.equal(projectileDamage(b, 80), 30);
  spareInDark(b);
  spareInDark(b);
  assert.equal(b.phase, 'enemy');
  assert.equal(b.holdBreath, true);
  startKrisTurn(b);
  assert.equal(b.holdBreath, false);
  assert.equal(projectileDamage(b, 100), 100);
});
test('existing ACTs keep their TP costs, effects, and four-member turn order', () => {
  const b = createKnightEncounter(),
    party = hp();
  b.tp = 100;
  useDarkAct(b, party);
  assert.equal(darkActInfo(b).cost, 65);
  assert.equal(useDarkAct(b, party), true);
  assert.equal(b.tp, 35);
  assert.equal(party.Flowey, 85);
  advanceBattleTime(b, pelletsDuration + 0.01, party);
  assert.equal(b.turn, 'Susie');
  assert.equal(b.enemy.hp, 19970);
  const before = b.enemy.hp;
  assert.equal(useDarkAct(b, party), false);
  assert.equal(b.enemy.hp, before);
  b.tp = 100;
  assert.equal(
    useDarkAct(b, party, () => 0),
    true,
  );
  assert.equal(b.tp, 30);
  assert.equal(b.enemy.hp, before - 30);
  assert.equal(b.turn, 'Ralsey');
  b.tp = 100;
  assert.equal(darkActInfo(b).cost, 50);
  assert.equal(
    useDarkAct(b, party, () => 0),
    true,
  );
  assert.equal(b.tp, 50);
  assert.equal(party.Flowey, 100);
  assert.equal(b.phase, 'enemy');
});
test('all four basic attacks deal 20 to Roaring Knight and 10 to Kaizo Knight', () => {
  for (const [target, damage] of [
    ['roaring', 20],
    ['kaizo', 10],
  ] as const) {
    const b = createKnightEncounter();
    b.knightTarget = target;
    b.enemy = b.knightEnemies![target];
    for (const name of ['Kris', 'Flowey', 'Susie', 'Ralsey']) {
      assert.equal(b.turn, name);
      const before = b.enemy.hp;
      assert.equal(attackEnemy(b), true);
      assert.equal(b.enemy.hp, before - damage);
      assert.equal(b.hitDamage, damage);
    }
    const other = target === 'roaring' ? 'kaizo' : 'roaring';
    assert.equal(b.knightEnemies![other].hp, b.knightEnemies![other].maxHP);
    assert.equal(b.finalAttackPending, false);
    assert.equal(b.phase, 'enemy');
  }
});
test('Flowey and Susie ACTs deal fixed target damage and preserve TP costs and healing', () => {
  for (const [target, damage] of [
    ['roaring', 30],
    ['kaizo', 20],
  ] as const) {
    const b = createKnightEncounter(),
      party = hp();
    b.knightTarget = target;
    b.enemy = b.knightEnemies![target];
    useDarkAct(b, party);
    b.tp = 100;
    assert.match(darkActInfo(b).description, new RegExp(`Deal ${damage} damage`));
    const before = b.enemy.hp;
    useDarkAct(b, party);
    advanceBattleTime(b, pelletsDuration + 0.01, party);
    assert.equal(b.enemy.hp, before - damage);
    assert.equal(party.Flowey, 85);
    assert.equal(b.tp, 35);
    b.tp = 100;
    assert.match(darkActInfo(b).description, new RegExp(`Deal ${damage} damage`));
    // Rude Buster no longer varies with its random roll in this battle.
    useDarkAct(b, party, () => 0.999);
    assert.equal(b.enemy.hp, before - damage * 2);
    assert.equal(b.tp, 30);
    assert.equal(b.turn, 'Ralsey');
  }
});
test('fallen party members are skipped and healing items still consume their user’s turn', () => {
  const b = createKnightEncounter(),
    party = { ...hp(), Flowey: 0, Susie: 0 };
  useDarkAct(b, party);
  assert.equal(skipFallenTurns(b, party), true);
  assert.equal(b.turn, 'Ralsey');
  const inventory = { items: { gCandy: 0, tpElixir: 1, jackCandy: 0 } };
  const result = useBattleItem(b, party, inventory, 'tpElixir', 'Kris');
  assert.equal(result?.tpGained, 15);
  assert.equal(inventory.items.tpElixir, 0);
  assert.equal(b.nextAttackGrazeTP, 4);
  assert.equal(b.phase, 'enemy');
});
