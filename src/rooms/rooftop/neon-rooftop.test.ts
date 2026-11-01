import assert from 'node:assert/strict';
import test from 'node:test';
import { clone } from '../../world/clone.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { validBuild } from '../../world/validation.ts';
import { defaults } from '../castle/starter.ts';

test('the next room connects to the safe side of the crossing and has a clear green walkway', () => {
  const p = upgradeProject(defaults()),
    cross = p.rooms.findIndex((r) => r.scene === 'trafficCrossing'),
    roof = p.rooms.findIndex((r) => r.scene === 'neonRooftop'),
    room = p.rooms[roof];
  assert.equal(p.rooms[cross].doorLinks!['15,7'], roof);
  assert.equal(p.rooms[cross].map[7][15], 6);
  assert.equal(room.doorLinks!['0,9'], cross);
  assert.equal(room.map[9][0], 6);
  assert.equal(room.map[room.spawn.y][room.spawn.x], 0);
  for (let x = 0; x < 16; x++) {
    assert.ok([0, 6].includes(room.map[9][x]));
    assert.equal(room.map[8][x], 0);
  }
  assert.deepEqual(room.npcs, []);
  assert.deepEqual(room.spikes, []);
  assert.deepEqual(room.dialogue, []);
  assert.equal(validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: p }), true);
});

test('a full previous Build gains the rooftop without overwriting custom rooms or the save star', () => {
  const p = upgradeProject(defaults());
  p.rooms = p.rooms.filter(
    (r) => !['queenPasscode', 'neonRooftop', 'collisionChamber'].includes(r.scene ?? ''),
  );
  const crossing = p.rooms.find((r) => r.scene === 'trafficCrossing');
  delete crossing!.rooftopExitVersion;
  delete crossing!.doorLinks!['15,7'];
  crossing!.map[7][15] = 0;
  crossing!.tileColors = { '10,3': '#123456' };
  for (let i = 0; i < 2; i++) {
    const room = clone(p.rooms[0]);
    room.name = `Custom ${i}`;
    p.rooms.push(room);
  }
  assert.equal(p.rooms.length, 24);
  const custom = clone(p.rooms.slice(22));
  upgradeProject(p);
  assert.equal(p.rooms.length, 27);
  assert.equal(p.rooms[24].scene, 'neonRooftop');
  assert.deepEqual(p.rooms.slice(22, 24), custom);
  assert.equal(crossing!.tileColors['10,3'], '#123456');
  assert.deepEqual(crossing!.savePoints, [{ x: 15, y: 8 }]);
  assert.equal(crossing!.doorLinks!['15,7'], 24);
  assert.equal(validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: p }), true);
  const before = clone(p);
  upgradeProject(p);
  assert.deepEqual(p, before);
});

test('the rooftop entrance preserves an object that occupies the preferred crossing exit', () => {
  const p = upgradeProject(defaults()),
    crossing = p.rooms.find((r) => r.scene === 'trafficCrossing');
  p.rooms = p.rooms.filter(
    (r) => !['queenPasscode', 'neonRooftop', 'collisionChamber'].includes(r.scene ?? ''),
  );
  delete crossing!.rooftopExitVersion;
  delete crossing!.doorLinks!['15,7'];
  crossing!.map[7][15] = 0;
  crossing!.trees = [{ x: 15, y: 7, candy: 2 }];
  upgradeProject(p);
  assert.equal(crossing!.map[7][15], 0);
  assert.deepEqual(crossing!.trees, [{ x: 15, y: 7, candy: 2 }]);
  assert.equal(p.rooms[crossing!.doorLinks!['15,6']].scene, 'neonRooftop');
});
