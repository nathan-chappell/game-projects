import type { Encounter } from '../shared/types.ts';
export const proceedResponses = ['...', 'K-Kris?', 'Kris! W-whatt is happening?'];
export const proceedGlitchSeconds = 1.6;

export function isProceedScene(encounter: Encounter | null): boolean {
  return ['proceedDialogue', 'proceedGlitch'].includes(encounter?.phase ?? '');
}

export function proceedDialogue(encounter: Encounter | null) {
  if (encounter?.phase !== 'proceedDialogue') return null;
  return { speaker: 'Noelle', text: proceedResponses[encounter.proceedCount - 1] };
}
