import type { Point } from '../../world/types.ts';

export const starBombSettings = { fuse: 1.1, miniCount: 8, miniSpeed: 300, damage: 25 };
export interface StarBomb extends Point {
  age: number;
  angle: number;
}

export function createStarBomb(soul: Point, bombs: StarBomb[], random: () => number): StarBomb {
  const safe = (p: Point) =>
    Math.hypot(p.x - soul.x, p.y - soul.y) >= 90 &&
    bombs.every((other) => Math.hypot(p.x - other.x, p.y - other.y) >= 80);
  let point = { x: 40 + random() * 560, y: 40 + random() * 400 };
  for (let tries = 0; tries < 8 && !safe(point); tries++)
    point = { x: 40 + random() * 560, y: 40 + random() * 400 };
  if (!safe(point)) {
    // A bounded fallback also works with a fixed RNG and avoids spawning on the soul.
    const candidates = [80, 240, 400, 560].flatMap((x) => [80, 240, 400].map((y) => ({ x, y })));
    point =
      candidates.find(safe) ??
      candidates.reduce((best, p) =>
        Math.hypot(p.x - soul.x, p.y - soul.y) > Math.hypot(best.x - soul.x, best.y - soul.y) ? p : best,
      );
  }
  return { ...point, age: 0, angle: random() * Math.PI * 2 };
}
