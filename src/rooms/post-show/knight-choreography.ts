type Key = readonly [number, number, number, number, number, number, number];
// Time, two positions, two jumps, two blade angles. Repeated poses create brief impact holds.
const keys: readonly Key[] = [
  [0, 3475, 3730, 0, 0, 0.12, 0.12],
  [0.7, 3475, 3730, 0, 0, 2.2, -1.1],
  [1.05, 3490, 3710, 0, 0, 2.1, -1.5],
  [1.3, 3520, 3685, 0, 0, -2, -2],
  [1.43, 3520, 3685, 0, 0, -2, -2],
  [1.85, 3480, 3730, 0, 0, -3, -2.8],
  [2.1, 3480, 3720, 0, 0, -1.2, 2.2],
  [2.4, 3520, 3685, 0, 0, -2, -2],
  [2.53, 3520, 3685, 0, 0, -2, -2],
  [3, 3470, 3710, 0, 0, -2.9, -3.1],
  [3.65, 3490, 3690, 0, 92, 1.8, 2.3],
  [4.25, 3520, 3685, 0, 18, -2, -2],
  [4.39, 3520, 3685, 0, 18, -2, -2],
  [4.85, 3470, 3740, 0, 0, -3, -3],
  [5.65, 3470, 3740, -7, -7, 2.4, 2.4],
  [6.2, 3520, 3685, 0, 0, -2, -2],
  [6.34, 3520, 3685, 0, 0, -2, -2],
  [6.65, 3490, 3715, 18, 18, -4.8, -4.8],
  [7.2, 3520, 3685, 0, 0, -2, -2],
  [7.34, 3520, 3685, 0, 0, -2, -2],
  [7.7, 3685, 3515, 15, 30, -3.1, -3.1],
  [8.3, 3720, 3470, 0, 0, 0.2, 0.2],
  [9.15, 3720, 3470, 0, 0, 2.3, 2.3],
  [9.6, 3685, 3520, 0, 0, -2, -2],
  [9.78, 3685, 3520, 0, 0, -2, -2],
  [10.4, 3730, 3475, 40, 55, -3.2, -3.2],
  [11.1, 3475, 3730, 12, 20, -1, -1],
  [12, 3475, 3730, 0, 0, 0.12, 0.12],
];
export const knightImpactTimes = [1.3, 2.4, 4.25, 6.2, 7.2, 9.6];
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
    qy = b.grip.y - a.grip.y;
  const t = (qx * sy - qy * sx) / cross,
    u = (qx * ry - qy * rx) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.grip.x + t * rx, y: a.grip.y + t * ry } : null;
}
export function knightDuelPose(age: number) {
  const beat = ((age % 12) + 12) % 12;
  const index = keys.findIndex((key, i) => i < keys.length - 1 && beat >= key[0] && beat < keys[i + 1][0]);
  const a = keys[Math.max(0, index)],
    b = keys[Math.max(0, index) + 1];
  const t = (beat - a[0]) / (b[0] - a[0]),
    ease = t * t * (3 - 2 * t);
  const value = (column: number) => a[column] + (b[column] - a[column]) * ease;
  const facing = value(2) >= value(1) ? 1 : -1;
  const roaring: KnightActorPose = {
    x: value(1),
    jump: value(3),
    facing,
    swordAngle: value(5),
    lean: Math.sin(value(5)) * 0.045,
  };
  const kaizo: KnightActorPose = {
    x: value(2),
    jump: value(4),
    facing: -facing,
    swordAngle: value(6),
    lean: Math.sin(value(6)) * 0.045,
  };
  const impact = knightImpactTimes
    .map((time) => ({ time, age: beat - time }))
    .filter((event) => event.age >= 0 && event.age < 0.48)
    .at(-1);
  const contact = swordIntersection(knightSword(roaring), knightSword(kaizo));
  const clash = impact ? Math.max(0, 1 - impact.age / 0.48) : 0;
  const active = Math.abs(b[5] - a[5]) > 1 || Math.abs(b[6] - a[6]) > 1;
  return {
    beat,
    roaring,
    kaizo,
    roaringX: roaring.x,
    kaizoX: kaizo.x,
    kaizoJump: kaizo.jump,
    clash,
    contact,
    impactAge: impact?.age ?? -1,
    slash: active || clash > 0 ? 'both' : '',
    dashing: Math.abs(b[1] - a[1]) + Math.abs(b[2] - a[2]) > 100,
  };
}
