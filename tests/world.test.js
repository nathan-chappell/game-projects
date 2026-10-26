import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaults, upgradeProject, validProject, validBuild, clone } from '../src/world.js';
import { freshPartyHP, freshInventory } from '../src/config.js';

const originalWorld = JSON.parse(await readFile(new URL('./fixtures/original-world.json', import.meta.url), 'utf8'));

test('the refactored starter world matches the existing game', () => {
  const project = upgradeProject(defaults());
  assert.ok(validProject(project));
  assert.deepEqual(project, originalWorld);
});

test('room upgrades can run repeatedly without resetting a saved Build', () => {
  const project = clone(originalWorld);
  const room = project.rooms.find((room) => room.scene === 'glitchWorld');
  room.name = "Lenny's room";
  room.tileColors = { '3,6': '#123456' };
  room.trees = [{ x: 5, y: 7, candy: 6, canopyColor: '#126622', renderLayer: 'back' }];
  room.glitchPoints = [];
  room.savePoints = [];
  room.map[6][15] = 10;
  delete room.doorLinks['15,6'];
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
  assert.equal(upgraded.rooms.length, originalWorld.rooms.length);
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
