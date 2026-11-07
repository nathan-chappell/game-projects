import type { Encounter } from '../shared/types.ts';
import { canPartyAct } from '../shared/availability.ts';
import { knightSword, swordIntersection } from '../../rooms/post-show/knight-choreography.ts';
import { floatingKnight } from '../../rooms/post-show/knight-hover.ts';

// Time, positions, blade angles, and body lean. Both attacks are blocked.
const keys = [
  [0, 330, 545, 0.12, 0.12, 0, 0],
  [0.8, 330, 545, 0.12, 0.12, 0, 0],
  [1.5, 325, 545, 2, -0.9, -0.08, 0],
  [1.78, 365, 525, -0.9, -0.9, 0.05, 0],
  [2.05, 365, 525, -0.9, -0.9, 0.05, 0],
  [2.8, 330, 545, 0.12, 0.12, 0, 0],
  [3.8, 330, 545, -0.9, 0.12, 0, 0],
  [4.5, 330, 550, -0.9, 2, 0, -0.08],
  [4.78, 340, 500, -0.9, -0.9, 0, 0.05],
  [5.05, 340, 500, -0.9, -0.9, 0, 0.05],
  [5.8, 330, 545, 0.12, 0.12, 0, 0],
  [6.4, 330, 545, 0.12, 0.12, 0, 0],
] as const;
export const partyDuelDuration = 6.4;
export function partyDuelFrame(age: number, reduced = false) {
  const beat = Math.max(0, age) % partyDuelDuration;
  const index = keys.findIndex((key, i) => i < keys.length - 1 && beat >= key[0] && beat < keys[i + 1][0]);
  const a = keys[Math.max(0, index)],
    b = keys[Math.max(0, index) + 1];
  const t = (beat - a[0]) / (b[0] - a[0]);
  const ease = t * t * (3 - 2 * t);
  const value = (column: number) => a[column] + (b[column] - a[column]) * ease;
  const motion = reduced ? 0.25 : 1;
  const roaring = floatingKnight(
    {
      x: 330 + (value(1) - 330) * motion,
      jump: 112,
      facing: 1,
      swordAngle: value(3),
      lean: value(5) * motion,
    },
    age,
    false,
    reduced,
  );
  const kaizo = floatingKnight(
    {
      x: 545 + (value(2) - 545) * motion,
      jump: 112,
      facing: -1,
      swordAngle: value(4),
      lean: value(6) * motion,
    },
    age,
    true,
    reduced,
  );
  const clashAge = beat >= 1.78 && beat < 2.05 ? beat - 1.78 : beat >= 4.78 && beat < 5.05 ? beat - 4.78 : -1;
  const swinging: 'roaring' | 'kaizo' | null =
    beat >= 1.5 && beat < 1.78 ? 'roaring' : beat >= 4.5 && beat < 4.78 ? 'kaizo' : null;
  return {
    roaring,
    kaizo,
    swinging,
    clashAge,
    contact: clashAge >= 0 ? swordIntersection(knightSword(roaring), knightSword(kaizo)) : null,
  };
}
export function advancePartyDuel(encounter: Encounter, dt: number) {
  if (
    encounter.kind !== 'knights' ||
    !canPartyAct(encounter) ||
    encounter.hitAge !== null ||
    !encounter.knightEnemies ||
    Object.values(encounter.knightEnemies).some((enemy) => enemy.hp <= 0)
  )
    return;
  encounter.knightDuelAge = (encounter.knightDuelAge ?? 0) + dt;
}
