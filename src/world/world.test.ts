import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { freshInventory, freshPartyHP } from '../game/config.ts';
import { defaults } from '../rooms/castle/starter.ts';
import { clone } from './clone.ts';
import { upgradeProject } from './upgrades.ts';
import { validBuild, validProject } from './validation.ts';

const originalWorld = JSON.parse(
  await readFile(new URL('../../tests/fixtures/original-world.json', import.meta.url), 'utf8'),
);

test('the starter world keeps its existing rooms while appending the studio and storage route', () => {
  const project = upgradeProject(defaults());
  assert.ok(validProject(project));
  const legacy = clone(project),
    passage = legacy.rooms.pop(),
    chamber = legacy.rooms.pop(),
    queen = legacy.rooms.pop(),
    roof = legacy.rooms.pop(),
    traffic = legacy.rooms.pop(),
    hall = legacy.rooms.pop(),
    storage = legacy.rooms.pop(),
    backstage = legacy.rooms.pop(),
    studio = legacy.rooms.pop();
  assert.equal(passage!.scene, 'postShowPassage');
  assert.equal(chamber!.scene, 'collisionChamber');
  assert.equal(queen!.scene, 'queenPasscode');
  assert.equal(roof!.scene, 'neonRooftop');
  assert.equal(traffic!.scene, 'trafficCrossing');
  assert.equal(hall!.scene, 'storageHallway');
  assert.equal(storage!.scene, 'tennaStorage');
  assert.equal(backstage!.scene, 'glitchBackstage');
  assert.equal(studio!.scene, 'glitchStudio');
  const boss = legacy.rooms.find((room) => room.scene === 'glitchBoss');
  boss!.map[8][15] = 0;
  delete boss!.doorLinks!['15,8'];
  delete boss!.glitchStudioExitVersion;
  assert.deepEqual(legacy, originalWorld);
});

test('room upgrades can run repeatedly without resetting a saved Build', () => {
  const project = upgradeProject(clone(originalWorld));
  const room = project.rooms.find((room) => room.scene === 'glitchWorld');
  room!.name = "Lenny's room";
  room!.tileColors = { '3,6': '#123456' };
  room!.trees = [{ x: 5, y: 7, candy: 6, canopyColor: '#126622', renderLayer: 'back' }];
  room!.glitchPoints = [];
  room!.savePoints = [];
  room!.map[6][15] = 10;
  delete room!.doorLinks!['15,6'];
  const expected = clone(project);
  upgradeProject(project);
  upgradeProject(project);
  assert.deepEqual(project, expected);
  assert.ok(validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project }));
});

test('a two-room older project still upgrades to the complete world', () => {
  const old = defaults();
  old.rooms[0].name = 'My old bedroom';
  assert.equal(old.rooms.length, 2);
  assert.ok(validProject(old));
  const upgraded = upgradeProject(old);
  assert.equal(upgraded.rooms[0].name, 'My old bedroom');
  assert.equal(upgraded.rooms.length, originalWorld.rooms.length + 9);
  assert.ok(validProject(upgraded));
});

test('new adventures get separate health and inventory objects', () => {
  const firstHP = freshPartyHP();
  firstHP.Kris = 10;
  assert.equal(freshPartyHP().Kris, 100);
  const firstBag = freshInventory();
  firstBag.items.gCandy = 2;
  assert.equal(freshInventory().items.gCandy, 0);
});
