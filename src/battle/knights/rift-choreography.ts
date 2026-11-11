import {
  knightSword,
  swordIntersection,
  type KnightActorPose,
} from '../../rooms/post-show/knight-choreography.ts';

// Windup, dash, blade contact/hold, and recoil are separate beats rather than a repeating lunge.
const keys = [
  [0, 190, 450, 95, 95, 3.84, 3.84],
  [1.1, 190, 450, 98, 98, 3.84, 3.84],
  [1.48, 170, 450, 105, 95, -2.7, -0.9],
  [1.82, 260, 380, 100, 100, -0.9, -0.9],
  [1.93, 260, 380, 100, 100, -0.9, -0.9],
  [2.27, 205, 435, 120, 80, -0.2, -2.6],
  [2.62, 205, 465, 140, 70, -0.5, -2.8],
  [2.94, 260, 380, 140, 70, -0.5, -1.5],
  [3.05, 260, 380, 140, 70, -0.5, -1.5],
  [3.42, 180, 450, 85, 130, 2.5, 0.1],
  [3.7, 180, 450, 110, 130, 2.5, -2.2],
  [3.98, 260, 380, 120, 120, -2.2, -2.2],
  [4.09, 260, 380, 120, 120, -2.2, -2.2],
  [4.42, 210, 430, 90, 90, 3.84, 3.84],
  [4.7, 205, 435, 95, 95, 3.84, 3.84],
  [4.98, 260, 380, 100, 100, -0.9, -0.9],
  [5.27, 260, 380, 100, 100, -0.9, -0.9],
  [5.65, 195, 445, 100, 100, 3.84, 3.84],
  [7.8, 175, 465, 115, 115, 3.5, 3.5],
  [11.2, 150, 490, 135, 135, 3.5, 3.5],
] as const;
export const riftClashes = [1.82, 2.94, 3.98, 4.98] as const;

export function knightRiftDuel(age: number, reduced = false) {
  const t = Math.max(0, Math.min(11.2, age));
  let index = keys.findIndex((k, i) => i < keys.length - 1 && t >= k[0] && t < keys[i + 1][0]);
  if (index < 0) index = keys.length - 2;
  const a = keys[index],
    b = keys[index + 1];
  const f = (t - a[0]) / (b[0] - a[0]);
  const ease = f * f * (3 - 2 * f);
  const value = (column: number) => a[column] + (b[column] - a[column]) * ease;
  const actor = (kaizo: boolean): KnightActorPose => ({
    x: value(kaizo ? 2 : 1),
    jump: value(kaizo ? 4 : 3),
    facing: kaizo ? -1 : 1,
    swordAngle: value(kaizo ? 6 : 5),
    lean: 0,
  });
  const impactTime = [...riftClashes].reverse().find((impact) => t >= impact);
  const impactAge = impactTime === undefined ? -1 : t - impactTime;
  const impactIndex = riftClashes.indexOf(impactTime!);
  const impact = impactIndex >= 0 ? keys.find((k) => k[0] === impactTime)! : null;
  const contact = impact
    ? swordIntersection(
        knightSword({ x: impact[1], jump: impact[3], facing: 1, swordAngle: impact[5], lean: 0 }),
        knightSword({ x: impact[2], jump: impact[4], facing: -1, swordAngle: impact[6], lean: 0 }),
      )
    : null;
  const strength = impactAge >= 0 ? Math.max(0, 1 - impactAge / 0.32) : 0;
  const focus = Math.sin(Math.min(1, t / 5.6) * Math.PI);
  return {
    roaring: actor(false),
    kaizo: actor(true),
    contact,
    impactAge,
    strength,
    zoom: reduced ? 1 : 1.03 + focus * 0.09 + strength * 0.045,
    cameraX: reduced ? 320 : 320 + Math.sin(t * 1.3) * focus * 15,
    cameraY: reduced ? 240 : 215 - focus * 12,
  };
}
