import { knightSequenceSeconds } from './knight-choreography.ts';
import { movementSpeed, sprintMultiplier } from '../../game/config.ts';
import type { Room } from '../../world/types.ts';

export const knightStatuePositions = [860, 1260, 1660, 2060, 2460, 2860] as const;
export const knightPathSettings = {
  length: 3980,
  lookout: 3330,
  statuesAt: knightStatuePositions[2] + 40,
  duelAt: 3200,
};
export const statueConversation = [
  { speaker: 'Flowey', text: 'What are those statues? That same knight, over and over...' },
  {
    speaker: 'Ralsey',
    text: 'They look like the Roaring Knight. The one who has been opening Dark Fountains.',
  },
  {
    speaker: 'Ralsey',
    text: 'If too many fountains are opened, the balance of light and dark will be broken. That could bring the Roaring.',
  },
  { speaker: 'Ralsey', text: 'But... I do not know who put these statues here. Please, stay close.' },
  { speaker: 'Flowey', text: 'Great. More mysteries. Let us see where this path leads.' },
];

export function createKnightPath(x = 60, y = 180) {
  return {
    x: Math.max(50, Math.min(knightPathSettings.lookout, x)),
    y,
    direction: 1,
    vertical: 1,
    moving: false,
    duelAge: -1,
  };
}
export type KnightPath = ReturnType<typeof createKnightPath>;
export function knightPathCamera(path: KnightPath) {
  const approach = Math.max(0, Math.min(1, (path.x - 2800) / 500));
  return Math.max(0, path.x - (560 - approach * 420));
}
function canStand(room: Room, x: number, y: number) {
  for (const px of [x - 10, x + 10])
    for (const py of [y - 7, y + 6]) {
      const tx = Math.floor(px / 40),
        ty = Math.floor(py / 40);
      if (px < 40 || px >= knightPathSettings.length || py < 40 || py >= 400) return false;
      if (tx < 15 ? ![0, 6].includes(room.map[ty]?.[tx]) : ty < 8 || ty > 9) return false;
    }
  return true;
}
export function advanceKnightPath(path: KnightPath, room: Room, keys: Set<string>, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return false;
  if (path.duelAge >= 0) {
    path.duelAge = Math.min(knightSequenceSeconds, path.duelAge + dt);
    path.moving = false;
    return false;
  }
  const dx = Number(keys.has('right')) - Number(keys.has('left'));
  const dy = Number(keys.has('down')) - Number(keys.has('up'));
  const speed = (movementSpeed * (keys.has('sprint') ? sprintMultiplier : 1)) / (Math.hypot(dx, dy) || 1);
  const beforeX = path.x,
    beforeY = path.y;
  // Small substeps keep the narrow elbow solid even after a slow frame or a large test step.
  const steps = Math.ceil(dt / (1 / 60));
  for (let step = 0; step < steps; step++) {
    const x = Math.max(50, Math.min(knightPathSettings.lookout, path.x + (dx * speed * dt) / steps));
    const y = path.y + (dy * speed * dt) / steps;
    if (canStand(room, x, path.y)) path.x = x;
    if (canStand(room, path.x, y)) path.y = y;
  }
  path.moving = Math.abs(path.x - beforeX) + Math.abs(path.y - beforeY) > 1e-8;
  if (dx) path.direction = Math.sign(dx);
  if (dy) path.vertical = Math.sign(dy);
  if (path.duelAge < 0 && path.x >= knightPathSettings.duelAt) path.duelAge = 0;
  if (path.duelAge >= 0) path.duelAge += dt;
  return path.x < 80 && path.y < 80;
}
export function knightPartyPosition(path: KnightPath, gap: number) {
  if (path.x < 120 && path.y < 320)
    return { x: path.x, y: Math.max(80, Math.min(385, path.y - path.vertical * gap)) };
  const x = path.x - path.direction * gap;
  return x < 80 ? { x: 80, y: Math.max(180, path.y - (80 - x)) } : { x, y: path.y };
}

export { knightDuelPose } from './knight-choreography.ts';
