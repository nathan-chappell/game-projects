import type { Encounter } from '../shared/types.ts';
export const darkActDefinitions: Record<string, { name: string; cost: number; description: string }> = {
  Kris: {
    name: 'Shine',
    cost: 100,
    description:
      'Shine a light. Use three times to unlock attacks and ACTs; five times to light up the room.',
  },
  Flowey: { name: 'Friendlyness Pellets', cost: 65, description: 'Deal 150 damage and heal Flowey 35 HP.' },
  Susie: { name: 'Rude Buster', cost: 70, description: 'Deal 170–230 damage.' },
  Ralsey: { name: 'Heal Player', cost: 50, description: 'Heal a random teammate below max HP by 50–70 HP.' },
};
export const darkActInfo = (b: Encounter | null) =>
  b?.kind === 'knights' && b.turn === 'Kris'
    ? {
        name: 'Hold Breath',
        cost: 0,
        description: 'The whole team takes 25% less damage for the next enemy turn.',
      }
    : darkActDefinitions[b?.turn ?? 'Kris'] || darkActDefinitions.Kris;
export const darkActLocked = (b: Encounter | null) =>
  b?.kind === 'dark' && b.turn !== 'Kris' && !b.darkUnlocked;
