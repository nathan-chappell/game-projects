import assert from 'node:assert/strict';
import test from 'node:test';
import { createKnightEncounter } from './introduction.ts';
import { partyDuelDuration, partyDuelFrame } from './party-duel.ts';
import { advanceBattleTime, attackEnemy, startNextEnemyAttack, startKrisTurn } from '../shared/rules.ts';

test('both knights wind up, swing and meet the other blade at their blocks', () => {
  for (const reduced of [false, true]) {
    for (const age of [1.8, 1.9, 2, 4.8, 4.9, 5]) {
      const frame = partyDuelFrame(age, reduced);
      assert.ok(frame.contact, `the blades meet at ${age}, reduced=${reduced}`);
      assert.ok(frame.contact.y < 290, 'clashes remain above the party HUD');
    }
  }
  assert.equal(partyDuelFrame(1.65).swinging, 'roaring');
  assert.equal(partyDuelFrame(4.65).swinging, 'kaizo');
  assert.notEqual(partyDuelFrame(1.5).roaring.swordAngle, partyDuelFrame(1.77).roaring.swordAngle);
  assert.notEqual(partyDuelFrame(4.5).kaizo.swordAngle, partyDuelFrame(4.77).kaizo.swordAngle);
});
test('the duel loops without moving the characters abruptly and keeps floating', () => {
  const a = partyDuelFrame(partyDuelDuration - 0.001),
    b = partyDuelFrame(partyDuelDuration + 0.001);
  for (const name of ['roaring', 'kaizo'] as const) {
    assert.ok(Math.abs(a[name].x - b[name].x) < 1);
    assert.ok(Math.abs(a[name].jump - b[name].jump) < 1);
    assert.ok(Math.abs(a[name].swordAngle - b[name].swordAngle) < 0.01);
    assert.ok(a[name].jump > 112);
  }
});
test('waiting in any party menu animates blocked clashes without changing HP, TP or the turn', () => {
  for (const [phase, name] of [
    ['kris', 'Kris'],
    ['flowey', 'Flowey'],
    ['susie', 'Susie'],
    ['ralsey', 'Ralsey'],
  ] as const) {
    const b = createKnightEncounter();
    b.phase = phase;
    b.turn = name;
    b.screen = 'act';
    const hp = { Kris: 100, Flowey: 75, Susie: 80, Ralsey: 90 };
    const before = structuredClone({ enemies: b.knightEnemies, hp, tp: b.tp });
    for (let i = 0; i < 60 * 14; i++) advanceBattleTime(b, 1 / 60, hp);
    assert.ok(b.knightDuelAge! > 13);
    assert.equal(b.turn, name);
    assert.equal(b.screen, 'act');
    assert.deepEqual({ enemies: b.knightEnemies, hp, tp: b.tp }, before);
  }
});
test('party hit animations and enemy attacks pause the duel; downed knights no longer fight', () => {
  const b = createKnightEncounter();
  advanceBattleTime(b, 0.2);
  attackEnemy(b);
  const age = b.knightDuelAge;
  advanceBattleTime(b, 0.1);
  assert.equal(b.knightDuelAge, age);
  advanceBattleTime(b, 0.5);
  advanceBattleTime(b, 0.1);
  assert.ok(b.knightDuelAge! > age!);
  startNextEnemyAttack(b, '');
  const duringEnemy = b.knightDuelAge;
  advanceBattleTime(b, 1);
  assert.equal(b.knightDuelAge, duringEnemy);
  startKrisTurn(b);
  b.knightEnemies!.kaizo.hp = 0;
  advanceBattleTime(b, 1);
  assert.equal(b.knightDuelAge, duringEnemy);
});
