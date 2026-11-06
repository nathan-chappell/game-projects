import assert from 'node:assert/strict';
import test from 'node:test';
import { createTennaEncounter } from '../../rooms/backstage/tenna-finale.ts';
import { freshPartyHP } from '../../game/config.ts';
import { addTennaTestingPoints, completeTennaScoreEvent } from './score-events.ts';
import { rejectUndyneAction } from './undyne-actions.ts';
import {
  attackEnemy,
  spareInDark,
  requestTennaMinigame,
  completeUndyneCandy,
  advanceBattleTime,
} from '../shared/rules.ts';
function guest(score = 500) {
  const b = createTennaEncounter();
  addTennaTestingPoints(b, score);
  completeTennaScoreEvent(b);
  return b;
}
test('Undyne has her own 3500 HP; attacks award ten points and do not trigger Tenna’s cut', () => {
  const b = guest();
  assert.equal(b.enemy.name, 'Undyne');
  assert.equal(b.enemy.hp, 3500);
  attackEnemy(b);
  assert.equal(b.enemy.hp, 3425);
  assert.equal(b.score, 510);
  assert.equal(b.phase, 'flowey');
  attackEnemy(b);
  assert.equal(b.enemy.hp, 3345);
  assert.equal(b.score, 520);
  assert.equal(b.phase, 'susie');
  assert.equal(b.tennaSavedEnemy?.hp, 4000);
});
test('spare and Kris Minigame attempts throw a spear without consuming TP or a turn', () => {
  const b = guest();
  b.tp = 100;
  assert.equal(spareInDark(b), false);
  assert.equal(b.undyneMenuSpear?.target, 'spare');
  assert.equal(requestTennaMinigame(b), false);
  assert.equal(b.undyneMenuSpear?.target, 'act');
  assert.equal(b.phase, 'kris');
  assert.equal(b.tp, 100);
  assert.equal(b.score, 500);
  assert.equal(b.minigame, undefined);
  b.turn = 'Flowey';
  b.phase = 'flowey';
  assert.equal(rejectUndyneAction(b, 'act'), false);
  assert.equal(rejectUndyneAction(b, 'spare'), true);
});
test('glitch begins at 660 and her departure restores Tenna’s exact prior HP', () => {
  const b = guest(650);
  b.tennaSavedEnemy!.hp = 3210;
  assert.equal(b.undyneGlitched, undefined);
  attackEnemy(b);
  assert.equal(b.score, 660);
  assert.equal(b.undyneGlitched, true);
  addTennaTestingPoints(b, 90);
  assert.equal(b.guestEvent, 'leave');
  completeTennaScoreEvent(b);
  assert.equal(b.enemy.name, 'Tenna');
  assert.equal(b.enemy.hp, 3210);
  assert.equal(b.enemy.maxHP, 4000);
  assert.equal(b.undyneMenuSpear, null);
});
test('lethal attacks give ten points once and wait for Tenna’s G. Candy before returning to the next turn', () => {
  const b = guest();
  b.enemy.hp = 50;
  attackEnemy(b);
  assert.equal(b.enemy.hp, 0);
  assert.equal(b.score, 510);
  assert.equal(b.phase, 'undyneCandy');
  assert.equal(attackEnemy(b), false);
  assert.equal(completeUndyneCandy(b), true);
  assert.equal(b.enemy.hp, 3500);
  assert.equal(b.undyneHealAge, 0);
  assert.equal(b.phase, 'flowey');
  assert.equal(completeUndyneCandy(b), false);
  assert.equal(b.score, 510);
});
test('the last party member reaching 750 departs before another attack, including after a lethal hit', () => {
  for (const lethal of [false, true]) {
    const b = guest(740);
    b.turn = 'Ralsey';
    b.phase = 'ralsey';
    if (lethal) b.enemy.hp = 30;
    attackEnemy(b);
    if (lethal) completeUndyneCandy(b);
    assert.equal(b.score, 750);
    assert.equal(b.phase, 'tennaGuest');
    completeTennaScoreEvent(b);
    assert.equal(b.enemy.name, 'Tenna');
    advanceBattleTime(b, 0.01, freshPartyHP());
    assert.equal(b.phase, 'tennaCue');
  }
});
