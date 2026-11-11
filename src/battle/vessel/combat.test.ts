import assert from 'node:assert/strict';
import test from 'node:test';
import { createVesselEncounter } from './entrance.ts';
import { xSlashBackgroundShake } from './combat.ts';
import { attackEnemy, advanceBattleTime, useDarkAct, defend } from '../shared/rules.ts';
import { darkActInfo } from '../dark/dark-acts.ts';

const hp = () => ({ Kris: 100, Flowey: 100, Susie: 100, Ralsey: 100 });
function fixture() {
  const b = createVesselEncounter();
  advanceBattleTime(b, 1.1, hp());
  b.tp = 100;
  return b;
}
test('Vessel has 10000 HP and each party member deals the requested basic damage', () => {
  for (const [actor, damage] of [
    ['Kris', 100],
    ['Flowey', 10],
    ['Susie', 10],
    ['Ralsey', 10],
  ] as const) {
    const b = fixture();
    b.turn = actor;
    b.phase = actor.toLowerCase();
    assert.equal(b.enemy.maxHP, 10000);
    assert.equal(attackEnemy(b), true);
    assert.equal(b.enemy.hp, 10000 - damage);
    assert.equal(b.finalAttackPending, false);
  }
});
test('X-Slash deals 250 once, costs no TP, locks actions for its animation, and passes to Flowey', () => {
  const b = fixture(),
    party = hp();
  assert.equal(darkActInfo(b).name, 'X-Slash');
  assert.equal(darkActInfo(b).cost, 0);
  assert.equal(useDarkAct(b, party), true);
  assert.equal(b.enemy.hp, 9750);
  assert.equal(b.tp, 100);
  assert.equal(b.phase, 'vesselXSlash');
  assert.equal(useDarkAct(b, party), false);
  advanceBattleTime(b, 0.3, party);
  assert.equal(b.enemy.hp, 9750);
  advanceBattleTime(b, 0.5, party);
  assert.equal(b.turn, 'Flowey');
  assert.equal(b.phase, 'flowey');
  assert.equal(b.vesselXSlashAge, undefined);
  assert.equal(b.shineCount ?? 0, 0);
});
test('Flowey pellets deal 20 on impact and then hand off to Susie; Rude Buster deals 20', () => {
  const b = fixture(),
    party = hp();
  defend(b);
  assert.equal(b.turn, 'Flowey');
  b.tp = 100;
  party.Flowey = 40;
  assert.equal(useDarkAct(b, party), true);
  assert.equal(b.tp, 35);
  assert.equal(party.Flowey, 75);
  assert.equal(b.enemy.hp, 10000);
  advanceBattleTime(b, 1.4, party);
  assert.equal(b.enemy.hp, 9980);
  advanceBattleTime(b, 0.5, party);
  assert.equal(b.turn, 'Susie');
  b.tp = 100;
  assert.equal(
    useDarkAct(b, party, () => 1),
    true,
  );
  assert.equal(b.enemy.hp, 9960);
  assert.equal(b.tp, 30);
  assert.equal(b.turn, 'Ralsey');
});
test('Ralsey still heals, fallen party members are skipped and an unfinished enemy pattern never borrows Noelle attacks', () => {
  const b = fixture(),
    party = hp();
  b.turn = 'Ralsey';
  b.phase = 'ralsey';
  party.Kris = 40;
  assert.equal(
    useDarkAct(b, party, () => 0),
    true,
  );
  assert.equal(party.Kris, 90);
  assert.equal(b.tp, 50);
  assert.equal(b.phase, 'vesselWatch');
  party.Kris = 0;
  advanceBattleTime(b, 1.1, party);
  assert.equal(b.turn, 'Flowey');
  assert.equal(b.snowAttack, null);
});
test('lethal X-Slash reaches victory without Snowgrave, and background shake is small and optional', () => {
  const b = fixture();
  b.enemy.hp = 200;
  assert.equal(useDarkAct(b, hp()), true);
  assert.equal(b.enemy.hp, 0);
  assert.equal(b.phase, 'victory');
  advanceBattleTime(b, 1, hp());
  assert.equal(b.phase, 'victory');
  assert.equal(b.finalAttackPending, false);
  assert.equal(xSlashBackgroundShake(undefined, false), 0);
  assert.equal(xSlashBackgroundShake(0, false), 2);
  assert.ok(xSlashBackgroundShake(0.3, false) < 2);
  assert.equal(xSlashBackgroundShake(0.7, false), 0);
  assert.equal(xSlashBackgroundShake(0, true), 0);
});
