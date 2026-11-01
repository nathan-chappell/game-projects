import type { PartyHP } from '../../inventory/types.ts';
import type { Encounter } from './types.ts';
export const partyStatusSettings = { collapseSeconds: 0.75, reviveSeconds: 0.65 };
export const freshPartyStatus = () => ({
  Kris: { mode: 'up', age: 0 },
  Flowey: { mode: 'up', age: 0 },
  Susie: { mode: 'up', age: 0 },
  Ralsey: { mode: 'up', age: 0 },
});

// Status is tied to HP transitions, so another damage tick cannot restart a
// collapse, and any healing source can bring the standing sprite back.
export function syncPartyStatus(encounter: Encounter | null, partyHP?: PartyHP) {
  if (!encounter?.partyStatus || !partyHP) return;
  for (const name of ['dark', 'tenna'].includes(encounter.kind ?? '')
    ? (['Kris', 'Flowey', 'Susie', 'Ralsey'] as const)
    : (['Kris', 'Flowey'] as const)) {
    if (!Number.isFinite(partyHP[name])) continue;
    const status = encounter.partyStatus[name];
    if (partyHP[name] <= 0 && status.mode !== 'down') {
      status.mode = 'down';
      status.age = 0;
    } else if (partyHP[name] > 0 && status.mode === 'down') {
      status.mode = 'reviving';
      status.age = 0;
    }
  }
}

export function advancePartyStatus(encounter: Encounter, partyHP: PartyHP | undefined, dt: number) {
  syncPartyStatus(encounter, partyHP);
  for (const status of Object.values(encounter.partyStatus || {})) {
    if (status.mode === 'down') status.age = Math.min(partyStatusSettings.collapseSeconds, status.age + dt);
    else if (status.mode === 'reviving') {
      status.age = Math.min(partyStatusSettings.reviveSeconds, status.age + dt);
      if (status.age >= partyStatusSettings.reviveSeconds) {
        status.mode = 'up';
        status.age = 0;
      }
    }
  }
}
