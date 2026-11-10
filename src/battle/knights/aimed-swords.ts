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
  // Side banks keep all eight full-size swords visible above the battle HUD.
  const positions = [
    [0, 0.12],
    [1, 0.12],
    [0, 0.36],
    [1, 0.36],
    [0, 0.64],
    [1, 0.64],
    [0, 0.88],
    [1, 0.88],
  ];
  return positions.map(([px, py], i) => {
    const gap = aimedSwordSettings.spawnGap;
    const origin = { x: x - gap + px * (size + gap * 2), y: y + py * size };
    return {
      id: wave * 8 + i,
      owner: px === 0 ? 'roaring' : 'kaizo',
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
export function createAimedSwords(arena: Arena): AimedSwords {
  return {
    arena: { ...arena },
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
