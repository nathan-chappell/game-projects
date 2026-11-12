import { vesselSettings } from './combat.ts';
import type { GameState } from '../../game/types.ts';
import { createEncounter } from '../shared/rules.ts';

export const vesselConversation = ['[Flowey] * Where are we?', "[Ralsey] * I don't know..."];
export const vesselAppearanceSeconds = 3.2;
export interface VesselArrival {
  phase: 'dialogue' | 'appear' | 'question' | 'battle';
  age: number;
}
export function beginVesselConversation(state: GameState) {
  if (
    state.project.rooms[state.roomIndex]?.scene !== 'mysteriousVoid' ||
    state.vesselArrival ||
    state.bossEncounter ||
    state.dialogue
  )
    return false;
  state.vesselArrival = { phase: 'dialogue', age: 0 };
  state.keys.clear();
  state.player.moving = false;
  return true;
}
export function completeVesselConversation(state: GameState) {
  if (state.vesselArrival?.phase !== 'dialogue') return false;
  state.vesselArrival = { phase: 'appear', age: 0 };
  state.keys.clear();
  return true;
}
export function createVesselEncounter() {
  const encounter = createEncounter();
  encounter.kind = 'vessel';
  encounter.vesselClearedAttacks = [];
  encounter.enemy = {
    ...encounter.enemy,
    name: 'Vessel',
    hp: vesselSettings.hp,
    maxHP: vesselSettings.hp,
    visible: true,
  };
  encounter.vesselQuestionAsked = false;
  encounter.phase = 'vesselFaceoff';
  encounter.turn = 'Vessel';
  encounter.message = 'The Vessel silently raises its blade.';
  return encounter;
}
export function advanceVesselAppearance(state: GameState, dt: number) {
  const arrival = state.vesselArrival;
  if (arrival?.phase !== 'appear' || !Number.isFinite(dt) || dt <= 0 || state.dialogue || state.bossEncounter)
    return false;
  arrival.age = Math.min(vesselAppearanceSeconds, arrival.age + dt);
  state.keys.clear();
  state.player.moving = false;
  if (arrival.age < vesselAppearanceSeconds - 1e-9) return false;
  arrival.phase = 'question';
  return true;
}

export function completeVesselQuestion(state: GameState) {
  if (
    state.vesselArrival?.phase !== 'question' ||
    (state.bossEncounter && state.bossEncounter.kind !== 'vessel')
  )
    return false;
  state.vesselArrival.phase = 'battle';
  state.bossEncounter ??= createVesselEncounter();
  state.bossEncounter.vesselQuestionAsked = true;
  state.keys.clear();
  return true;
}
