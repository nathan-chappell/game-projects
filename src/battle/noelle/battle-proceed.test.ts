import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { canUseBattleAction } from '../shared/availability.ts';
import { addTP } from '../shared/resources.ts';
import {
  advanceBattleTime,
  advanceProceedDialogue,
  attackEnemy,
  createEncounter,
  defend,
  friendlynessPellets,
  proceed,
  requestSpecialAttack,
  startKrisTurn,
  toggleRepeatAttack,
} from '../shared/rules.ts';
import { attackState } from '../shared/test-state.ts';
import { isProceedScene, proceedDialogue, proceedGlitchSeconds, proceedResponses } from './proceed.ts';

function thirdResponse() {
  const b = createEncounter();
  startKrisTurn(b);
  for (let count = 1; count <= 3; count++) {
    addTP(b, 100);
    proceed(b);
    if (count < 3) {
      advanceProceedDialogue(b);
      startKrisTurn(b);
    }
  }
  return b;
}

test('three Proceed responses use separate paid Kris turns and block actions until acknowledged', () => {
  assert.deepEqual(proceedResponses, ['...', 'K-Kris?', 'Kris! W-whatt is happening?']);
  const b = createEncounter();
  startKrisTurn(b);
  for (let count = 1; count <= 3; count++) {
    addTP(b, 100);
    assert.equal(proceed(b), true);
    assert.equal(b.tp, 0);
    assert.equal(b.proceedCount, count);
    assert.deepEqual(proceedDialogue(b), { speaker: 'Noelle', text: proceedResponses[count - 1] });
    assert.equal(isProceedScene(b), true);
    assert.equal(b.enemy.hp, 3000);
    const snapshot = structuredClone(b);
    for (const action of ['attack', 'act', 'item', 'defend'] as const)
      assert.equal(canUseBattleAction(b, action), false);
    assert.equal(proceed(b), false);
    assert.equal(attackEnemy(b), false);
    assert.equal(defend(b), false);
    assert.equal(requestSpecialAttack(b), false);
    assert.equal(toggleRepeatAttack(b), false);
    assert.deepEqual(b, snapshot);
    advanceBattleTime(b, 10);
    assert.equal(b.phase, 'proceedDialogue');
    assert.equal(advanceProceedDialogue(b), true);
    assert.equal(advanceProceedDialogue(b), false);
    if (count < 3) {
      assert.equal(b.phase, 'enemy');
      assert.equal(b.turn, '???');
      assert.equal(attackState(b).direction, count === 1 ? 'down' : 'right');
      assert.equal(b.enemyAttackCount, count);
      assert.equal(b.tp, 0, 'no Flowey Defend or other free turn');
      assert.equal(proceedDialogue(b), null);
      startKrisTurn(b);
    } else assert.equal(b.phase, 'proceedGlitch');
  }
});

test('the third response finishes its glitch before entering the 1 HP Attack-only rescue setup', () => {
  const b = thirdResponse(),
    hp = freshPartyHP();
  hp.Kris = 20;
  hp.Flowey = 0;
  b.repeatAttack = b.specialAttackQueued = true;
  advanceProceedDialogue(b);
  assert.equal(proceedDialogue(b), null);
  assert.equal(b.enemy.hp, 3000);
  assert.equal(advanceBattleTime(b, proceedGlitchSeconds - 0.01, hp), false);
  assert.equal(b.phase, 'proceedGlitch');
  assert.deepEqual(hp, { ...freshPartyHP(), Kris: 20, Flowey: 0 });
  assert.equal(advanceBattleTime(b, 0.01, hp), true);
  assert.equal(b.phase, 'kris');
  assert.equal(b.turn, 'Kris');
  assert.equal(b.enemy.hp, 1);
  assert.equal(b.enemy.visible, true);
  assert.equal(b.finalAttackComplete, true);
  assert.equal(b.finalAttackUsed, true);
  assert.equal(b.snowAttack, null);
  assert.equal(b.repeatAttack, false);
  assert.equal(b.specialAttackQueued, false);
  assert.equal(b.noelleEscaped, false);
  assert.equal(b.snowgravePartyHealed, true);
  assert.deepEqual(hp, { ...freshPartyHP(), Kris: 70, Flowey: 50 });
  for (const action of ['act', 'item', 'defend', 'spare'] as const)
    assert.equal(canUseBattleAction(b, action), false);
  assert.equal(friendlynessPellets(b, hp), false);
  advanceBattleTime(b, 100, hp);
  assert.deepEqual(hp, { ...freshPartyHP(), Kris: 70, Flowey: 50 });
  b.fastKill = true;
  assert.equal(attackEnemy(b), true);
  assert.equal(b.phase, 'rescue');
  assert.equal(b.rescue!.stage, 'strike');
  assert.equal(b.enemy.hp, 0);
  assert.equal(b.turn, null);
});

test('attacks after Proceed use the same buffed order, repeat setting and special priority as normal turns', () => {
  for (const mode of ['buffed', 'repeat', 'special'] as const) {
    const b = createEncounter();
    startKrisTurn(b);
    addTP(b, 100);
    if (mode === 'buffed') {
      b.strongerAttacks = true;
      b.strongerAttackCount = 3;
    }
    if (mode === 'repeat') {
      b.repeatAttack = true;
      b.lastEnemyAttack = 'path';
      b.enemyAttackCount = 5;
    }
    if (mode === 'special') b.specialAttackQueued = true;
    proceed(b);
    advanceProceedDialogue(b);
    assert.equal(b.phase, 'enemy');
    if (mode === 'buffed') {
      assert.equal(attackState(b).direction, 'orbit');
      assert.equal(attackState(b).buffed, true);
      assert.equal(b.strongerAttackCount, 4);
    } else if (mode === 'repeat') {
      assert.equal(attackState(b).direction, 'path');
      assert.equal(b.enemyAttackCount, 5);
    } else {
      assert.equal(attackState(b).direction, 'goal');
      assert.equal(b.specialAttackQueued, false);
      assert.equal(b.enemyAttackCount, 0);
    }
    assert.equal(b.enemy.hp, 3000);
    assert.equal(b.proceedCount, 1);
  }
});
