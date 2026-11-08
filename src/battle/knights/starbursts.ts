import type { Point } from '../../world/types.ts';
import type { Arena } from '../shared/types.ts';
import { crossesOpposingKnight, type KnightOwner, type KnightProjectile } from './projectiles.ts';

export const starburstSettings = {
  waves: 5,
  warmup: 0.8,
  interval: 1.8,
  travel: 1,
  fuse: 0.7,
  fragments: 6,
  speed: 200,
  lifetime: 2.2,
};
export interface StarHazard extends Point, KnightProjectile {
  id: number;
  radius: number;
  active: boolean;
}
export interface BurstStar extends StarHazard {
  origin: Point;
  target: Point;
  launch: number;
  exploded: boolean;
  wave: number;
}
export interface StarFragment extends StarHazard {
  vx: number;
  vy: number;
  born: number;
  origin: Point;
}
export interface Starbursts {
  arena: Arena;
  age: number;
  waves: number;
  nextId: number;
  stars: BurstStar[];
  fragments: StarFragment[];
  explosions: number;
}
export function createStarbursts(arena: Arena): Starbursts {
  return { arena: { ...arena }, age: 0, waves: 0, nextId: 0, stars: [], fragments: [], explosions: 0 };
}
export function starBurstTime(star: BurstStar) {
  return star.launch + starburstSettings.travel + starburstSettings.fuse;
}
export function starFragmentAngle(star: BurstStar, index: number) {
  return (
    (index * Math.PI * 2) / starburstSettings.fragments +
    star.wave * 0.2 +
    (star.owner === 'kaizo' ? Math.PI / 6 : 0)
  );
}
export function advanceStarbursts(
  attack: Starbursts,
  dt: number,
  alive: (owner: KnightOwner) => boolean = () => true,
) {
  if (!Number.isFinite(dt) || dt <= 0) return { arrived: [], finished: false };
  attack.age += dt;
  while (
    attack.waves < starburstSettings.waves &&
    attack.age >= starburstSettings.warmup + attack.waves * starburstSettings.interval - 1e-9
  ) {
    const wave = attack.waves;
    for (const owner of ['roaring', 'kaizo'] as const) {
      if (!alive(owner)) continue;
      const left = owner === 'roaring';
      const origin = { x: left ? 130 : 510, y: 190 + Math.sin(wave * 1.7) * 12 };
      const target = {
        x: attack.arena.x + attack.arena.size * (left ? 0.32 : 0.68),
        y:
          attack.arena.y +
          attack.arena.size * (left ? [0.3, 0.7, 0.45, 0.25, 0.65][wave] : [0.7, 0.3, 0.6, 0.75, 0.35][wave]),
      };
      attack.stars.push({
        ...origin,
        origin,
        target,
        id: attack.nextId++,
        owner,
        radius: 7,
        active: true,
        hitOpponent: false,
        exploded: false,
        wave,
        launch: starburstSettings.warmup + wave * starburstSettings.interval,
      });
    }
    attack.waves++;
  }
  const arrived: StarHazard[] = [];
  for (const star of attack.stars) {
    if (star.exploded || star.hitOpponent) continue;
    const previous = { x: star.x, y: star.y };
    const travel = Math.max(0, Math.min(1, (attack.age - star.launch) / starburstSettings.travel));
    const eased = 1 - (1 - travel) ** 2;
    star.x = star.origin.x + (star.target.x - star.origin.x) * eased;
    star.y = star.origin.y + (star.target.y - star.origin.y) * eased;
    star.radius = 7 + travel * 9;
    if (crossesOpposingKnight(star.owner, previous, star, star.radius)) arrived.push(star);
    if (attack.age >= starBurstTime(star) - 1e-9) {
      star.exploded = true;
      star.active = false;
      attack.explosions++;
      for (let i = 0; i < starburstSettings.fragments; i++) {
        const angle = starFragmentAngle(star, i);
        attack.fragments.push({
          id: attack.nextId++,
          x: star.x,
          y: star.y,
          owner: star.owner,
          active: true,
          hitOpponent: false,
          radius: 5,
          vx: Math.cos(angle) * starburstSettings.speed,
          vy: Math.sin(angle) * starburstSettings.speed,
          born: starBurstTime(star),
          origin: { x: star.x, y: star.y },
        });
      }
    }
  }
  for (const shot of attack.fragments) {
    if (shot.hitOpponent || !shot.active) continue;
    const previous = { x: shot.x, y: shot.y };
    // Absolute positions keep simultaneous explosions and slow frames deterministic.
    const age = Math.max(0, attack.age - shot.born);
    shot.x = shot.origin.x + shot.vx * age;
    shot.y = shot.origin.y + shot.vy * age;
    if (crossesOpposingKnight(shot.owner, previous, shot, shot.radius)) arrived.push(shot);
    if (age >= starburstSettings.lifetime) shot.active = false;
  }
  attack.fragments = attack.fragments.filter((shot) => shot.active && !shot.hitOpponent);
  return {
    arrived,
    finished:
      attack.waves === starburstSettings.waves &&
      attack.stars.every((star) => star.exploded || star.hitOpponent) &&
      attack.fragments.length === 0,
  };
}
export function starTouchesSoul(star: StarHazard, soul: Point, width = 24, height = 21, margin = 0) {
  if (!star.active || star.hitOpponent) return false;
  const dx = Math.max(0, Math.abs(star.x - soul.x) - width / 2),
    dy = Math.max(0, Math.abs(star.y - soul.y) - height / 2);
  return dx * dx + dy * dy <= (star.radius + margin) ** 2;
}
