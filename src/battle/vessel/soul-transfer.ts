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
  grip: 1.2,
  exit: 2.4,
  release: 3,
  arrive: 5.3,
  absorb: 6.1,
  blackout: 6.9,
  textStart: 7.4,
  lettersPerSecond: 14,
};
function letterSeconds(letter: string) {
  return (
    1 / vesselTransferSettings.lettersPerSecond +
    (letter === '\n' ? 0.35 : letter === '.' || letter === '?' ? 0.4 : letter === ',' ? 0.18 : 0)
  );
}
const textDuration = [...vesselEntryText].reduce((seconds, letter) => seconds + letterSeconds(letter), 0);
const endAge = vesselTransferSettings.textStart + textDuration + 0.01;
export function vesselEntryTextAt(age: number) {
  let budget = Math.max(0, age - vesselTransferSettings.textStart),
    count = 0;
  for (const letter of vesselEntryText) {
    if (budget + 1e-9 < 1 / vesselTransferSettings.lettersPerSecond) break;
    count++;
    budget -= letterSeconds(letter);
  }
  return vesselEntryText.slice(0, count);
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function isVesselTransfer(encounter: Encounter | null) {
  return encounter?.kind === 'vessel' && ['vesselTransfer', 'vesselEntered'].includes(encounter.phase);
}
export function vesselTransferFrame(age: number, reduced = false) {
  const settings = vesselTransferSettings;
  const pull = clamp((age - settings.grip) / (settings.exit - settings.grip));
  const raw = clamp((age - settings.release) / (settings.arrive - settings.release));
  const travel = raw * raw * (3 - 2 * raw),
    absorbed = clamp((age - settings.arrive) / (settings.absorb - settings.arrive));
  const chest = { x: vesselBattleLayout.kris.x - 2, y: vesselBattleLayout.kris.y - 40 };
  const held = { x: vesselBattleLayout.kris.x + 36, y: vesselBattleLayout.kris.y - 43 };
  const target = { x: vesselBattleLayout.vessel.x, y: vesselBattleLayout.vessel.y - 55 };
  const hand = { x: chest.x + (held.x - chest.x) * pull, y: chest.y + (held.y - chest.y) * pull };
  return {
    krisPose:
      age < 0.55
        ? 1
        : age < settings.grip
          ? 2
          : age < 1.7
            ? 3
            : age < settings.exit
              ? 4
              : age < settings.release
                ? 5
                : 6,
    soulVisible: age > settings.grip,
    soulReveal: clamp(pull * 3),
    soul: {
      x: hand.x + (target.x - hand.x) * travel,
      y: hand.y + (target.y - hand.y) * travel - (reduced ? 0 : Math.sin(travel * Math.PI) * 20),
    },
    scale: 1 - absorbed,
    blackout: clamp((age - settings.absorb) / (settings.blackout - settings.absorb)),
    text: vesselEntryTextAt(age),
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
