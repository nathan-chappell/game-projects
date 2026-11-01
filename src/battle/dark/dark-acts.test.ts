import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { canPartyAct, canUseBattleAction } from '../shared/availability.ts';
import {
  advanceBattleTime,
  attackEnemy,
  completeDarkShine,
  spareInDark,
  startKrisTurn,
  useDarkAct,
} from '../shared/rules.ts';
import type { Encounter } from '../shared/types.ts';
import { createDarkEncounter } from './dark-battle.ts';
const actor = (b: Encounter, name: string) => {
  b.turn = name;
  b.phase = name.toLowerCase();
};
const unlocked = () => {
  const b = createDarkEncounter();
  b.darkUnlocked = true;
  b.shineCount = 3;
  return b;
};
test('Shine costs 100 TP each time, provokes the exact response, and unlocks all four attacks after three uses', () => {
  const b = createDarkEncounter(),
    hp = freshPartyHP();
  assert.equal(b.enemy.hp, 4000);
  assert.equal(b.enemy.maxHP, 4000);
  b.tp = 99;
  assert.equal(useDarkAct(b, hp), false);
  assert.equal(b.shineCount, 0);
  for (let count = 1; count <= 3; count++) {
    b.tp = 100;
    assert.equal(useDarkAct(b, hp), true);
    assert.equal(b.tp, 0);
    assert.equal(b.message, 'NOT THE LAIGHT!');
    assert.equal(b.shineCount, count);
    assert.equal(b.darkUnlocked, count === 3);
    assert.equal(completeDarkShine(b), true);
    assert.equal(b.turn, 'Flowey');
    while (canPartyAct(b)) {
      assert.equal(canUseBattleAction(b, 'attack'), count === 3);
      spareInDark(b);
    }
    startKrisTurn(b, hp);
  }
  assert.equal(canUseBattleAction(b, 'attack'), true);
});
test('other ACTs remain locked before the third Shine and require their own TP afterward', () => {
  for (const [name, cost] of [['Flowey', 65] as const, ['Susie', 70] as const, ['Ralsey', 50] as const]) {
    const b = createDarkEncounter(),
      hp = freshPartyHP();
    hp.Kris = 10;
    actor(b, name);
    b.tp = 100;
    assert.equal(useDarkAct(b, hp), false);
    assert.equal(b.tp, 100);
    b.darkUnlocked = true;
    b.tp = cost - 1;
    assert.equal(useDarkAct(b, hp), false);
    assert.equal(b.turn, name);
  }
});
test('unlocked normal attacks use Kris 75, Flowey 80, Susie 150 and Ralsey 60 damage', () => {
  const b = unlocked();
  for (const [name, amount] of [
    ['Kris', 75] as const,
    ['Flowey', 80] as const,
    ['Susie', 150] as const,
    ['Ralsey', 60] as const,
  ]) {
    assert.equal(b.turn, name);
    const hp = b.enemy.hp;
    assert.equal(attackEnemy(b), true);
    assert.equal(b.enemy.hp, hp - amount);
  }
  assert.equal(b.enemy.hp, 3635);
  assert.equal(b.phase, 'enemy');
});
test('Flowey reuses the pellet cast for 65 TP, healing 35 and dealing 150 once before Susie’s turn', () => {
  const b = unlocked(),
    hp = freshPartyHP();
  hp.Flowey = 40;
  actor(b, 'Flowey');
  b.tp = 65;
  assert.equal(useDarkAct(b, hp), true);
  assert.equal(b.tp, 0);
  assert.equal(hp.Flowey, 75);
  assert.equal(b.phase, 'pellets');
  advanceBattleTime(b, 1.31, hp);
  assert.equal(b.enemy.hp, 3850);
  advanceBattleTime(b, 0.2, hp);
  assert.equal(b.enemy.hp, 3850);
  advanceBattleTime(b, 0.4, hp);
  assert.equal(b.turn, 'Susie');
  assert.equal(b.phase, 'susie');
});
test('Rude Buster costs 70 TP and rolls the inclusive 170–230 damage range', () => {
  for (const [roll, damage] of [
    [0, 170],
    [0.99999, 230],
  ]) {
    const b = unlocked(),
      hp = freshPartyHP();
    actor(b, 'Susie');
    b.tp = 70;
    assert.equal(
      useDarkAct(b, hp, () => roll),
      true,
    );
    assert.equal(b.enemy.hp, 4000 - damage);
    assert.equal(b.tp, 0);
    assert.equal(b.turn, 'Ralsey');
  }
});
test('Heal Player costs 50, chooses only injured teammates, caps HP and does not waste a turn at full health', () => {
  for (const [roll, healed] of [
    [0, 50],
    [0.99999, 70],
  ]) {
    const b = unlocked(),
      hp = freshPartyHP();
    actor(b, 'Ralsey');
    b.tp = 50;
    hp.Kris = 0;
    assert.equal(
      useDarkAct(b, hp, () => roll),
      true,
    );
    assert.equal(hp.Kris, healed);
    assert.equal(b.tp, 0);
  }
  const b = unlocked(),
    hp = freshPartyHP();
  actor(b, 'Ralsey');
  b.tp = 50;
  hp.Flowey = 95;
  assert.equal(useDarkAct(b, hp), true);
  assert.equal(hp.Flowey, 100);
  assert.equal(present(b.darkHeal).restored, 5);
  const full = unlocked();
  actor(full, 'Ralsey');
  full.tp = 50;
  assert.equal(useDarkAct(full, freshPartyHP()), false);
  assert.equal(full.tp, 50);
  assert.equal(full.turn, 'Ralsey');
});
test('defeating the dark boss reaches zero HP without triggering Noelle’s final attack', () => {
  const b = unlocked();
  actor(b, 'Ralsey');
  b.enemy.hp = 50;
  attackEnemy(b);
  assert.equal(b.enemy.hp, 0);
  assert.equal(b.phase, 'victory');
  assert.equal(b.finalAttackPending, false);
  assert.equal(b.finalAttackUsed, false);
});

test('the fifth Shine reveals Jackenstein while preserving health and earlier unlock', () => {
  const b = createDarkEncounter(),
    hp = freshPartyHP();
  hp.Kris = 42;
  hp.Flowey = 23;
  for (let n = 1; n <= 5; n++) {
    b.phase = 'enemy';
    startKrisTurn(b, hp);
    b.tp = 100;
    assert.equal(useDarkAct(b, hp), true);
    assert.equal(b.shineCount, n);
    assert.equal(b.enemy.hp, 4000);
    assert.equal(b.tp, 0);
    assert.equal(b.darkUnlocked, n >= 3);
    if (n < 5) {
      assert.equal(b.phase, 'shine');
      assert.equal(completeDarkShine(b), true);
    } else {
      assert.equal(b.phase, 'jackReveal');
      assert.match(b.message, /NOT THE LAAAIght/);
      assert.equal(completeDarkShine(b), false);
    }
  }
  assert.equal(hp.Kris, 42);
  assert.equal(hp.Flowey, 23);
});
