import { createEncounter } from '../shared/rules.ts';
import type { Encounter } from '../shared/types.ts';

export function createKnightEncounter(): Encounter {
  const encounter = createEncounter();
  encounter.kind = 'knights';
  encounter.knightEnemies = {
    roaring: { name: 'Roaring Knight', hp: 20000, maxHP: 20000, visible: true },
    kaizo: { name: 'Kaizo Knight', hp: 30000, maxHP: 30000, visible: true },
  };
  encounter.knightTarget = 'roaring';
  encounter.enemy = encounter.knightEnemies.roaring;
  encounter.phase = 'kris';
  encounter.selectedAction = 'act';
  return encounter;
}

export const knightTeams = [
  { id: 'party', name: 'Kris & Friends', members: ['Kris', 'Flowey', 'Susie', 'Ralsey'] },
  { id: 'roaring', name: 'Roaring Knight', members: ['Roaring Knight'] },
  { id: 'kaizo', name: 'Kaizo Knight', members: ['Kaizo Knight'] },
] as const;
export const createKnightBattleIntro = () => ({ phase: 'introduction' as const, age: 0, teams: knightTeams });
export type KnightBattleIntro = ReturnType<typeof createKnightBattleIntro>;
