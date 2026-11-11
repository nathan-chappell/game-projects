import {
  requestSpecialAttack,
  toggleFastKill,
  toggleRepeatAttack,
} from '../../../tests/fixtures/combat-tools.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { canUseBattleAction } from '../shared/availability.ts';
import {
  advanceBattleTime,
  advanceSnowAttack,
  attackEnemy,
  createEncounter,
  defend,
  finishPartyTurn,
  friendlynessPellets,
  proceed,
  startKrisTurn,
} from '../shared/rules.ts';
import { attackState } from '../shared/test-state.ts';
import {
  advanceRescueDialogue,
  afterBattleConversation,
  healAfterSnowgrave,
  isBattleEndScreen,
  isRalseyChoice,
  isRescueImportant,
  isSlashScreen,
  rescueConversation,
  rescueDialogue,
  rescueIsTyping,
  rescueSettings,
  rescueVisibleText,
} from './aftermath.ts';
import { snowgraveDuration } from './snowgrave.ts';

function afterSnowgrave(kris = 20, flowey = 65, skip = false) {
  const battle = createEncounter(),
    hp = freshPartyHP();
  startKrisTurn(battle);
  battle.enemy.hp = 40;
  attackEnemy(battle);
  hp.Kris = kris;
  hp.Flowey = flowey;
  if (skip) startKrisTurn(battle, hp);
  else {
    attackState(battle).snowgrave!.age = snowgraveDuration - 0.01;
    advanceSnowAttack(battle, hp, 0.02);
  }
  return { battle, hp };
}

test('finishing or skipping Snowgrave heals both teammates 50 HP once, capped at max HP', () => {
  for (const skip of [false, true]) {
    const { battle, hp } = afterSnowgrave(20, 65, skip);
    assert.equal(hp.Kris, 70);
    assert.equal(hp.Flowey, 100);
    assert.equal(hp.Susie, 100);
    assert.equal(hp.Ralsey, 100);
    hp.Kris = 60;
    assert.equal(healAfterSnowgrave(battle, hp), false);
    assert.equal(hp.Kris, 60);
    assert.equal(battle.phase, 'kris');
    assert.equal(battle.enemy.hp, 1);
    assert.equal(battle.enemy.visible, true);
  }
  const { battle, hp } = afterSnowgrave(0, 10);
  assert.equal(hp.Kris, 50);
  assert.equal(hp.Flowey, 60);
  assert.equal(battle.turn, 'Kris');
});

test('only Attack is allowed after Snowgrave and debug attack selection cannot bypass the ending', () => {
  const { battle, hp } = afterSnowgrave();
  battle.tp = 100;
  assert.equal(canUseBattleAction(battle, 'attack'), true);
  for (const action of ['act', 'item', 'defend', 'spare'] as const)
    assert.equal(canUseBattleAction(battle, action), false);
  assert.equal(defend(battle), false);
  assert.equal(proceed(battle), false);
  assert.equal(friendlynessPellets(battle, hp), false);
  assert.equal(finishPartyTurn(battle, 'item used'), false);
  assert.equal(toggleRepeatAttack(battle), false);
  assert.equal(requestSpecialAttack(battle), false);
  assert.equal(battle.tp, 100);
  toggleFastKill(battle);
  assert.equal(attackEnemy(battle), true);
  assert.equal(battle.phase, 'rescue');
  assert.equal(battle.turn, null);
  assert.equal(battle.hitActor, 'Kris');
  assert.equal(battle.hitDamage, 1);
  assert.equal(battle.enemy.hp, 0);
  assert.equal(attackEnemy(battle), false);
});

test('Noelle collapses, Ralsey enters and asks Kris, heals her, and lets her escape before the argument', () => {
  const { battle } = afterSnowgrave();
  attackEnemy(battle);
  assert.equal(battle.rescue!.stage, 'strike');
  assert.equal(advanceRescueDialogue(battle), false);
  advanceBattleTime(battle, rescueSettings.strike);
  assert.equal(battle.rescue!.stage, 'arrival');
  advanceBattleTime(battle, rescueSettings.arrival);
  assert.equal(battle.rescue!.stage, 'question');
  assert.match(rescueDialogue(battle)!.text, /What are you doing/);
  advanceBattleTime(battle, 100);
  assert.equal(battle.rescue!.stage, 'question', 'dialogue waits for input');
  advanceRescueDialogue(battle);
  assert.equal(battle.rescue!.stage, 'heal');
  advanceBattleTime(battle, rescueSettings.heal);
  assert.equal(battle.enemy.hp, rescueSettings.healedHP);
  assert.equal(battle.enemy.visible, true);
  assert.equal(battle.rescue!.stage, 'release');
  advanceRescueDialogue(battle);
  assert.equal(battle.rescue!.stage, 'escape');
  advanceBattleTime(battle, rescueSettings.escape);
  assert.equal(battle.enemy.visible, false);
  assert.equal(battle.noelleEscaped, true);
  assert.equal(battle.phase, 'rescue', 'the conversation still has to finish');
  assert.equal(battle.rescue!.stage, 'talk');
  const heard = [];
  while (battle.phase === 'rescue') {
    heard.push(rescueDialogue(battle));
    advanceRescueDialogue(battle);
  }
  assert.deepEqual(heard, rescueConversation);
  assert.ok(heard.some((line) => line.speaker === 'Kris'));
  assert.ok(heard.some((line) => line.speaker === 'Ralsey' && line.angry));
  assert.deepEqual(heard.at(-1), { speaker: 'Flowey', text: 'Noelle attacked first.' });
  assert.equal(battle.phase, 'kris');
  assert.equal(isRalseyChoice(battle), true);
  assert.equal(battle.rescue!.ralseyAttempts, 0);
  assert.equal(advanceRescueDialogue(battle), false);
  assert.equal(createEncounter(true, true).message, 'Noelle escaped.');
  assert.equal(createEncounter(true).message, '??? disappeared.');
});

function ralseyChoice() {
  const { battle, hp } = afterSnowgrave();
  attackEnemy(battle);
  advanceBattleTime(battle, rescueSettings.strike);
  advanceBattleTime(battle, rescueSettings.arrival);
  advanceRescueDialogue(battle);
  advanceBattleTime(battle, rescueSettings.heal);
  advanceRescueDialogue(battle);
  advanceBattleTime(battle, rescueSettings.escape);
  for (let i = 0; i < rescueConversation.length; i++) advanceRescueDialogue(battle);
  return { battle, hp };
}

test('three separate Attack-only choices show Ralsey reactions, then Kris refuses without hurting anyone', () => {
  const { battle, hp } = ralseyChoice(),
    initialHP = structuredClone(hp);
  const enemyHP = battle.enemy.hp;
  toggleFastKill(battle);
  for (let attempt = 1; attempt <= 3; attempt++) {
    assert.equal(isRalseyChoice(battle), true);
    assert.equal(battle.turn, 'Kris');
    assert.equal(battle.selectedAction, 'attack');
    for (const action of ['act', 'item', 'defend', 'spare'] as const)
      assert.equal(canUseBattleAction(battle, action), false);
    assert.equal(defend(battle), false);
    assert.equal(proceed(battle), false);
    assert.equal(requestSpecialAttack(battle), false);
    assert.equal(toggleRepeatAttack(battle), false);
    assert.equal(attackEnemy(battle), true);
    assert.equal(battle.rescue!.ralseyAttempts, attempt);
    assert.equal(battle.phase, 'rescue');
    assert.equal(attackEnemy(battle), false, 'the next attack needs a new choice after dialogue');
    assert.equal(battle.hitAge, null, 'no sword strike or damage is applied');
    assert.equal(battle.enemy.hp, enemyHP);
    assert.deepEqual(hp, initialHP);
    const line = rescueDialogue(battle);
    if (attempt === 1) assert.deepEqual(line, { speaker: 'Ralsey', text: 'Wh-what ar-are you doing?' });
    else if (attempt === 2)
      assert.deepEqual(line, { speaker: 'Ralsey', text: "Kr-Kris?! You c-ca-can't do th-that to me?" });
    else assert.deepEqual(line, { speaker: 'Narrator', text: 'but Kris refused' });
    advanceBattleTime(battle, 10);
    assert.deepEqual(rescueDialogue(battle), line, 'dialogue waits to be read');
    advanceRescueDialogue(battle);
  }
  assert.equal(isBattleEndScreen(battle), true);
  assert.equal(advanceRescueDialogue(battle), false, 'confirmation cannot skip the one-second black screen');
  advanceBattleTime(battle, 0.99);
  assert.equal(isBattleEndScreen(battle), true);
  advanceBattleTime(battle, 0.01);
  assert.equal(isBattleEndScreen(battle), false);
  assert.equal(battle.phase, 'aftermath');
  assert.equal(isRalseyChoice(battle), false);
  assert.equal(attackEnemy(battle), false);
  assert.equal(advanceRescueDialogue(battle), false);
  assert.deepEqual(
    afterBattleConversation.map((line) => line.speaker),
    ['Ralsey', 'Kris', 'Susie', 'Kris'],
  );
  assert.equal(afterBattleConversation[0].text, 'Why did you try to attack me?');
  assert.equal(afterBattleConversation[1].text, "... you won't understand.");
  assert.equal(afterBattleConversation[2].text, 'KRIS! WHAT THE $%#? WAS THAT!?!?');
  assert.equal(afterBattleConversation[3].text, '...');
});

test('the red sweep holds for two seconds before Noelle falls and Ralsey arrives', () => {
  const { battle } = afterSnowgrave();
  assert.equal(isSlashScreen(battle), false);
  attackEnemy(battle);
  assert.equal(isSlashScreen(battle), true);
  advanceBattleTime(battle, 1.9);
  assert.equal(battle.rescue!.stage, 'strike');
  assert.ok(battle.rescue!.age < rescueSettings.slash);
  assert.equal(advanceRescueDialogue(battle), false);
  assert.equal(attackEnemy(battle), false);
  assert.equal(advanceBattleTime(battle, 0.1), true, 'notify the UI immediately when the blackout ends');
  assert.equal(isSlashScreen(battle), false);
  assert.equal(battle.rescue!.age, 2);
  assert.equal(battle.rescue!.stage, 'strike');
  assert.equal(rescueSettings.slash, 2);
  assert.equal(battle.enemy.visible, true);
  advanceBattleTime(battle, 1);
  assert.equal(battle.rescue!.stage, 'arrival');
});

test('Kris’s refusal types at the first Ralsey response speed while the second response stays slower', () => {
  const { battle } = ralseyChoice();
  assert.equal(isRescueImportant(battle), true);
  const halfSecondCharacters = [12, 5, 12];
  for (let attempt = 0; attempt < 3; attempt++) {
    attackEnemy(battle);
    const fullText = rescueDialogue(battle)!.text;
    assert.equal(rescueVisibleText(battle), '');
    assert.equal(rescueIsTyping(battle), true);
    advanceBattleTime(battle, 0.5);
    assert.equal(rescueVisibleText(battle), fullText.slice(0, halfSecondCharacters[attempt]));
    assert.equal(battle.message.endsWith(fullText), false, 'feedback must not reveal unreached text');
    assert.equal(battle.phase, 'rescue');
    assert.equal(isRescueImportant(battle), true);
    const partial = rescueVisibleText(battle);
    for (let press = 0; press < 10; press++) assert.equal(advanceRescueDialogue(battle), false);
    assert.equal(rescueVisibleText(battle), partial, 'confirm cannot fast-forward the text');
    assert.equal(rescueIsTyping(battle), true);
    advanceBattleTime(battle, 10);
    assert.equal(rescueVisibleText(battle), fullText);
    assert.equal(rescueIsTyping(battle), false);
    assert.equal(battle.phase, 'rescue');
    advanceRescueDialogue(battle);
  }
  assert.equal(isBattleEndScreen(battle), true);
  advanceBattleTime(battle, rescueSettings.battleEnd);
  assert.equal(battle.phase, 'aftermath');
  assert.equal(isRescueImportant(null), false);
});

test('ordinary party actions and Proceed remain available before Snowgrave', () => {
  const battle = createEncounter();
  startKrisTurn(battle);
  battle.tp = 100;
  for (const action of ['attack', 'act', 'item', 'defend'] as const)
    assert.equal(canUseBattleAction(battle, action), true);
  assert.equal(healAfterSnowgrave(battle, freshPartyHP()), false);
  assert.equal(proceed(battle), true);
});
