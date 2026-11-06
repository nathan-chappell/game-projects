import { removePostShowFixture } from '../../../tests/fixtures/post-show.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { clone } from '../../world/clone.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { validBuild, validProject } from '../../world/validation.ts';
import { defaults } from '../castle/starter.ts';
import {
  advanceTennaEntrance,
  createTennaEntrance,
  tennaArrivalConversation,
  tennaArrivalSettings,
  tennaBackstageConversation,
  tennaEntrancePose,
} from './tenna-story.ts';

test('Tenna jumps from offscreen, lands before talking, and leaves only after the conversation', () => {
  const scene = createTennaEntrance();
  assert.equal(scene.stage, 'jump');
  assert.ok(tennaEntrancePose(scene)!.x > 640);
  advanceTennaEntrance(scene, tennaArrivalSettings.jump / 2);
  assert.ok(tennaEntrancePose(scene)!.y < 300);
  assert.equal(scene.stage, 'jump');
  const full = tennaArrivalSettings.jump + tennaArrivalSettings.land;
  assert.equal(advanceTennaEntrance(scene, full - tennaArrivalSettings.jump / 2), 'talk');
  assert.equal(scene.stage, 'talk');
  assert.equal(tennaEntrancePose(scene)!.x, 470);
  assert.equal(advanceTennaEntrance(scene, 1), null, 'talk transition is not emitted twice');
  scene.stage = 'depart';
  scene.age = 0;
  advanceTennaEntrance(scene, tennaArrivalSettings.leave / 2);
  assert.ok(tennaEntrancePose(scene)!.x > 470);
  assert.ok(tennaEntrancePose(scene)!.y < 360);
  assert.equal(advanceTennaEntrance(scene, tennaArrivalSettings.leave / 2), 'done');
});

test('reduced motion keeps the host grounded during his entrance and departure', () => {
  const scene = createTennaEntrance();
  scene.age = 0.3;
  assert.deepEqual(tennaEntrancePose(scene, true), { x: 470, y: 360, scaleX: 1, scaleY: 1 });
  scene.stage = 'depart';
  assert.deepEqual(tennaEntrancePose(scene, true), { x: 470, y: 360, scaleX: 1, scaleY: 1 });
});

test('backstage is connected in both directions, contains Tenna alone as an NPC, and survives save/export/upgrades', () => {
  const p = upgradeProject(defaults()),
    studioIndex = p.rooms.findIndex((r) => r.scene === 'glitchStudio'),
    backstageIndex = p.rooms.findIndex((r) => r.scene === 'glitchBackstage'),
    room = p.rooms[backstageIndex];
  assert.equal(p.rooms[studioIndex].doorLinks!['15,8'], backstageIndex);
  assert.equal(p.rooms[studioIndex].map[8][15], 6);
  assert.equal(room.doorLinks!['3,3'], studioIndex);
  assert.equal(room.npcs!.length, 1);
  assert.equal(room.npcs![0].name, 'Tenna');
  assert.equal(room.npcs![0].sprite, 'tenna');
  assert.ok(room.map[room.spawn.y][room.spawn.x] === 0);
  assert.deepEqual(room.spikes, []);
  assert.equal(validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: p }), true);
  room.tileColors = { '5,8': '#123456' };
  room.npcs![0].x = 9;
  const saved = clone(p);
  upgradeProject(p);
  assert.deepEqual(p, saved);
});

test('a full older Build gains backstage without overwriting custom rooms', () => {
  const p = removePostShowFixture(upgradeProject(defaults()));
  p.rooms = p.rooms.filter(
    (r) =>
      ![
        'glitchBackstage',
        'tennaStorage',
        'storageHallway',
        'trafficCrossing',
        'neonRooftop',
        'queenPasscode',
        'collisionChamber',
      ].includes(r.scene ?? ''),
  );
  const studio = p.rooms.find((r) => r.scene === 'glitchStudio');
  delete studio!.backstageExitVersion;
  delete studio!.doorLinks!['15,8'];
  studio!.map[8][15] = 1;
  for (let i = 0; i < 2; i++) {
    const room = clone(p.rooms[0]);
    room.name = `Custom ${i}`;
    p.rooms.push(room);
  }
  assert.equal(p.rooms.length, 20);
  const before = clone(p.rooms);
  upgradeProject(p);
  assert.equal(p.rooms.length, 28);
  assert.equal(p.rooms[20].scene, 'glitchBackstage');
  assert.deepEqual(p.rooms[18], before[18]);
  assert.deepEqual(p.rooms[19], before[19]);
  assert.equal(studio!.doorLinks!['15,8'], 20);
  assert.equal(validProject(p), true);
});

test('the host invitation includes the requested greeting, worlds explanation and backstage meeting', () => {
  assert.ok(tennaArrivalConversation.some((l) => l.speaker === 'Tenna' && /TV TIME!!!!!/.test(l.text)));
  assert.ok(tennaArrivalConversation.some((l) => l.speaker === 'Susie' && l.text === 'Not now.'));
  assert.ok(tennaArrivalConversation.some((l) => l.speaker === 'Flowey' && /worlds are fusing/.test(l.text)));
  assert.ok(tennaArrivalConversation.some((l) => l.speaker === 'Tenna' && /meet me backstage/i.test(l.text)));
  assert.equal(tennaBackstageConversation[0].speaker, 'Flowey');
});
