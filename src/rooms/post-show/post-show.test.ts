import assert from 'node:assert/strict';
import test from 'node:test';
import { defaults } from '../castle/starter.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { clone } from '../../world/clone.ts';
import { validProject } from '../../world/validation.ts';
import { addPostShowPassage, postShowDoorLocked, postShowScene } from './post-show.ts';
import { removePostShowFixture } from '../../../tests/fixtures/post-show.ts';

test('the post-show path connects both legs and has a return door; only the completed Finale unlocks it', () => {
  const p = upgradeProject(defaults());
  const back = p.rooms.find((r) => r.scene === 'glitchBackstage')!;
  const room = p.rooms.find((r) => r.scene === postShowScene)!;
  const [cell, target] = Object.entries(back.doorLinks!).find(([, i]) => p.rooms[i] === room)!;
  const [x, y] = cell.split(',').map(Number);
  assert.equal(postShowDoorLocked(back, x, y, p, false), true);
  assert.equal(postShowDoorLocked(back, x, y, p, true), false);
  assert.equal(p.rooms[target], room);
  assert.equal(p.rooms[room.doorLinks!['1,1']], back);
  assert.equal(room.backgroundColor, '#000000');
  const seen = new Set<string>();
  const queue = [room.spawn];
  for (const point of queue) {
    const key = `${point.x},${point.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = point.x + dx,
        y = point.y + dy;
      if ([0, 6].includes(room.map[y]?.[x])) queue.push({ x, y });
    }
  }
  assert.ok(seen.has('14,9'));
  assert.ok(seen.has('1,1'));
  assert.equal(room.map[7][7], 1);
  assert.equal(validProject(p), true);
});

test('older full builds retain custom rooms and upgrades never reset new-room edits', () => {
  const p = removePostShowFixture(upgradeProject(defaults()));
  for (let i = 0; i < 2; i++) p.rooms.push(clone(p.rooms[0]));
  const before = clone(p.rooms);
  addPostShowPassage(p);
  assert.equal(p.rooms.length, 28);
  assert.deepEqual(p.rooms.slice(25, 27), before.slice(25, 27));
  const room = p.rooms.at(-1)!;
  room.name = 'My quiet passage';
  room.map[9][10] = 1;
  const updated = clone(p);
  upgradeProject(p);
  assert.deepEqual(p, updated);
  assert.equal(validProject(p), true);
});
