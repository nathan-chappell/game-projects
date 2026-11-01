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
  saxWave,
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
test('both Helpers send six spaced notes along two paths in each of exactly five waves', () => {
  for (const fps of [30, 60, 144]) {
    const a = createSaxAttack(battleArena);
    for (let wave = 0; wave < saxSettings.waves; wave++) {
      const preview = wave * saxSettings.interval + 0.3;
      advanceSaxAttack(a, preview - a.age);
      assert.equal(saxWave(a), wave);
      assert.equal(a.notes.length, 0);
      const launch = wave * saxSettings.interval + saxSettings.warmup + 0.01;
      advanceSaxAttack(a, launch - a.age);
      assert.equal(a.waves, wave + 1);
      assert.equal(a.notes.length, 12);
      for (const helper of [0, 1]) {
        const notes = a.notes.filter((n) => n.helper === helper);
        assert.equal(notes.length, 6);
        assert.ok(notes[1].x > notes[0].x);
      }
      const previous = [...a.notes];
      const x = a.notes[0].x;
      advanceSaxAttack(a, 1 / fps);
      assert.ok(Math.abs(a.notes[0].x - (x - 210 / fps)) < 1e-8);
      if (wave < 4) {
        advanceSaxAttack(a, (wave + 1) * saxSettings.interval + 0.01 - a.age);
        assert.equal(a.notes.length, 0);
        assert.ok(previous.every((n) => !a.notes.includes(n)));
      }
    }
    let done = false;
    for (let i = 0; i < fps * 4 && !done; i++) done = advanceSaxAttack(a, 1 / fps);
    assert.equal(done, true);
    assert.equal(a.waves, 5);
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

test('every note head follows its own visible staff curve throughout all five paired waves', () => {
  const a = createSaxAttack(battleArena);
  let helpers = new Set();
  for (let frame = 0; frame < 15 * 60; frame++) {
    advanceSaxAttack(a, 1 / 60);
    for (const n of a.notes) {
      helpers.add(n.helper);
      assert.equal(n.y, saxStaffY(a, n.lane, n.x, n.helper));
      assert.ok(n.helper === 0 || n.helper === 1);
    }
  }
  assert.deepEqual([...helpers], [0, 1]);
});

test('wave paths change shape and the two Helpers have distinct crossing curves', () => {
  const a = createSaxAttack(battleArena),
    shapes: number[][] = [];
  for (let wave = 0; wave < 5; wave++) {
    advanceSaxAttack(a, wave * saxSettings.interval + 0.4 - a.age);
    const sample = [225, 320, 415].map((x) => saxStaffY(a, 2, x, 0));
    shapes.push(sample);
    assert.ok(sample.some((y, i) => Math.abs(y - saxStaffY(a, 2, [225, 320, 415][i], 1)) > 20));
    if (wave) assert.notDeepEqual(sample, shapes[wave - 1]);
  }
});
