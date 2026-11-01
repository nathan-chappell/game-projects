import assert from 'node:assert/strict';
import test from 'node:test';
import { freshInventory } from '../game/config.ts';
import { defaults } from '../rooms/castle/starter.ts';
import { clone } from '../world/clone.ts';
import { upgradeProject } from '../world/upgrades.ts';
import { validBuild, validProject } from '../world/validation.ts';
import { harvestTree, nextTreeItem, validTreeHarvests } from './tree-items.ts';

test('trees support Candy alone, elixirs alone, mixed supplies and empty supplies with independent depletion', () => {
  for (const [candy, tpElixirs] of [
    [2, 0],
    [0, 3],
    [2, 3],
    [0, 0],
  ]) {
    const tree = { x: 5, y: 7, candy, tpElixirs },
      bag = freshInventory(),
      harvests = {};
    for (let i = 0; i < candy + tpElixirs; i++) {
      const id = i < candy ? 'gCandy' : 'tpElixir';
      assert.equal(nextTreeItem(tree, 2, harvests), id);
      assert.equal(harvestTree(tree, 2, harvests, bag)!.id, id);
    }
    assert.equal(harvestTree(tree, 2, harvests, bag), null);
    assert.deepEqual(bag.items, { gCandy: candy, tpElixir: tpElixirs, jackCandy: 0 });
    assert.equal(validTreeHarvests(harvests), true);
  }
});

test('old Candy harvest counts stay depleted when elixirs are added; saved supplies do not respawn', () => {
  const tree = { x: 5, y: 7, candy: 2, tpElixirs: 2 },
    harvests = { '2:5,7': 2 },
    bag = freshInventory();
  assert.equal(harvestTree(tree, 2, harvests, bag)!.id, 'tpElixir');
  const saved = JSON.parse(JSON.stringify({ harvests, bag }));
  assert.equal(harvestTree(tree, 2, saved.harvests, saved.bag)!.id, 'tpElixir');
  assert.equal(harvestTree(tree, 2, saved.harvests, saved.bag), null);
  assert.equal(saved.bag.items.gCandy, 0);
  assert.equal(saved.bag.items.tpElixir, 2);
  const legacy = freshInventory();
  harvestTree({ x: 1, y: 1 }, 0, {}, legacy);
  assert.equal(legacy.items.gCandy, 1);
});

test('tree supply edits survive project upgrades, Build export/import and validation', () => {
  const project = upgradeProject(defaults());
  const tree = { x: 5, y: 7, candy: 0, tpElixirs: 6 };
  project.rooms[0].trees = [tree];
  assert.equal(validProject(project), true);
  const saved = clone(project);
  upgradeProject(saved);
  assert.deepEqual(saved, project);
  assert.equal(
    validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: saved }),
    true,
  );
  for (const value of [-1, 7, 0.5, '2', null]) {
    assert.equal(
      validProject({
        ...project,
        rooms: project.rooms.map((room, index) =>
          index === 0 ? { ...room, trees: [{ ...tree, tpElixirs: value }] } : room,
        ),
      }),
      false,
    );
  }
});

test('harvest save validation accepts legacy and per-elixir counts and rejects bad keys or supplies', () => {
  assert.equal(validTreeHarvests(undefined), true);
  assert.equal(validTreeHarvests({ '0:5,7': 2, '0:5,7:tpElixir': 6 }), true);
  for (const invalid of [
    null,
    [],
    { '0:5,7:bad': 1 },
    { '0:5,7:tpElixir': 7 },
    { '0:5,7:tpElixir': -1 },
    { '0:5,7:tpElixir': 1.5 },
  ])
    assert.equal(validTreeHarvests(invalid), false);
});
