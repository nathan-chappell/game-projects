import { present } from '../../game/invariants.ts';
import type { PartyName } from '../../inventory/types.ts';
import type { Encounter } from './types.ts';

export function canKrisAct(encounter: Encounter | null) {
  return encounter?.phase === 'kris' && encounter.turn === 'Kris';
}

export function canFloweyAct(encounter: Encounter | null) {
  return encounter?.phase === 'flowey' && encounter.turn === 'Flowey';
}

export const battlePartyNames: (encounter: Encounter | null) => PartyName[] = (
  encounter: Encounter | null,
) =>
  ['dark', 'tenna'].includes(encounter?.kind ?? '')
    ? ['Kris', 'Flowey', 'Susie', 'Ralsey']
    : ['Kris', 'Flowey'];

export function canPartyAct(encounter: Encounter | null): boolean {
  return (
    canKrisAct(encounter) ||
    canFloweyAct(encounter) ||
    (['dark', 'tenna'].includes(encounter?.kind ?? '') &&
      ['Susie', 'Ralsey'].includes(encounter?.turn ?? '') &&
      present(encounter).phase === present(present(encounter).turn).toLowerCase())
  );
}

export function canUseBattleAction(encounter: Encounter | null, action: string): boolean {
  return (
    !!encounter &&
    canPartyAct(encounter) &&
    (action !== 'spare' || ['dark', 'tenna'].includes(encounter.kind ?? '')) &&
    !(encounter.kind === 'dark' && action === 'attack' && !encounter.darkUnlocked) &&
    (!encounter.finalAttackComplete || (canKrisAct(encounter) && action === 'attack'))
  );
}

export function canControlSoul(encounter: Encounter | null): encounter is Encounter & {
  soul: NonNullable<Encounter['soul']>;
  snowAttack: NonNullable<Encounter['snowAttack']>;
} {
  return encounter?.phase === 'enemy' && !!encounter.soul;
}

/** Call after checking that a party action is available. */
export function partyTurnMember(encounter: Encounter): PartyName {
  const name = encounter.turn;
  if (name === 'Kris' || name === 'Flowey' || name === 'Susie' || name === 'Ralsey') return name;
  throw new Error('A party turn must identify a party member.');
}
