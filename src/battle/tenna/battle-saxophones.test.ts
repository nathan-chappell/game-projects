import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { createTennaEncounter } from '../../rooms/backstage/tenna-finale.ts';
import { isGrazingHazard } from '../shared/graze.ts';
import { advanceSnowAttack, completeTennaCue, defend, isSoulInSnow, moveSoul } from '../shared/rules.ts';
import { battleArena, battleSettings } from '../shared/settings.ts';
import { attackState } from '../shared/test-state.ts';
import {
  advanceSaxAttack,
  createSaxAttack,
  noteTouches,
  saxHelperTurn,
  saxSettings,
  saxStaffY,
} from './saxophones.ts';
function attack() {
  const b = createTennaEncounter();
  for (let i = 0; i < 4; i++) defend(b);
  assert.equal(b.phase, 'tennaCue');
  completeTennaCue(b);
  b.projectileDamageMultiplier = 1;
  return b;
}
test('two Helpers each play a separate right-side phrase after their staff preview', () => {
  for (const fps of [30, 60, 144]) {
    const a = createSaxAttack(battleArena);
    advanceSaxAttack(a, 1);
    assert.equal(a.notes.length, 0);
    advanceSaxAttack(a, 0.11);
    assert.equal(a.notes.length, 6);
    assert.ok(a.notes.every((n) => n.direction === -1 && n.helper === 0));
    const x = a.notes[0].x;
    advanceSaxAttack(a, 0.1);
    assert.ok(Math.abs(a.notes[0].x - (x - 21)) < 1e-8);
    advanceSaxAttack(a, 1.2);
    assert.ok(a.notes.every((n) => n.helper === 0));
    while (a.age < 7) advanceSaxAttack(a, 1 / fps);
    assert.equal(a.notes.length, 0);
    assert.equal(a.waves, 4);
    while (a.age < 7.5) advanceSaxAttack(a, 1 / fps);
    assert.equal(saxHelperTurn(a), 1);
    assert.equal(a.notes.length, 0);
    while (a.age < 8.4) advanceSaxAttack(a, 1 / fps);
    assert.ok(a.notes.length > 0);
    assert.ok(a.notes.every((n) => n.helper === 1 && n.direction === -1));
    let done = false;
    for (let i = 0; i < fps * 15 && !done; i++) done = advanceSaxAttack(a, 1 / fps);
    assert.equal(done, true);
    assert.equal(a.waves, 8);
    assert.equal(a.notes.length, 0);
  }
});
test('Tenna cues before notes, hits one living teammate for 30, and shares a hit cooldown', () => {
  const b = attack(),
    hp = freshPartyHP();
  hp.Kris = 0;
  advanceSnowAttack(b, hp, 1.5, () => 0);
  const n = attackState(b).saxophones!.notes[0];
  b.soul = { x: n.x, y: n.y };
  advanceSnowAttack(b, hp, 1 / 60, () => 0);
  assert.equal(hp.Flowey, 70);
  assert.equal(hp.Kris, 0);
  advanceSnowAttack(b, hp, 0.1, () => 0);
  assert.equal(hp.Flowey, 70);
  assert.equal(saxSettings.damage, 30);
});
test('notes support invincibility, defend reduction, normal movement and return to Kris', () => {
  for (const [invincible, multiplier, expected] of [[true, 1, 100] as const, [false, 0.5, 85] as const]) {
    const b = attack(),
      hp = freshPartyHP();
    b.invincible = invincible;
    b.projectileDamageMultiplier = multiplier;
    advanceSnowAttack(b, hp, 1.5);
    const n = attackState(b).saxophones!.notes[0];
    b.soul = { x: n.x, y: n.y };
    advanceSnowAttack(b, hp, 1 / 60, () => 0);
    assert.equal(hp.Kris, expected);
  }
  const b = attack(),
    hp = freshPartyHP();
  b.invincible = true;
  const x = b.soul!.x;
  moveSoul(b, new Set(['right']), 0.1);
  assert.equal(b.soul!.x, x + 15);
  assert.equal(isSoulInSnow(b), false);
  for (let i = 0; i < 16 * 60 && b.phase === 'enemy'; i++) advanceSnowAttack(b, hp, 1 / 60);
  assert.equal(b.turn, 'Kris');
  assert.equal(b.phase, 'kris');
  assert.equal(b.snowAttack, null);
});
test('grazing and collision use the visible note head, stem and flag', () => {
  const b = attack(),
    a = attackState(b).saxophones;
  advanceSaxAttack(present(a), 1.5);
  const n = a!.notes[0];
  b.soul = { x: n.x, y: n.y };
  assert.equal(noteTouches(n, b.soul), true);
  assert.equal(isGrazingHazard(b, battleSettings, battleArena), false);
  b.soul = { x: n.x - 25, y: n.y };
  assert.equal(noteTouches(n, b.soul), false);
  assert.equal(isGrazingHazard(b, battleSettings, battleArena), true);
  b.soul = { x: 220, y: 260 };
  assert.equal(isGrazingHazard(b, battleSettings, battleArena), false);
});

test('every note head follows its own visible staff curve throughout both phrases', () => {
  const a = createSaxAttack(battleArena);
  let helpers = new Set();
  for (let frame = 0; frame < 15 * 60; frame++) {
    advanceSaxAttack(a, 1 / 60);
    for (const n of a.notes) {
      helpers.add(n.helper);
      assert.equal(n.y, saxStaffY(a, n.lane, n.x, n.helper));
      assert.equal(n.helper, saxHelperTurn(a));
    }
  }
  assert.deepEqual([...helpers], [0, 1]);
});

test('each volley sends six notes while preserving three adjacent empty staff lines', () => {
  const a = createSaxAttack(battleArena);
  for (let wave = 0; wave < 8; wave++) {
    const launch =
      Math.floor(wave / 4) * saxSettings.phraseLength +
      saxSettings.warmup +
      (wave % 4) * saxSettings.interval;
    advanceSaxAttack(a, launch - a.age + 1e-8);
    const notes = a.notes.filter((n) => Math.abs(n.launch - launch) < 1e-7);
    assert.equal(notes.length, 6);
    const empty = Array.from({ length: saxSettings.lanes }, (_, i) => i).filter(
      (i) => !notes.some((n) => n.lane === i),
    );
    assert.equal(empty.length, 3);
    assert.equal(empty[2] - empty[0], 2);
  }
});
