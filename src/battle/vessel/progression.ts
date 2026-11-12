import { beginVesselTransfer } from './soul-transfer.ts';
import type { Encounter } from '../shared/types.ts';

export const vesselAttackPatterns = ['rain', 'edges', 'bombs', 'jump'] as const;

export function vesselAttackAvailable(encounter: Encounter, number: number) {
  return (
    encounter.kind === 'vessel' &&
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 4 &&
    !encounter.vesselClearedAttacks?.includes(number)
  );
}

export function nextVesselAttackIndex(encounter: Encounter) {
  for (let offset = 0; offset < vesselAttackPatterns.length; offset++) {
    const index = (encounter.enemyAttackCount + offset) % vesselAttackPatterns.length;
    if (vesselAttackAvailable(encounter, index + 1)) return index;
  }
  return undefined;
}

export function markVesselAttackCleared(encounter: Encounter) {
  if (
    encounter.kind !== 'vessel' ||
    encounter.phase !== 'enemy' ||
    encounter.snowAttack?.direction !== 'vesselRain'
  )
    return;
  const number = vesselAttackPatterns.indexOf(encounter.snowAttack.vesselRain.pattern) + 1;
  encounter.vesselClearedAttacks ??= [];
  if (!encounter.vesselClearedAttacks.includes(number)) encounter.vesselClearedAttacks.push(number);
}

export function beginClearedVesselScene(encounter: Encounter) {
  if (encounter.kind !== 'vessel' || nextVesselAttackIndex(encounter) !== undefined) return false;
  return beginVesselTransfer(encounter);
}
