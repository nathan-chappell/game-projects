export const knightTeams = [
  { id: 'party', name: 'Kris & Friends', members: ['Kris', 'Flowey', 'Susie', 'Ralsey'] },
  { id: 'roaring', name: 'Roaring Knight', members: ['Roaring Knight'] },
  { id: 'kaizo', name: 'Kaizo Knight', members: ['Kaizo Knight'] },
] as const;
export const createKnightBattleIntro = () => ({ phase: 'introduction' as const, age: 0, teams: knightTeams });
export type KnightBattleIntro = ReturnType<typeof createKnightBattleIntro>;
