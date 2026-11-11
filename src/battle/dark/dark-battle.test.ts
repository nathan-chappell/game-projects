import { requestSpecialAttack } from '../../../tests/fixtures/combat-tools.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { freshInventory, freshPartyHP } from '../../game/config.ts';
import { battlePartyNames, canUseBattleAction } from '../shared/availability.ts';
import {
  advanceSnowAttack,
  attackEnemy,
  defend,
  friendlynessPellets,
  listenInDark,
  proceed,
  useBattleItem,
} from '../shared/rules.ts';
import { attackState } from '../shared/test-state.ts';
import { createDarkEncounter } from './dark-battle.ts';
import { swordSettings } from './swords.ts';
test('all four initial party turns lock Attack and expose ACT menus, items and Defend without Noelle routes', () => {
  const b = createDarkEncounter(),
    hp = freshPartyHP();
  for (const actor of ['Kris', 'Flowey', 'Susie', 'Ralsey'] as const) {
    assert.equal(b.turn, actor);
    assert.equal(canUseBattleAction(b, 'attack'), false);
    assert.equal(attackEnemy(b), false);
    assert.equal(proceed(b), false);
    assert.equal(friendlynessPellets(b, hp), false);
    assert.equal(requestSpecialAttack(b), false);
    for (const action of ['act', 'item', 'defend'] as const)
      assert.equal(canUseBattleAction(b, action), true);
    assert.equal(listenInDark(b), true);
  }
  assert.equal(b.phase, 'enemy');
  assert.equal(attackState(b).direction, 'dark');
  assert.equal(attackState(b).grazeTP, 1);
  b.invincible = true;
  advanceSnowAttack(b, hp, 12);
  assert.equal(b.turn, 'Kris');
  assert.deepEqual(hp, freshPartyHP());
});
test('a TP Elixir grants only five TP and cannot raise grazing above one TP', () => {
  const b = createDarkEncounter(),
    hp = freshPartyHP(),
    bag = freshInventory();
  bag.items.tpElixir = 2;
  const item = useBattleItem(b, hp, bag, 'tpElixir', 'Kris');
  assert.equal(item!.tpGained, 5);
  assert.equal(b.nextAttackGrazeTP, null);
  assert.equal(bag.items.tpElixir, 1);
  defend(b);
  listenInDark(b);
  listenInDark(b);
  assert.equal(attackState(b).grazeTP, 1);
  const before = b.tp;
  attackState(b).balls = [{ x: b.soul!.x + 30, y: b.soul!.y, radius: 10 }];
  advanceSnowAttack(b, hp, 0.01);
  assert.equal(b.tp, before + 1);
  advanceSnowAttack(b, hp, 0.5);
  assert.equal(b.tp, before + 2);
});

test('Spare is usable for all four dark-battle turns and advances to the enemy without ending the fight', async () => {
  const { spareInDark } = await import('../shared/rules.ts');
  const b = createDarkEncounter();
  for (const name of ['Kris', 'Flowey', 'Susie', 'Ralsey'] as const) {
    assert.equal(b.turn, name);
    assert.equal(canUseBattleAction(b, 'spare'), true);
    assert.equal(spareInDark(b), true);
    assert.match(b.message, /tried to spare/);
  }
  assert.equal(b.phase, 'enemy');
  assert.equal(spareInDark(b), false);
});
test('downed dark-battle members are skipped while a surviving Susie or Ralsey can still act', async () => {
  const { skipFallenTurns } = await import('../shared/rules.ts');
  const b = createDarkEncounter(),
    hp = { Kris: 0, Flowey: 0, Susie: 0, Ralsey: 40 };
  assert.equal(skipFallenTurns(b, hp), true);
  assert.equal(b.turn, 'Ralsey');
  assert.equal(canUseBattleAction(b, 'item'), true);
  assert.equal(
    battlePartyNames(b).every((n) => hp[n] <= 0),
    false,
  );
  listenInDark(b);
  attackState(b).swords!.motion = -1;
  attackState(b).swords!.swords = [
    { id: 100, y: b.soul!.y, launch: -167 / swordSettings.speed, active: true, x: 320 },
  ];
  advanceSnowAttack(b, hp, 0.01, () => 0);
  assert.equal(hp.Ralsey, 25);
  assert.equal(hp.Susie, 0);
  assert.equal(b.partyStatus.Ralsey.mode, 'up');
});
