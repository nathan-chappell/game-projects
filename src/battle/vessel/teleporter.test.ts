import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameState } from '../../game/state.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { defaults } from '../../rooms/castle/starter.ts';
import { vesselTeleporterPosition, teleportToVesselBattle } from './teleporter.ts';

test('teleporter enters the Vessel fight without consuming resources or consuming resources', () => {
  const state = createGameState(upgradeProject(defaults()));
  state.partyHP.Flowey = 45;
  state.keys.add('right');
  const before = structuredClone({ hp: state.partyHP, inventory: state.inventory, story: state.story });
  let destination = -1;
  assert.equal(
    teleportToVesselBattle(state, (index) => {
      destination = index;
      state.roomIndex = index;
      return true;
    }),
    true,
  );
  assert.equal(state.project.rooms[destination].scene, 'mysteriousVoid');
  assert.equal(state.bossEncounter?.kind, 'vessel');
  assert.equal(state.bossEncounter?.enemy.hp, 10000);
  assert.equal(state.vesselArrival?.phase, 'battle');
  assert.equal(state.knightBattle, null);
  assert.equal(state.keys.size, 0);
  assert.deepEqual({ hp: state.partyHP, inventory: state.inventory, story: state.story }, before);
  state.bossEncounter = null;
  state.vesselArrival = null;
  assert.equal(
    teleportToVesselBattle(state, () => false),
    false,
  );
  state.project.rooms = state.project.rooms.filter((r) => r.scene !== 'mysteriousVoid');
  assert.equal(
    teleportToVesselBattle(state, () => {
      throw new Error('Missing destination must not navigate');
    }),
    false,
  );
});
test('teleporter does not interrupt building or dialogue', () => {
  const state = createGameState(upgradeProject(defaults()));
  state.mode = 'build';
  assert.equal(
    teleportToVesselBattle(state, () => {
      throw new Error('Blocked teleport must not navigate');
    }),
    false,
  );
  state.mode = 'play';
  state.dialogue = { lines: [], index: 0, shown: 0, kind: 'intro' };
  assert.equal(
    teleportToVesselBattle(state, () => {
      throw new Error('Blocked teleport must not navigate');
    }),
    false,
  );
  assert.equal(state.bossEncounter, null);
});
test('portal sits on accessible floor near the first spawn without editing saved room tiles', () => {
  const state = createGameState(upgradeProject(defaults()));
  const map = structuredClone(state.project.rooms[0].map);
  assert.deepEqual(vesselTeleporterPosition(state), { x: 420, y: 300 });
  assert.deepEqual(state.project.rooms[0].map, map);
  state.roomIndex = 1;
  assert.equal(vesselTeleporterPosition(state), null);
});
