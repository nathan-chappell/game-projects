import assert from 'node:assert/strict';
import test from 'node:test';
import { battlePartyNames, canUseBattleAction } from '../../battle/shared/availability.ts';
import {
  attackEnemy,
  completeTennaCut,
  defend,
  proceed,
  requestSpecialAttack,
  spareInDark,
} from '../../battle/shared/rules.ts';
import { createTennaEncounter, finaleConversation } from './tenna-finale.ts';
test('the Finale introduces fighting Tenna with all four party turns', () => {
  assert.ok(finaleConversation.some((l) => /fighting ME/.test(l.text)));
  const b = createTennaEncounter();
  assert.equal(b.enemy.name, 'Tenna');
  assert.equal(b.score, 0);
  assert.equal(b.kind, 'tenna');
  assert.equal(b.turn, 'Kris');
  assert.deepEqual(battlePartyNames(b), ['Kris', 'Flowey', 'Susie', 'Ralsey']);
  for (const name of battlePartyNames(b)) {
    assert.equal(b.turn, name);
    assert.equal(canUseBattleAction(b, 'attack'), true);
    defend(b);
  }
  assert.equal(b.turn, 'Tenna');
  assert.equal(b.phase, 'tennaCue');
  assert.equal(b.snowAttack, null);
  assert.equal(b.tp, 40);
});
test('TV TIME is available and does absolutely nothing for every party member', () => {
  const b = createTennaEncounter();
  for (const name of battlePartyNames(b)) {
    assert.equal(b.turn, name);
    assert.equal(canUseBattleAction(b, 'spare'), true);
    const before = structuredClone(b);
    assert.equal(spareInDark(b), true);
    assert.deepEqual(b, before);
    defend(b);
  }
});
test('even lethal damage to Tenna triggers a cut and full heal instead of victory', () => {
  const b = createTennaEncounter();
  assert.equal(proceed(b), false);
  assert.equal(requestSpecialAttack(b), false);
  b.enemy.hp = 1;
  assert.equal(attackEnemy(b), true);
  assert.equal(b.enemy.hp, 0);
  assert.equal(b.phase, 'tennaCut');
  assert.equal(completeTennaCut(b), true);
  assert.equal(b.enemy.hp, b.enemy.maxHP);
  assert.equal(b.turn, 'Flowey');
  assert.equal(b.finalAttackPending, false);
});

test('every party attack gives Tenna his line before healing and advancing the correct turn', () => {
  const b = createTennaEncounter();
  b.score = 260;
  for (const [name, damage, next] of [
    ['Kris', 75, 'Flowey'],
    ['Flowey', 80, 'Susie'],
    ['Susie', 150, 'Ralsey'],
    ['Ralsey', 60, 'Tenna'],
  ] as const) {
    assert.equal(b.turn, name);
    assert.equal(attackEnemy(b), true);
    assert.equal(b.enemy.hp, 4000 - damage);
    assert.equal(b.phase, 'tennaCut');
    assert.equal(canUseBattleAction(b, 'attack'), false);
    assert.equal(attackEnemy(b), false);
    assert.equal(completeTennaCut(b), true);
    assert.equal(b.enemy.hp, 4000);
    assert.equal(b.turn, next);
    assert.equal(b.score, 260);
    assert.equal(completeTennaCut(b), false);
  }
  assert.equal(b.phase, 'tennaCue');
});
test('fast kill damage and previously missing HP are fully restored by the cut', () => {
  const b = createTennaEncounter();
  b.fastKill = true;
  b.enemy.hp = 250;
  attackEnemy(b);
  assert.equal(b.enemy.hp, 0);
  assert.equal(b.phase, 'tennaCut');
  completeTennaCut(b);
  assert.equal(b.enemy.hp, 4000);
  assert.equal(b.enemy.visible, true);
  assert.equal(b.finalAttackUsed, false);
});
