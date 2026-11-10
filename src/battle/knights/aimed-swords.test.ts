import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceAimedSwords, createAimedSwords } from './aimed-swords.ts';
import { battleArena } from '../shared/settings.ts';

test('third attack warns and launches exactly eight aimed big swords without mini swords', () => {
  const a = createAimedSwords(battleArena);
  const target = { x: 320, y: 165 };
  advanceAimedSwords(a, 0.3, () => true, target);
  assert.equal(a.warnings.length, 8);
  assert.equal(a.warnings.filter((s) => s.owner === 'kaizo').length, 4);
  assert.ok(a.warnings.every((s) => s.speed === 700));
  for (const sword of a.warnings) {
    const { x, size } = a.arena;
    assert.ok(sword.x <= x - 60 || sword.x >= x + size + 60);
    assert.ok(Math.hypot(target.x - sword.x, target.y - sword.y) > 170);
  }
  // A 43px radius encloses the complete sword at every possible aim angle.
  assert.ok(a.warnings.every((s) => s.x - 43 >= 0 && s.x + 43 <= 640 && s.y - 43 >= 0 && s.y + 43 <= 295));
  const angles = a.warnings.map((s) => s.angle);
  for (const s of a.warnings) {
    assert.ok(Math.abs(Math.atan2(target.y - s.y, target.x - s.x) - s.angle) < 1e-9);
  }
  advanceAimedSwords(a, 0.7, () => true, { x: 410, y: 250 });
  assert.equal(a.warnings.length, 0);
  assert.equal(a.swords.filter((s) => !s.scale).length, 8);
  assert.equal(a.swords.filter((s) => s.scale).length, 0);
  assert.deepEqual(
    a.swords.filter((s) => !s.scale).map((s) => s.angle),
    angles,
  );
});

test('six faster sword volleys finish at different frame rates', () => {
  for (const fps of [30, 60, 144]) {
    const a = createAimedSwords(battleArena);
    let done = false;
    for (let i = 0; i < fps * 15 && !done; i++) done = advanceAimedSwords(a, 1 / fps).finished;
    assert.equal(done, true);
    assert.equal(a.waves, 6);
  }
});

test('defeated knights do not launch new aimed swords', () => {
  const a = createAimedSwords(battleArena);
  advanceAimedSwords(a, 0.3);
  advanceAimedSwords(a, 0.7, (owner) => owner === 'kaizo');
  assert.equal(a.swords.filter((s) => !s.scale).length, 4);
  assert.ok(a.swords.every((s) => s.owner === 'kaizo'));
});

test('new volleys arrive every 1.15 seconds while preserving the full warning', () => {
  const a = createAimedSwords(battleArena);
  advanceAimedSwords(a, 0.3);
  assert.equal(a.prepared, 1);
  advanceAimedSwords(a, 1.14);
  assert.equal(a.prepared, 1);
  advanceAimedSwords(a, 0.01);
  assert.equal(a.prepared, 2);
  assert.equal(a.waves, 1);
  assert.equal(a.warnings.length, 8);
  advanceAimedSwords(a, 0.7);
  assert.equal(a.waves, 2);
});
