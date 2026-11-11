import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameState } from '../../game/state.ts';
import { defaults } from '../../rooms/castle/starter.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import {
  beginVesselConversation,
  completeVesselConversation,
  completeVesselQuestion,
  advanceVesselAppearance,
  vesselConversation,
} from './entrance.ts';
import { battlePartyNames, canPartyAct, canControlSoul } from '../shared/availability.ts';

function fixture() {
  const state = createGameState(upgradeProject(defaults()));
  state.roomIndex = state.project.rooms.findIndex((r) => r.scene === 'mysteriousVoid');
  return state;
}
test('Vessel waits for both dialogue lines before appearing and starts one battle after the fade', () => {
  const state = fixture();
  state.partyHP.Flowey = 45;
  const before = structuredClone({ hp: state.partyHP, inventory: state.inventory });
  assert.deepEqual(vesselConversation, ['[Flowey] * Where are we?', "[Ralsey] * I don't know..."]);
  assert.equal(beginVesselConversation(state), true);
  assert.equal(beginVesselConversation(state), false);
  assert.equal(advanceVesselAppearance(state, 20), false);
  assert.equal(state.bossEncounter, null);
  assert.equal(completeVesselConversation(state), true);
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(advanceVesselAppearance(state, dt), false);
  assert.equal(advanceVesselAppearance(state, 1), false);
  assert.equal(state.bossEncounter, null);
  assert.equal(advanceVesselAppearance(state, 2.2), true);
  assert.equal(state.vesselArrival?.phase, 'question');
  assert.equal(state.bossEncounter, null);
  assert.equal(advanceVesselAppearance(state, 10), false);
  assert.equal(completeVesselQuestion(state), true);
  assert.equal(completeVesselQuestion(state), false);
  const b = state.bossEncounter!;
  assert.equal(b.kind, 'vessel');
  assert.equal(b.enemy.name, 'Vessel');
  assert.equal(b.enemy.hp, 10000);
  assert.equal(b.enemy.maxHP, 10000);
  assert.equal(b.phase, 'vesselFaceoff');
  assert.equal(canPartyAct(b), false);
  assert.equal(canControlSoul(b), false);
  assert.deepEqual(battlePartyNames(b), ['Kris', 'Flowey', 'Susie', 'Ralsey']);
  assert.equal(b.finalAttackPending, false);
  assert.equal(advanceVesselAppearance(state, 2), false);
  assert.equal(state.bossEncounter, b);
  assert.deepEqual({ hp: state.partyHP, inventory: state.inventory }, before);
});
test('arrival does not interrupt another conversation or start outside the mysterious room', () => {
  const state = fixture();
  state.roomIndex = 0;
  assert.equal(beginVesselConversation(state), false);
  state.roomIndex = state.project.rooms.findIndex((r) => r.scene === 'mysteriousVoid');
  state.dialogue = { lines: [], index: 0, shown: 0, kind: 'intro' };
  assert.equal(beginVesselConversation(state), false);
});
