import assert from 'node:assert/strict';
import test from 'node:test';
import { defaults } from '../castle/starter.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { validProject } from '../../world/validation.ts';
import { addMysteriousVoid } from './room.ts';

test('the mysterious room upgrades once and keeps the marked left entrance on solid platform floor', () => {
  const p = upgradeProject(defaults());
  const room = p.rooms.find((r) => r.scene === 'mysteriousVoid')!;
  assert.ok(validProject(p));
  assert.equal(room.map[room.spawn.y][room.spawn.x], 0);
  assert.equal(room.spawn.x, 4);
  assert.equal(room.backgroundColor, '#000000');
  assert.equal(room.map[4][4], 1);
  assert.equal(room.map[9][4], 1);
  assert.equal(room.map[6][3], 1);
  assert.equal(room.map[6][13], 1);
  room.map[6][8] = 9;
  const before = structuredClone(p);
  addMysteriousVoid(p);
  assert.deepEqual(p, before);
});
