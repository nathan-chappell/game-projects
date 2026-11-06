import { removePostShowFixture } from '../../../tests/fixtures/post-show.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { clone } from '../../world/clone.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { validBuild } from '../../world/validation.ts';
import { defaults } from '../castle/starter.ts';
import { collisionConversation } from './collision-chamber.ts';
test('the new backstage arrow connects the chamber and leaves both existing routes intact', () => {
  const p = upgradeProject(defaults()),
    back = p.rooms.findIndex((r) => r.scene === 'glitchBackstage'),
    index = p.rooms.findIndex((r) => r.scene === 'collisionChamber'),
    room = p.rooms[index];
  assert.equal(p.rooms[back].doorLinks!['0,8'], index);
  assert.equal(room.doorLinks!['8,11'], back);
  assert.equal(p.rooms[p.rooms[back].doorLinks!['3,3']].scene, 'glitchStudio');
  assert.equal(p.rooms[p.rooms[back].doorLinks!['15,8']].scene, 'tennaStorage');
  assert.equal(room.map[room.spawn.y][room.spawn.x], 0);
  assert.equal(room.map[11][8], 6);
  assert.equal(room.map[9][4], 0);
  assert.deepEqual(
    collisionConversation.map((l) => l.speaker),
    ['Ralsey', 'Flowey', 'Susie'],
  );
  assert.match(collisionConversation[2].text, /No more smashing fountains/);
});
test('a full previous Build retains custom rooms and gains the chamber once', () => {
  const p = removePostShowFixture(upgradeProject(defaults()));
  p.rooms.pop();
  const back = p.rooms.find((r) => r.scene === 'glitchBackstage');
  delete back!.collisionExitVersion;
  delete back!.doorLinks!['0,8'];
  back!.map[8][0] = 1;
  for (let i = 0; i < 2; i++) {
    const r = clone(p.rooms[0]);
    r.name = `Custom ${i}`;
    p.rooms.push(r);
  }
  assert.equal(p.rooms.length, 26);
  const before = clone(p.rooms.slice(24));
  upgradeProject(p);
  assert.equal(p.rooms.length, 28);
  assert.deepEqual(p.rooms.slice(24, 26), before);
  assert.equal(back!.doorLinks!['0,8'], 26);
  assert.equal(validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: p }), true);
  const updated = clone(p);
  upgradeProject(p);
  assert.deepEqual(p, updated);
});

test('Jack and the lever upgrade existing chambers once without replacing custom tiles', () => {
  const p = upgradeProject(defaults()),
    room = p.rooms.find((r) => r.scene === 'collisionChamber');
  delete room!.jackRevealVersion;
  delete room!.jackLever;
  room!.npcs = [];
  room!.map[8][2] = 0;
  room!.map[10][3] = 4;
  upgradeProject(p);
  assert.equal(room!.npcs.filter((n) => n.id === 'jackenstein').length, 1);
  assert.equal(room!.npcs.find((n) => n.id === 'jackenstein')!.sprite, 'jackenstein');
  assert.deepEqual(room!.jackLever, { x: 2, y: 8 });
  assert.equal(room!.map[10][3], 4);
  const before = clone(room);
  upgradeProject(p);
  assert.deepEqual(room, before);
  assert.equal(validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: p }), true);
});
