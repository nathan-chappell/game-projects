import type { Encounter } from '../shared/types.ts';
import { vesselBattleLayout } from './combat.ts';

export const vesselEntryLines = [
  'You entered the Vessel.',
  'Its the thing you where looking for.',
  'You nearly destroyed the World,',
  'didnt you?',
  'Looking for your discarded Vessel...',
  'now, you face the concicuences.',
];
export const vesselEntryText = vesselEntryLines.join('\n');
export const vesselTransferSettings = {
  exit: 0.8,
  arrive: 2.8,
  absorb: 3.3,
  blackout: 4.1,
  textStart: 4.5,
  lettersPerSecond: 32,
};
const endAge =
  vesselTransferSettings.textStart + vesselEntryText.length / vesselTransferSettings.lettersPerSecond;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function isVesselTransfer(encounter: Encounter | null) {
  return encounter?.kind === 'vessel' && ['vesselTransfer', 'vesselEntered'].includes(encounter.phase);
}
export function vesselTransferFrame(age: number, reduced = false) {
  const settings = vesselTransferSettings;
  const exit = clamp(age / settings.exit),
    raw = clamp((age - settings.exit) / (settings.arrive - settings.exit));
  const travel = raw * raw * (3 - 2 * raw),
    absorbed = clamp((age - settings.arrive) / (settings.absorb - settings.arrive));
  const origin = { x: vesselBattleLayout.kris.x, y: vesselBattleLayout.kris.y - 35 };
  const target = { x: vesselBattleLayout.vessel.x, y: vesselBattleLayout.vessel.y - 55 };
  return {
    soul: {
      x: origin.x + (target.x - origin.x) * travel,
      y:
        origin.y -
        26 * exit +
        (target.y - origin.y + 26) * travel -
        (reduced ? 0 : Math.sin(travel * Math.PI) * 24),
    },
    scale: 1 - absorbed,
    blackout: clamp((age - settings.absorb) / (settings.blackout - settings.absorb)),
    text: vesselEntryText.slice(
      0,
      Math.floor(Math.max(0, age - settings.textStart) * settings.lettersPerSecond),
    ),
    absorbed,
  };
}
export function beginVesselTransfer(encounter: Encounter) {
  if (isVesselTransfer(encounter)) return true;
  encounter.phase = 'vesselTransfer';
  encounter.turn = null;
  encounter.animationAge = 0;
  encounter.soul = null;
  encounter.snowAttack = null;
  encounter.message = 'The soul leaves Kris and enters the Vessel.';
  return true;
}
export function advanceVesselTransfer(encounter: Encounter, dt: number) {
  if (!isVesselTransfer(encounter) || !Number.isFinite(dt) || dt <= 0) return false;
  const previous = vesselTransferFrame(encounter.animationAge).text;
  encounter.animationAge = Math.min(endAge, encounter.animationAge + dt);
  const text = vesselTransferFrame(encounter.animationAge).text;
  const entered = encounter.animationAge >= vesselTransferSettings.textStart;
  const phaseChanged = entered && encounter.phase !== 'vesselEntered';
  if (entered) {
    encounter.phase = 'vesselEntered';
    encounter.message = text;
  }
  return phaseChanged || previous !== text;
}
