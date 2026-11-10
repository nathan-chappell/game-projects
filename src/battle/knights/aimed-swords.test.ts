import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceAimedSwords, createAimedSwords, aimedWarningAngle } from './aimed-swords.ts';
import { battleArena } from '../shared/settings.ts';

test('third attack warns and launches exactly eight aimed big swords without mini swords', () => {
  const a = createAimedSwords(battleArena);
  const target = { x: 320, y: 165 };
  advanceAimedSwords(a, 0.3, () => true, target);
  assert.equal(a.warnings.length, 8);
  assert.equal(a.warnings.filter((s) => s.owner === 'kaizo').length, 4);
  assert.ok(a.warnings.every((s) => s.speed === 700));
  const sides = new Set<string>();
  for (const sword of a.warnings) {
    const { x, y, size } = a.arena;
    const vertical = sword.y < y || sword.y > y + size;
    sides.add(sword.y < y ? 'top' : sword.y > y + size ? 'bottom' : sword.x < x ? 'left' : 'right');
    const radiusX = 43,
      radiusY = vertical ? 16 : 43;
    assert.ok(sword.x - radiusX >= 0 && sword.x + radiusX <= 640);
    assert.ok(sword.y - radiusY >= 0 && sword.y + radiusY <= 295);
    assert.ok(
      sword.x + radiusX < x ||
        sword.x - radiusX > x + size ||
        sword.y + radiusY < y ||
        sword.y - radiusY > y + size,
    );
    if (vertical) assert.equal(aimedWarningAngle(sword, a.arena), 0);
  }
  assert.equal(sides.size, 4);
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

test('soul movement uses the third attack box and starts centered inside it', async () => {
  const { createKnightEncounter } = await import('./introduction.ts');
  const { beginEnemyAttack, soulArena, moveSoul } = await import('../shared/rules.ts');
  const b = createKnightEncounter();
  beginEnemyAttack(b, 'knightAimed', '');
  const box = b.snowAttack!.knightAimed!.arena;
  assert.deepEqual(soulArena(b), box);
  assert.deepEqual(b.soul, { x: box.x + box.size / 2, y: box.y + box.size / 2 });
  moveSoul(b, new Set(['ArrowDown']), 10);
  assert.ok(b.soul!.y < box.y + box.size);
});
