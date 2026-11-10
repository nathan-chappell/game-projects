import type { Encounter } from '../shared/types.ts';

export const knightRiftSettings = { rounds: 7, duration: 11.2 };
export function beginKnightRift(encounter: Encounter) {
  if (encounter.kind !== 'knights' || encounter.enemyAttackCount < knightRiftSettings.rounds) return false;
  encounter.phase = 'knightRift';
  encounter.animationAge = 0;
  encounter.soul = null;
  encounter.snowAttack = null;
  encounter.message = 'The knights raise their blades. The Fountain answers with darkness and light.';
  return true;
}
export function advanceKnightRift(encounter: Encounter, dt: number) {
  if (encounter.phase !== 'knightRift' || !Number.isFinite(dt) || dt <= 0) return false;
  encounter.animationAge = Math.min(knightRiftSettings.duration, encounter.animationAge + dt);
  return encounter.animationAge >= knightRiftSettings.duration;
}
/** Pure timing shared by the drawing and its tests. */
export function knightRiftFrame(age: number) {
  const fight = Math.max(0, Math.min(1, (age - 1.4) / 4.2));
  const beat = Math.max(0, age - 1.4) % 0.7;
  return {
    raised: age < 1.4,
    fight,
    beat,
    clash: age >= 1.4 && age < 5.6 && beat >= 0.38 && beat < 0.62,
    fountain: Math.max(0, Math.min(1, (age - 5.6) / 3.6)),
    whiteout: Math.max(0, Math.min(1, (age - 9.2) / 0.8)),
    fade: Math.max(0, Math.min(1, (age - 10.5) / 0.7)),
  };
}
