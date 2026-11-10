import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameState } from '../../game/state.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { defaults } from '../../rooms/castle/starter.ts';
import { knightTeleporterPosition, teleportToKnightPath } from './teleporter.ts';

test('teleporter enters the long statue path without starting a fight or consuming resources', () => {
  const state = createGameState(upgradeProject(defaults()));
  state.partyHP.Flowey = 45;
  state.keys.add('right');
  const before = structuredClone({ hp: state.partyHP, inventory: state.inventory, story: state.story });
  let destination = -1;
  assert.equal(
    teleportToKnightPath(state, (index) => {
      destination = index;
      return true;
    }),
    true,
  );
  assert.equal(state.project.rooms[destination].scene, 'postShowPassage');
  assert.equal(state.bossEncounter, null);
  assert.equal(state.knightBattle, null);
  assert.equal(state.keys.size, 0);
  assert.deepEqual({ hp: state.partyHP, inventory: state.inventory, story: state.story }, before);
  assert.equal(
    teleportToKnightPath(state, () => false),
    false,
  );
  state.project.rooms = state.project.rooms.filter((r) => r.scene !== 'postShowPassage');
  assert.equal(
    teleportToKnightPath(state, () => {
      throw new Error('Missing destination must not navigate');
    }),
    false,
  );
});
test('teleporter does not interrupt building or dialogue', () => {
  const state = createGameState(upgradeProject(defaults()));
  state.mode = 'build';
  assert.equal(
    teleportToKnightPath(state, () => {
      throw new Error('Blocked teleport must not navigate');
    }),
    false,
  );
  state.mode = 'play';
  state.dialogue = { lines: [], index: 0, shown: 0, kind: 'intro' };
  assert.equal(
    teleportToKnightPath(state, () => {
      throw new Error('Blocked teleport must not navigate');
    }),
    false,
  );
  assert.equal(state.bossEncounter, null);
});
test('portal sits on accessible floor near the first spawn without editing saved room tiles', () => {
  const state = createGameState(upgradeProject(defaults()));
  const map = structuredClone(state.project.rooms[0].map);
  assert.deepEqual(knightTeleporterPosition(state), { x: 420, y: 300 });
  assert.deepEqual(state.project.rooms[0].map, map);
  state.roomIndex = 1;
  assert.equal(knightTeleporterPosition(state), null);
});
