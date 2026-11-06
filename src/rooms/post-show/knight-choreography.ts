import type { GameState } from '../../game/types.ts';

type Key = readonly [number, number, number, number, number, number, number];
// Time, positions, jumps and blade angles. This encounter plays once, then hands off to battle.
const keys: readonly Key[] = [
  [0, 120, 545, 35, 35, 0.12, 0.12],
  [1.2, 120, 545, 35, 35, -2.4, 0.12],
  [2.4, 120, 545, 35, 35, -2.4, Math.PI],
  [3.05, 420, 545, 35, 35, -2.4, Math.PI],
  [3.27, 420, 545, 35, 35, -2.4, Math.PI],
  [3.85, 225, 555, 35, 35, -2.9, Math.PI],
  [4.5, 140, 545, 35, 35, 2.2, 0.12],
  [5.3, 140, 545, 35, 35, 2.2, Math.PI],
  [5.8, 140, 545, 35, 35, -2.4, Math.PI],
  [6.4, 140, 545, 35, 35, -2.4, Math.PI],
  [7, 140, 545, 35, 35, 0.12, 2.2],
  [7.8, 140, 545, 35, 35, Math.PI, 2.2],
  [8.2, 140, 545, 35, 35, Math.PI, -2.4],
  [8.8, 140, 545, 35, 35, Math.PI, -2.4],
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
  if (age >= 7.8) return 'kaizoSwoon';
  if (age >= 7) return 'kaizoWindup';
  if (age >= 6.15) return 'kaizoBlocksSwoon';
  if (age >= 5.3) return 'roaringSwoon';
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
  const grip = { x: actor.x + actor.facing * 28, y: 315 - actor.jump };
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
  const impact = knightImpactTimes
    .map((time) => ({ time, age: beat - time }))
    .filter((event) => event.age >= 0 && event.age < 0.5)
    .at(-1);
  const phase = knightSequencePhase(beat);
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
