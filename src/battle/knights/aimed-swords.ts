import type { Arena } from '../shared/types.ts';
import type { Point } from '../../world/types.ts';
import type { KnightOwner } from './projectiles.ts';
import { advanceAngledSwords, advanceEdgeMinis, type CrossingSword } from './crossing-swords.ts';

export const aimedSwordSettings = {
  waves: 6,
  bigPerVolley: 8,
  warmup: 0.3,
  warning: 0.7,
  interval: 1.7,
  speed: 650,
};
export interface AimedSwords {
  arena: Arena;
  age: number;
  waves: number;
  prepared: number;
  swords: CrossingSword[];
  warnings: CrossingSword[];
  rim: CrossingSword[];
  miniWaves: number;
  miniWarnings: CrossingSword[];
}
export function createAimedVolley(
  attack: Pick<AimedSwords, 'arena'>,
  wave: number,
  soul: Point,
): CrossingSword[] {
  const { x, y, size } = attack.arena;
  const positions = [
    [0, 0],
    [0.5, 0],
    [1, 0],
    [1, 0.5],
    [1, 1],
    [0.5, 1],
    [0, 1],
    [0, 0.5],
  ];
  return positions.map(([px, py], i) => {
    const origin = { x: x + 34 + px * (size - 68), y: y + 34 + py * (size - 68) };
    return {
      id: wave * 8 + i,
      owner: i % 2 ? 'kaizo' : 'roaring',
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
function createRim(arena: Arena): CrossingSword[] {
  return Array.from({ length: 16 }, (_, i) => {
    const side = Math.floor(i / 4),
      f = ((i % 4) + 0.5) / 4;
    const { x, y, size, border } = arena;
    const inner = size - border * 2;
    const origin =
      side === 0
        ? { x: x + border, y: y + border + inner * f }
        : side === 1
          ? { x: x + border + inner * f, y: y + border }
          : side === 2
            ? { x: x + size - border, y: y + border + inner * f }
            : { x: x + border + inner * f, y: y + size - border };
    return {
      id: 2000 + i,
      owner: i % 2 ? 'kaizo' : 'roaring',
      ...origin,
      origin,
      angle: [0, Math.PI / 2, Math.PI, -Math.PI / 2][side],
      scale: 0.28,
      active: true,
      hitOpponent: false,
      speed: 0,
      launch: 0,
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
    rim: createRim(arena),
    miniWaves: 0,
    miniWarnings: [],
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
  attack.rim = attack.rim.filter((s) => alive(s.owner));
  attack.warnings = attack.warnings.filter((s) => alive(s.owner));
  while (
    attack.prepared < aimedSwordSettings.waves &&
    attack.age >= aimedSwordSettings.warmup + attack.prepared * aimedSwordSettings.interval - 1e-9
  ) {
    attack.warnings.push(...createAimedVolley(attack, attack.prepared, soul).filter((s) => alive(s.owner)));
    attack.prepared++;
  }
  attack.swords.push(...advanceEdgeMinis(attack, aimedSwordSettings, soul, alive));
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
    finished:
      attack.waves === aimedSwordSettings.waves &&
      attack.warnings.length === 0 &&
      attack.miniWarnings.length === 0 &&
      motion.finished,
  };
}
