import type { Encounter } from '../shared/types.ts';

export function knightDamage(encounter: Encounter, action: 'attack' | 'act') {
  const basic = encounter.knightTarget === 'kaizo' ? 10 : 20;
  return basic + (action === 'act' ? 10 : 0);
}
