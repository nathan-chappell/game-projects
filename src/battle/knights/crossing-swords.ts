import type { Arena } from '../shared/types.ts';
import type { KnightOwner, KnightProjectile } from './projectiles.ts';
import type { Point } from '../../world/types.ts';

export const crossingSwordSettings = {
  waves: 6,
  warmup: 0.25,
  warning: 0.65,
  interval: 1.5,
  speed: 620,
  speedStep: 100,
  distance: 800,
  hitCooldown: 0.75,
};
const safeOffsets = [
  [-0.2, -0.16],
  [0.13, 0.1],
  [0.2, -0.12],
  [-0.12, 0.15],
  [-0.2, -0.08],
  [0.08, 0],
];
const angles = [
  -0.34,
  0.42,
  -0.78,
  0.92,
  -1.18,
  1.25,
  Math.PI - 0.42,
  Math.PI + 0.5,
  Math.PI - 0.95,
  Math.PI + 1.15,
];
export interface CrossingSword extends KnightProjectile, Point {
  id: number;
  angle: number;
  origin: Point;
  launch: number;
  speed: number;
  active: boolean;
  scale?: number;
  maxDistance?: number;
}
export interface CrossingSwords {
  arena: Arena;
  age: number;
  waves: number;
  swords: CrossingSword[];
  alive: Record<KnightOwner, boolean>;
  miniWaves: number;
  miniWarnings: CrossingSword[];
}
export function createCrossingSwords(arena: Arena): CrossingSwords {
  return {
    arena: { ...arena },
    age: 0,
    waves: 0,
    swords: [],
    alive: { roaring: true, kaizo: true },
    miniWaves: 0,
    miniWarnings: [],
  };
}
export function crossingSafePoint(attack: CrossingSwords, wave: number) {
  const offset = safeOffsets[Math.min(5, Math.max(0, wave))];
  const inner = attack.arena.size - attack.arena.border * 2;
  return {
    x: attack.arena.x + attack.arena.size / 2 + offset[0] * inner,
    y: attack.arena.y + attack.arena.size / 2 + offset[1] * inner,
  };
}
export function crossingWave(attack: CrossingSwords, wave: number): CrossingSword[] {
  const center = crossingSafePoint(attack, wave);
  return angles.map((base, i) => {
    const angle = base + (wave % 2 ? 0.06 : -0.06);
    const dx = Math.cos(angle),
      dy = Math.sin(angle);
    const offset = (i % 2 ? 1 : -1) * (50 + (i % 3) * 17);
    const origin = { x: center.x - dy * offset - dx * 400, y: center.y + dx * offset - dy * 400 };
    return {
      id: wave * angles.length + i,
      owner: i < 6 ? 'roaring' : 'kaizo',
      hitOpponent: false,
      ...origin,
      origin,
      angle,
      launch:
        crossingSwordSettings.warmup + crossingSwordSettings.warning + wave * crossingSwordSettings.interval,
      speed: crossingSwordSettings.speed + wave * crossingSwordSettings.speedStep,
      active: true,
    };
  });
}
export function crossingWarnings(attack: CrossingSwords) {
  if (attack.waves >= crossingSwordSettings.waves) return [];
  const wave = crossingWave(attack, attack.waves);
  const until = wave[0].launch - attack.age;
  return until >= 0 && until <= crossingSwordSettings.warning
    ? wave.filter((s) => attack.alive[s.owner])
    : [];
}
export const edgeMiniSettings = { perVolley: 3, speed: 340, scale: 0.4, distance: 500 };
export function edgeMiniVolley(attack: CrossingSwords, wave: number, soul: Point): CrossingSword[] {
  const { x, y, size, border } = attack.arena;
  const left = x + border,
    top = y + border,
    inner = size - border * 2;
  return Array.from({ length: edgeMiniSettings.perVolley }, (_, i) => {
    const side = (wave + i) % 4;
    const fraction = [0.25, 0.5, 0.75][(wave + i) % 3];
    const origin =
      side === 0
        ? { x: left, y: top + inner * fraction }
        : side === 1
          ? { x: left + inner * fraction, y: top }
          : side === 2
            ? { x: left + inner, y: top + inner * fraction }
            : { x: left + inner * fraction, y: top + inner };
    return {
      id: 1000 + wave * edgeMiniSettings.perVolley + i,
      owner: i === wave % 3 ? 'kaizo' : 'roaring',
      ...origin,
      origin,
      angle: Math.atan2(soul.y - origin.y, soul.x - origin.x),
      launch:
        crossingSwordSettings.warmup + crossingSwordSettings.warning + wave * crossingSwordSettings.interval,
      speed: edgeMiniSettings.speed,
      scale: edgeMiniSettings.scale,
      maxDistance: edgeMiniSettings.distance,
      active: false,
      hitOpponent: false,
    };
  });
}
function segmentInRect(
  from: Point,
  to: Point,
  rect: { x: number; y: number; width: number; height: number },
) {
  let low = 0,
    high = 1;
  for (const [a, delta, min, max] of [
    [from.x, to.x - from.x, rect.x, rect.x + rect.width],
    [from.y, to.y - from.y, rect.y, rect.y + rect.height],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (a < min || a > max) return false;
      continue;
    }
    const t1 = (min - a) / delta,
      t2 = (max - a) / delta;
    low = Math.max(low, Math.min(t1, t2));
    high = Math.min(high, Math.max(t1, t2));
    if (low > high) return false;
  }
  return true;
}
export function advanceCrossingSwords(
  attack: CrossingSwords,
  dt: number,
  alive: (owner: KnightOwner) => boolean = () => true,
  soul: Point = { x: attack.arena.x + attack.arena.size / 2, y: attack.arena.y + attack.arena.size / 2 },
) {
  if (!Number.isFinite(dt) || dt <= 0) return { arrived: [], finished: false };
  attack.age += dt;
  attack.alive = { roaring: alive('roaring'), kaizo: alive('kaizo') };
  attack.miniWarnings = attack.miniWarnings.filter((sword) => attack.alive[sword.owner]);
  attack.swords = attack.swords.filter(
    (s) =>
      !s.hitOpponent &&
      (attack.age - dt - s.launch) * s.speed < (s.maxDistance ?? crossingSwordSettings.distance),
  );
  while (
    attack.miniWaves < crossingSwordSettings.waves &&
    attack.age >= crossingSwordSettings.warmup + attack.miniWaves * crossingSwordSettings.interval - 1e-9
  ) {
    // Aim once at the start of the warning; moving afterward dodges the shot.
    attack.miniWarnings.push(
      ...edgeMiniVolley(attack, attack.miniWaves, soul).filter((s) => attack.alive[s.owner]),
    );
    attack.miniWaves++;
  }
  for (const sword of attack.miniWarnings) {
    if (attack.age >= sword.launch - 1e-9) attack.swords.push({ ...sword, active: true });
  }
  attack.miniWarnings = attack.miniWarnings.filter((s) => attack.age < s.launch - 1e-9);
  while (
    attack.waves < crossingSwordSettings.waves &&
    attack.age >=
      crossingSwordSettings.warmup +
        crossingSwordSettings.warning +
        attack.waves * crossingSwordSettings.interval -
        1e-9
  ) {
    attack.swords.push(...crossingWave(attack, attack.waves).filter((s) => attack.alive[s.owner]));
    attack.waves++;
  }
  const arrived: CrossingSword[] = [];
  for (const sword of attack.swords) {
    const cos = Math.cos(sword.angle),
      sin = Math.sin(sword.angle);
    const tip = 35 * (sword.scale ?? 1);
    const previous = { x: sword.x + cos * tip, y: sword.y + sin * tip };
    const distance = Math.max(0, attack.age - sword.launch) * sword.speed;
    sword.x = sword.origin.x + cos * distance;
    sword.y = sword.origin.y + sin * distance;
    const target =
      sword.owner === 'roaring'
        ? { x: 482, y: 50, width: 155, height: 240 }
        : { x: 8, y: 50, width: 155, height: 240 };
    if (segmentInRect(previous, { x: sword.x + cos * tip, y: sword.y + sin * tip }, target))
      arrived.push(sword);
  }
  return {
    arrived,
    finished:
      attack.waves === crossingSwordSettings.waves &&
      attack.swords.every(
        (s) =>
          s.hitOpponent ||
          (attack.age - s.launch) * s.speed >= (s.maxDistance ?? crossingSwordSettings.distance),
      ),
  };
}
export function crossingSwordTouches(sword: CrossingSword, soul: Point, width = 24, height = 21, margin = 0) {
  if (!sword.active || sword.hitOpponent) return false;
  const cos = Math.cos(sword.angle),
    sin = Math.sin(sword.angle),
    ac = Math.abs(cos),
    as = Math.abs(sin);
  const hw = width / 2 + margin,
    hh = height / 2 + margin;
  // SAT against each rotated blade, guard and handle rectangle; drawing uses this same silhouette.
  return [
    [10, 25, 5],
    [-17.5, 3.5, 16],
    [-30, 9, 3],
  ].some(([rawOffset, rawW, rawH]) => {
    const scale = sword.scale ?? 1;
    const offset = rawOffset * scale,
      w = rawW * scale,
      h = rawH * scale;
    const dx = soul.x - sword.x - cos * offset,
      dy = soul.y - sword.y - sin * offset;
    return (
      Math.abs(dx) < hw + ac * w + as * h &&
      Math.abs(dy) < hh + as * w + ac * h &&
      Math.abs(dx * cos + dy * sin) < w + ac * hw + as * hh &&
      Math.abs(-dx * sin + dy * cos) < h + as * hw + ac * hh
    );
  });
}
