import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameState } from '../game/state.ts';
import type { ProgressSave } from '../persistence/types.ts';
import { defaults } from '../rooms/castle/starter.ts';
import { rememberProject, restoreLinkedSaves } from './history.ts';

test('undo snapshots own their room data, room selection, and bounded history', () => {
  const state = createGameState(defaults());
  state.roomIndex = 1;
  rememberProject(state);
  state.project.rooms[0].map[3][3] = 10;
  state.project.rooms[0].name = 'Edited';
  assert.equal(state.undoStack[0].project.rooms[0].name, 'The Waking Chamber');
  assert.notEqual(state.undoStack[0].project.rooms[0].map[3][3], 10);
  assert.equal(state.undoStack[0].roomIndex, 1);
  for (let i = 0; i < 30; i++) rememberProject(state);
  assert.equal(state.undoStack.length, 25);
});

test('undo restores removed linked saves while retaining newer saves', () => {
  const state = createGameState(defaults());
  const removed: ProgressSave = {
    version: 1,
    savedAt: 10,
    project: state.project,
    roomIndex: 0,
    player: state.player,
    story: state.story,
  };
  const newer = { ...removed, savedAt: 20 };
  const slots: unknown[] = [null, newer, null];
  restoreLinkedSaves(slots, [
    { index: 0, slot: removed },
    { index: 1, slot: removed },
  ]);
  assert.equal(slots[0], removed);
  assert.equal(slots[1], newer);
  assert.equal(slots[2], null);
});
