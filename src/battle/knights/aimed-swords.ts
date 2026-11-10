import type { Arena } from '../shared/types.ts';
import type { Point } from '../../world/types.ts';
import type { KnightOwner } from './projectiles.ts';
import { advanceAngledSwords, type CrossingSword } from './crossing-swords.ts';

export const aimedSwordSettings = {
  waves: 6,
  bigPerVolley: 8,
  warmup: 0.3,
  warning: 0.7,
  interval: 1.15,
  speed: 700,
  spawnGap: 60,
};
export interface AimedSwords {
  arena: Arena;
  age: number;
  waves: number;
  prepared: number;
  swords: CrossingSword[];
  warnings: CrossingSword[];
}
export function createAimedVolley(
  attack: Pick<AimedSwords, 'arena'>,
  wave: number,
  soul: Point,
): CrossingSword[] {
  const { x, y, size } = attack.arena;
  const positions = [
    [0, 0.3],
    [0, 0.7],
    [1, 0.3],
    [1, 0.7],
    [0.3, 0],
    [0.7, 0],
    [0.3, 1],
    [0.7, 1],
  ];
  return positions.map(([px, py], i) => {
    const gap = aimedSwordSettings.spawnGap;
    const origin = {
      x: px === 0 ? x - gap : px === 1 ? x + size + gap : x + px * size,
      y: py === 0 ? y - 20 : py === 1 ? y + size + 19 : y + py * size,
    };
    return {
      id: wave * 8 + i,
      owner: px < 0.5 ? 'roaring' : 'kaizo',
      ...origin,
      origin,
      angle: Math.atan2(soul.y - origin.y, soul.x - origin.x),
      active: false,
      hitOpponent: false,
      speed: aimedSwordSettings.speed,
      maxDistance: 750,
      launch: aimedSwordSettings.warmup + aimedSwordSettings.warning + wave * aimedSwordSettings.interval,
    };
  });
}
/** Horizontal staging keeps top/bottom swords visible outside the box before launch. */
export function aimedWarningAngle(sword: CrossingSword, arena: Arena) {
  return sword.origin.y < arena.y || sword.origin.y > arena.y + arena.size ? 0 : sword.angle;
}
export function createAimedSwords(arena: Arena): AimedSwords {
  return {
    arena: { ...arena, x: arena.x + 5, y: 40, size: 220 },
    age: 0,
    waves: 0,
    prepared: 0,
    swords: [],
    warnings: [],
  };
}
export function advanceAimedSwords(
  attack: AimedSwords,
  dt: number,
  alive: (owner: KnightOwner) => boolean = () => true,
  soul: Point = { x: attack.arena.x + attack.arena.size / 2, y: attack.arena.y + attack.arena.size / 2 },
) {
  if (!Number.isFinite(dt) || dt <= 0) return { arrived: [], finished: false };
  attack.age += dt;
  attack.warnings = attack.warnings.filter((s) => alive(s.owner));
  while (
    attack.prepared < aimedSwordSettings.waves &&
    attack.age >= aimedSwordSettings.warmup + attack.prepared * aimedSwordSettings.interval - 1e-9
  ) {
    attack.warnings.push(...createAimedVolley(attack, attack.prepared, soul).filter((s) => alive(s.owner)));
    attack.prepared++;
  }
  for (const sword of attack.warnings)
    if (attack.age >= sword.launch - 1e-9) attack.swords.push({ ...sword, active: true });
  attack.warnings = attack.warnings.filter((s) => attack.age < s.launch - 1e-9);
  attack.waves = Math.max(
    0,
    Math.min(
      aimedSwordSettings.waves,
      Math.floor(
        (attack.age - aimedSwordSettings.warmup - aimedSwordSettings.warning + 1e-9) /
          aimedSwordSettings.interval,
      ) + 1,
    ),
  );
  const motion = advanceAngledSwords(attack.swords, attack.age, dt);
  attack.swords = motion.swords;
  return {
    arrived: motion.arrived,
    finished: attack.waves === aimedSwordSettings.waves && attack.warnings.length === 0 && motion.finished,
  };
}
