import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceAimedSwords, createAimedSwords } from './aimed-swords.ts';
import { battleArena } from '../shared/settings.ts';

test('third attack warns and launches exactly eight aimed big swords and three edge minis', () => {
  const a = createAimedSwords(battleArena);
  const target = { x: 320, y: 165 };
  advanceAimedSwords(a, 0.3, () => true, target);
  assert.equal(a.warnings.length, 8);
  assert.equal(a.warnings.filter((s) => s.owner === 'kaizo').length, 4);
  assert.equal(a.miniWarnings.length, 3);
  const angles = a.warnings.map((s) => s.angle);
  for (const s of a.warnings) {
    assert.ok(Math.abs(Math.atan2(target.y - s.y, target.x - s.x) - s.angle) < 1e-9);
  }
  advanceAimedSwords(a, 0.7, () => true, { x: 410, y: 250 });
  assert.equal(a.warnings.length, 0);
  assert.equal(a.swords.filter((s) => !s.scale).length, 8);
  assert.equal(a.swords.filter((s) => s.scale).length, 3);
  assert.deepEqual(
    a.swords.filter((s) => !s.scale).map((s) => s.angle),
    angles,
  );
});

test('stationary mini swords line all four edges without keeping the attack alive', () => {
  for (const fps of [30, 60, 144]) {
    const a = createAimedSwords(battleArena);
    assert.equal(a.rim.length, 16);
    assert.equal(new Set(a.rim.map((s) => s.angle)).size, 4);
    assert.ok(a.rim.every((s) => s.speed === 0 && s.active && s.scale === 0.28));
    let done = false;
    for (let i = 0; i < fps * 15 && !done; i++) done = advanceAimedSwords(a, 1 / fps).finished;
    assert.equal(done, true);
    assert.equal(a.waves, 6);
    assert.equal(a.rim.length, 16);
  }
});

test('defeated knights do not launch new aimed swords or retain rim hazards', () => {
  const a = createAimedSwords(battleArena);
  advanceAimedSwords(a, 0.3);
  advanceAimedSwords(a, 0.7, (owner) => owner === 'kaizo');
  assert.equal(a.swords.filter((s) => !s.scale).length, 4);
  assert.ok([...a.swords, ...a.rim].every((s) => s.owner === 'kaizo'));
});
