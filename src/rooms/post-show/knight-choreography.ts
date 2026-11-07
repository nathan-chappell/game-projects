import type { GameState } from '../../game/types.ts';

type Key = readonly [number, number, number, number, number, number, number];
// Time, positions, jumps and blade angles. This encounter plays once, then hands off to battle.
const keys: readonly Key[] = [
  [0, 120, 545, 35, 35, 0.12, 0.12],
  [0.85, 120, 545, 37, 36, 0.12, 0.12],
  [1.2, 120, 545, 35, 35, -2.4, 0.12],
  [2.4, 110, 545, 31, 35, -2.4, Math.PI],
  [2.8, 106, 545, 30, 35, -2.4, Math.PI],
  [3.025, 420, 545, 35, 35, -2.4, Math.PI],
  [3.05, 420, 545, 35, 35, -2.4, Math.PI],
  [3.15, 420, 545, 35, 35, -2.4, Math.PI],
  [3.36, 390, 558, 42, 40, -2.6, Math.PI],
  [3.85, 225, 550, 35, 37, -2.9, Math.PI],
  [4.5, 140, 545, 35, 35, 1.9, 0.12],
  [5.5, 132, 545, 31, 35, 2.45, Math.PI],
  [5.78, 130, 545, 29, 35, 2.55, Math.PI],
  [5.94, 146, 545, 39, 35, -2.4, Math.PI],
  [6.15, 146, 545, 39, 35, -2.4, Math.PI],
  [6.25, 146, 545, 39, 35, -2.4, Math.PI],
  [6.49, 140, 560, 35, 43, -2.6, Math.PI],
  [7, 140, 545, 35, 35, 0.12, 1.9],
  [8, 140, 554, 35, 31, Math.PI, 2.45],
  [8.18, 140, 556, 35, 29, Math.PI, 2.55],
  [8.34, 140, 540, 35, 39, Math.PI, -2.4],
  [8.55, 140, 540, 35, 39, Math.PI, -2.4],
  [8.65, 140, 540, 35, 39, Math.PI, -2.4],
  [8.9, 125, 545, 43, 35, Math.PI, -2.6],
  [9.4, 140, 545, 35, 35, 0.12, 0.12],
  [11, 140, 545, 35, 35, 0.12, 0.12],
];
export const knightSequenceSeconds = 11;
export const knightImpactTimes = [3.05, 6.15, 8.55];
export type KnightSequencePhase =
  | 'faceoff'
  | 'chargePose'
  | 'charge'
  | 'chargeBlocked'
  | 'recover'
  | 'roaringWindup'
  | 'roaringSwoon'
  | 'kaizoBlocksSwoon'
  | 'kaizoWindup'
  | 'kaizoSwoon'
  | 'roaringBlocksSwoon'
  | 'transition'
  | 'threeTeams';
export function knightSequencePhase(age: number): KnightSequencePhase {
  if (age >= 11) return 'threeTeams';
  if (age >= 10) return 'transition';
  if (age >= 9.4) return 'faceoff';
  if (age >= 8.55) return 'roaringBlocksSwoon';
  if (age >= 8.18) return 'kaizoSwoon';
  if (age >= 7) return 'kaizoWindup';
  if (age >= 6.15) return 'kaizoBlocksSwoon';
  if (age >= 5.78) return 'roaringSwoon';
  if (age >= 4.5) return 'roaringWindup';
  if (age >= 3.85) return 'recover';
  if (age >= 3.05) return 'chargeBlocked';
  if (age >= 2.4) return 'charge';
  if (age >= 1.2) return 'chargePose';
  return 'faceoff';
}
export function knightEncounterActive(state: Pick<GameState, 'mode' | 'knightPath' | 'knightBattle'>) {
  return state.mode === 'play' && (!!state.knightBattle || (state.knightPath?.duelAge ?? -1) >= 0);
}
export interface KnightActorPose {
  x: number;
  jump: number;
  facing: number;
  swordAngle: number;
  lean: number;
}
export function knightSword(actor: KnightActorPose) {
  const grip = {
    x: actor.x + actor.facing * 28 * Math.cos(actor.lean) + 35 * Math.sin(actor.lean),
    y: 350 - actor.jump + actor.facing * 28 * Math.sin(actor.lean) - 35 * Math.cos(actor.lean),
  };
  return {
    grip,
    tip: {
      x: grip.x - Math.sin(actor.swordAngle) * 110 * actor.facing,
      y: grip.y + Math.cos(actor.swordAngle) * 110,
    },
  };
}
export function swordIntersection(a: ReturnType<typeof knightSword>, b: ReturnType<typeof knightSword>) {
  const rx = a.tip.x - a.grip.x,
    ry = a.tip.y - a.grip.y,
    sx = b.tip.x - b.grip.x,
    sy = b.tip.y - b.grip.y;
  const cross = rx * sy - ry * sx;
  if (Math.abs(cross) < 1e-8) return null;
  const qx = b.grip.x - a.grip.x,
    qy = b.grip.y - a.grip.y,
    t = (qx * sy - qy * sx) / cross,
    u = (qx * ry - qy * rx) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.grip.x + t * rx, y: a.grip.y + t * ry } : null;
}
export function knightDuelPose(age: number) {
  const beat = Math.max(0, Math.min(knightSequenceSeconds, age));
  const i = keys.findIndex((key, i) => i < keys.length - 1 && beat >= key[0] && beat < keys[i + 1][0]);
  const a = keys[i < 0 ? keys.length - 2 : i],
    b = keys[i < 0 ? keys.length - 1 : i + 1];
  const t = (beat - a[0]) / (b[0] - a[0]),
    ease = t * t * (3 - 2 * t);
  const value = (column: number) => a[column] + (b[column] - a[column]) * ease;
  const roaring: KnightActorPose = { x: value(1), jump: value(3), facing: 1, swordAngle: value(5), lean: 0 };
  const kaizo: KnightActorPose = { x: value(2), jump: value(4), facing: -1, swordAngle: value(6), lean: 0 };
  const phase = knightSequencePhase(beat);
  const bump = (start: number, end: number) => {
    const progress = Math.max(0, Math.min(1, (beat - start) / (end - start)));
    return Math.sin(progress * Math.PI);
  };
  roaring.lean =
    phase === 'chargePose'
      ? -0.04 * bump(1.2, 2.8)
      : phase === 'roaringWindup'
        ? -0.12 * bump(4.5, 5.78)
        : -0.11 * bump(5.78, 6.15) + 0.13 * bump(8.65, 9.4);
  kaizo.lean =
    phase === 'kaizoWindup'
      ? -0.12 * bump(7, 8.18)
      : 0.15 * bump(3.15, 3.85) + 0.13 * bump(6.25, 7) - 0.11 * bump(8.18, 8.55);
  const impact = knightImpactTimes
    .map((time) => ({ time, age: beat - time }))
    .filter((event) => event.age >= 0 && event.age < 0.5)
    .at(-1);
  return {
    beat,
    phase,
    roaring,
    kaizo,
    roaringX: roaring.x,
    kaizoX: kaizo.x,
    kaizoJump: kaizo.jump,
    chargePose: ['chargePose', 'charge', 'chargeBlocked'].includes(phase),
    clash: impact ? 1 - impact.age / 0.5 : 0,
    impactAge: impact?.age ?? -1,
    contact: phase === 'chargeBlocked' ? swordIntersection(knightSword(roaring), knightSword(kaizo)) : null,
    slash: ['roaringSwoon', 'kaizoSwoon'].includes(phase) ? 'both' : '',
    dashing: phase === 'charge',
  };
}
