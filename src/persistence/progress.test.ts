import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameState } from '../game/state.ts';
import { defaults } from '../rooms/castle/starter.ts';
import { clone } from '../world/clone.ts';
import { normalizeInventory, validInventory, validProgress } from './progress.ts';

const legacySlot = () => ({
  version: 1,
  savedAt: 12,
  project: defaults(),
  roomIndex: 0,
  player: { x: 300, y: 380, facing: 'down' },
  story: {
    met: false,
    joined: false,
    explained: false,
    foundFountain: false,
    fountainWorse: false,
    teamJoined: false,
    dived: false,
  },
});

test('older adventure slots retain optional defaults and reject malformed input', () => {
  assert.equal(validProgress(legacySlot()), true);
  for (const value of [
    null,
    {},
    [],
    { ...legacySlot(), roomIndex: 100 },
    { ...legacySlot(), player: { x: -1, y: 0, facing: 'down' } },
  ])
    assert.equal(validProgress(value), false);
  const slot = legacySlot();
  assert.equal(validProgress({ ...slot, story: { ...slot.story, teamJoined: true, joined: false } }), false);
  assert.equal(validProgress({ ...slot, story: { ...slot.story, queenSolved: 'yes' } }), false);
});

test('legacy candy totals normalize without double-counting teammates or sharing data', () => {
  const legacy = { gCandy: 3, heldCandy: { Kris: 1, Flowey: 1, Ralsey: 1, Susie: 0 } };
  assert.equal(validInventory(legacy), true);
  assert.deepEqual(normalizeInventory(legacy), { items: { gCandy: 3, tpElixir: 0, jackCandy: 0 } });
  assert.equal(validInventory({ ...legacy, gCandy: 4 }), false);
  const inventory = createGameState(defaults()).inventory;
  const copy = normalizeInventory(inventory);
  copy.items.gCandy = 6;
  assert.equal(inventory.items.gCandy, 0);
});

test('runtime state starts with independent values and serialized snapshots retain story flags', () => {
  const state = createGameState(defaults());
  state.story.noelleEscaped = true;
  state.story.jackCandyReceived = true;
  state.story.queenSolved = true;
  const slot = { ...legacySlot(), story: clone(state.story) };
  assert.equal(validProgress(slot), true);
  assert.equal(slot.story.noelleEscaped, true);
  assert.equal(createGameState(defaults()).story.noelleEscaped, false);
});
