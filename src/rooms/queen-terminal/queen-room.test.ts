import { removePostShowFixture } from '../../../tests/fixtures/post-show.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { present } from '../../game/invariants.ts';
import { clone } from '../../world/clone.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { validBuild } from '../../world/validation.ts';
import { defaults } from '../castle/starter.ts';
import { queenConversation, queenReminder } from './queen-room.ts';

test('the rooftop leads to Queen’s terminal with a clear route to her and back', () => {
  const p = upgradeProject(defaults()),
    roof = p.rooms.findIndex((r) => r.scene === 'neonRooftop'),
    queen = p.rooms.findIndex((r) => r.scene === 'queenPasscode'),
    room = p.rooms[queen];
  assert.equal(p.rooms[roof].doorLinks!['15,9'], queen);
  assert.equal(p.rooms[roof].map[9][15], 6);
  assert.equal(room.doorLinks!['8,11'], roof);
  assert.equal(room.map[11][8], 6);
  const seen = new Set(),
    queue = [room.spawn];
  while (queue.length) {
    const { x, y } = present(queue.shift()),
      key = `${x},${y}`;
    if (seen.has(key) || ![0, 6].includes(room.map[y]?.[x])) continue;
    seen.add(key);
    queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  assert.ok(seen.has('8,11'));
  assert.ok(seen.has('12,8'));
  assert.equal(room.npcs!.length, 1);
  assert.equal(room.npcs![0].sprite, 'queen');
  assert.equal(room.npcs![0].name, 'Queen');
  assert.deepEqual(room.spikes, []);
  assert.equal(room.map[10][5], 1);
  assert.equal(validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: p }), true);
});

test('Flowey explains the merging worlds before Queen requests help with the passcode', () => {
  const explanation = queenConversation.findIndex(
    (l) => l.speaker === 'Flowey' && /world.*fusing/i.test(l.text),
  );
  const request = queenConversation.findIndex(
    (l) => l.speaker === 'Queen' && /help with the passcode/i.test(l.text),
  );
  assert.ok(explanation >= 0 && request > explanation);
  assert.ok(queenConversation.some((l) => l.speaker === 'Flowey' && /glitches.*people/i.test(l.text)));
  assert.ok(queenReminder.some((l) => l.speaker === 'Queen' && /passcode/i.test(l.text)));
});

test('a full previous Build gains Queen’s room while retaining custom rooms and rooftop edits', () => {
  const p = removePostShowFixture(upgradeProject(defaults()));
  p.rooms = p.rooms.filter((r) => !['queenPasscode', 'collisionChamber'].includes(r.scene ?? ''));
  const roof = p.rooms.find((r) => r.scene === 'neonRooftop');
  delete roof!.queenExitVersion;
  delete roof!.doorLinks!['15,9'];
  roof!.map[9][15] = 0;
  roof!.tileColors = { '5,8': '#123456' };
  for (let i = 0; i < 2; i++) {
    const custom = clone(p.rooms[0]);
    custom.name = `Custom ${i}`;
    p.rooms.push(custom);
  }
  assert.equal(p.rooms.length, 25);
  const before = clone(p.rooms.slice(23));
  upgradeProject(p);
  assert.equal(p.rooms.length, 28);
  assert.deepEqual(p.rooms.slice(23, 25), before);
  assert.equal(p.rooms[25].scene, 'queenPasscode');
  assert.equal(roof!.doorLinks!['15,9'], 25);
  assert.equal(roof!.tileColors['5,8'], '#123456');
  assert.equal(validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: p }), true);
  const upgraded = clone(p);
  upgradeProject(p);
  assert.deepEqual(p, upgraded);
});
