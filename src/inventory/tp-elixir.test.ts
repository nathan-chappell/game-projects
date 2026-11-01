import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceSnowAttack,
  attackEnemy,
  createEncounter,
  defend,
  skipFallenTurns,
  startKrisTurn,
  useBattleItem,
} from '../battle/shared/rules.ts';
import { attackState } from '../battle/shared/test-state.ts';
import { freshInventory, freshPartyHP } from '../game/config.ts';
import { useHealingItem } from './healing.ts';

function ready() {
  const b = createEncounter(),
    hp = freshPartyHP(),
    bag = freshInventory();
  startKrisTurn(b);
  bag.items.tpElixir = 3;
  return { b, hp, bag };
}

test('Kris can use TP Elixir at full HP: gain 15 TP now, spend one item/turn, boost only the next attack', () => {
  const { b, hp, bag } = ready();
  const result = useBattleItem(b, hp, bag, 'tpElixir', 'Kris');
  assert.equal(result!.tpGained, 15);
  assert.equal(b.tp, 15);
  assert.equal(bag.items.tpElixir, 2);
  assert.deepEqual(hp, freshPartyHP());
  assert.equal(b.phase, 'flowey');
  assert.equal(b.nextAttackGrazeTP, 4);
  attackEnemy(b);
  assert.equal(b.phase, 'enemy');
  assert.equal(attackState(b).grazeTP, 4);
  assert.equal(b.nextAttackGrazeTP, null);
  b.soul = { x: 243, y: 163 };
  attackState(b).nextWaveIn = 100;
  advanceSnowAttack(b, hp, 0.001);
  assert.equal(b.tp, 19);
  advanceSnowAttack(b, hp, 0.5);
  assert.equal(b.tp, 23);
  startKrisTurn(b);
  attackEnemy(b);
  attackEnemy(b);
  assert.equal(attackState(b).grazeTP, 3);
  b.soul = { x: 243, y: 163 };
  attackState(b).nextWaveIn = 100;
  advanceSnowAttack(b, hp, 0.001);
  assert.equal(b.tp, 26);
});

test('Flowey can use the elixir immediately before Noelle attacks; TP caps at 100 and full TP can still buy the buff', () => {
  for (const tp of [95, 100]) {
    const { b, hp, bag } = ready();
    defend(b);
    b.tp = tp;
    const result = useBattleItem(b, hp, bag, 'tpElixir', 'Flowey');
    assert.equal(result!.tpGained, 100 - tp);
    assert.equal(b.tp, 100);
    assert.equal(b.phase, 'enemy');
    assert.equal(attackState(b).grazeTP, 4);
    assert.equal(bag.items.tpElixir, 2);
    assert.deepEqual(hp, freshPartyHP());
    assert.equal(useBattleItem(b, hp, bag, 'tpElixir', 'Flowey'), null);
    assert.equal(bag.items.tpElixir, 2);
  }
});

test('two elixirs in one round grant 15 each while keeping grazing at 4 rather than stacking', () => {
  const { b, hp, bag } = ready();
  useBattleItem(b, hp, bag, 'tpElixir', 'Kris');
  useBattleItem(b, hp, bag, 'tpElixir', 'Flowey');
  assert.equal(b.tp, 30);
  assert.equal(bag.items.tpElixir, 1);
  assert.equal(attackState(b).grazeTP, 4);
});

test('the boost follows normal/buffed, repeated, special and final attacks, including a fallen Flowey', () => {
  for (const mode of ['normal', 'buffed', 'repeat', 'special', 'final', 'fallen'] as const) {
    const { b, hp, bag } = ready();
    if (mode === 'buffed') b.strongerAttacks = true;
    if (mode === 'repeat') {
      b.repeatAttack = true;
      b.lastEnemyAttack = 'right';
    }
    if (mode === 'special') b.specialAttackQueued = true;
    useBattleItem(b, hp, bag, 'tpElixir', 'Kris');
    if (mode === 'final') b.enemy.hp = 50;
    if (mode === 'fallen') {
      hp.Flowey = 0;
      skipFallenTurns(b, hp);
    } else attackEnemy(b);
    assert.equal(attackState(b).grazeTP, 4, mode);
    assert.equal(
      attackState(b).direction,
      mode === 'repeat' ? 'right' : mode === 'special' ? 'goal' : mode === 'final' ? 'snowgrave' : 'down',
      mode,
    );
    startKrisTurn(b, hp);
    assert.equal(b.nextAttackGrazeTP, null);
  }
});

test('elixirs reject missing inventory, non-party phases and ordinary healing without changing resources', () => {
  const { b, hp, bag } = ready();
  for (const phase of [
    'intro',
    'enemy',
    'rescue',
    'proceedDialogue',
    'proceedGlitch',
    'pellets',
    'victory',
  ] as const) {
    b.phase = phase;
    const snapshot = structuredClone(b);
    assert.equal(useBattleItem(b, hp, bag, 'tpElixir', 'Kris'), null);
    assert.deepEqual(b, snapshot);
    assert.equal(bag.items.tpElixir, 3);
  }
  assert.equal(useBattleItem(null, hp, bag, 'tpElixir', 'Kris'), null);
  hp.Kris = 10;
  assert.equal(useHealingItem(hp, bag, 'tpElixir', 'Kris'), null);
  assert.equal(hp.Kris, 10);
  b.phase = 'kris';
  b.turn = 'Kris';
  bag.items.tpElixir = 0;
  assert.equal(useBattleItem(b, hp, bag, 'tpElixir', 'Kris'), null);
  assert.equal(b.tp, 0);
});

test('healing items still heal/revive and consume their battle turn through the shared Item action', () => {
  const { b, hp, bag } = ready();
  bag.items.gCandy = 2;
  hp.Flowey = 0;
  const result = useBattleItem(b, hp, bag, 'gCandy', 'Flowey', () => 0);
  assert.equal(result!.restored, 35);
  assert.equal(hp.Flowey, 35);
  assert.equal(b.phase, 'flowey');
  assert.equal(b.nextAttackGrazeTP, null);
  assert.equal(bag.items.gCandy, 1);
  useBattleItem(b, hp, bag, 'gCandy', 'Flowey', () => 0);
  assert.equal(hp.Flowey, 70);
  assert.equal(b.phase, 'enemy');
  assert.equal(attackState(b).grazeTP, 3);
});
