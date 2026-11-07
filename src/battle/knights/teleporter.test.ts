import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameState } from '../../game/state.ts';
import { defaults } from '../../rooms/castle/starter.ts';
import { knightTeleporterPosition, teleportToKnightBattle } from './teleporter.ts';

test('teleporter starts the knight battle immediately without changing the adventure or resources', () => {
  const state = createGameState(defaults());
  state.partyHP.Flowey = 45;
  state.keys.add('right');
  const before = structuredClone({
    story: state.story,
    hp: state.partyHP,
    inventory: state.inventory,
    project: state.project,
  });
  assert.equal(teleportToKnightBattle(state), true);
  assert.equal(state.bossEncounter?.kind, 'knights');
  assert.equal(state.bossEncounter?.turn, 'Kris');
  assert.equal(state.bossEncounter?.phase, 'kris');
  assert.equal(state.bossEncounter?.enemy.hp, 20000);
  assert.equal(state.bossEncounter?.knightEnemies?.kaizo.hp, 30000);
  assert.equal(state.knightBattle?.teams.length, 3);
  assert.equal(state.keys.size, 0);
  assert.deepEqual(
    { story: state.story, hp: state.partyHP, inventory: state.inventory, project: state.project },
    before,
  );
  const battle = state.bossEncounter;
  assert.equal(teleportToKnightBattle(state), false);
  assert.equal(state.bossEncounter, battle);
});
test('teleporter does not interrupt building or dialogue', () => {
  const state = createGameState(defaults());
  state.mode = 'build';
  assert.equal(teleportToKnightBattle(state), false);
  state.mode = 'play';
  state.dialogue = { lines: [], index: 0, shown: 0, kind: 'intro' };
  assert.equal(teleportToKnightBattle(state), false);
  assert.equal(state.bossEncounter, null);
});
test('portal sits on accessible floor near the first spawn without editing saved room tiles', () => {
  const state = createGameState(defaults());
  const map = structuredClone(state.project.rooms[0].map);
  assert.deepEqual(knightTeleporterPosition(state), { x: 420, y: 300 });
  assert.deepEqual(state.project.rooms[0].map, map);
  state.roomIndex = 1;
  assert.equal(knightTeleporterPosition(state), null);
});
