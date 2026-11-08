import { advanceEdgeMinis, advanceAngledSwords, type CrossingSword } from './crossing-swords.ts';
import type { Point } from '../../world/types.ts';
import type { Arena, Sword } from '../shared/types.ts';
import type { KnightOwner, KnightProjectile } from './projectiles.ts';

export const knightSwordSettings = {
  speed: 600,
  warmup: 0.9,
  interval: 0.85,
  warning: 0.55,
  waves: 12,
  lanes: 6,
  hitCooldown: 0.75,
  left: 150,
  right: 490,
};
const gaps = [2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5];
export interface KnightSword extends Sword, KnightProjectile {}
export interface KnightSwordAttack {
  arena: Arena;
  age: number;
  waves: number;
  nextId: number;
  swords: KnightSword[];
  minis: CrossingSword[];
  miniWarnings: CrossingSword[];
  miniWaves: number;
}
export function createKnightSwords(arena: Arena): KnightSwordAttack {
  return {
    arena: { ...arena },
    age: 0,
    waves: 0,
    nextId: 0,
    swords: [],
    minis: [],
    miniWarnings: [],
    miniWaves: 0,
  };
}
export function knightSwordLane(attack: KnightSwordAttack, lane: number) {
  return attack.arena.y + 15 + (lane * (attack.arena.size - 30)) / (knightSwordSettings.lanes - 1);
}
export function knightSwordWarning(attack: KnightSwordAttack) {
  if (attack.waves >= knightSwordSettings.waves) return [];
  const until = knightSwordSettings.warmup + attack.waves * knightSwordSettings.interval - attack.age;
  if (until < 0 || until > knightSwordSettings.warning) return [];
  return Array.from({ length: knightSwordSettings.lanes }, (_, lane) => lane)
    .filter((lane) => lane !== gaps[attack.waves])
    .map((lane) => knightSwordLane(attack, lane));
}
export function advanceKnightSwords(
  attack: KnightSwordAttack,
  dt: number,
  alive: (owner: KnightOwner) => boolean = () => true,
  soul: Point = { x: attack.arena.x + attack.arena.size / 2, y: attack.arena.y + attack.arena.size / 2 },
) {
  if (!Number.isFinite(dt) || dt <= 0) return { arrived: [], finished: false };
  attack.age += dt;
  attack.minis.push(
    ...advanceEdgeMinis(
      attack,
      {
        warmup: knightSwordSettings.warmup - knightSwordSettings.warning,
        warning: knightSwordSettings.warning,
        interval: knightSwordSettings.interval,
        waves: knightSwordSettings.waves,
      },
      soul,
      alive,
    ),
  );
  const miniMotion = advanceAngledSwords(attack.minis, attack.age, dt);
  attack.minis = miniMotion.swords;
  attack.swords = attack.swords.filter((sword) => !sword.hitOpponent);
  while (
    attack.waves < knightSwordSettings.waves &&
    attack.age >= knightSwordSettings.warmup + attack.waves * knightSwordSettings.interval - 1e-9
  ) {
    const launch = knightSwordSettings.warmup + attack.waves * knightSwordSettings.interval;
    for (const owner of ['roaring', 'kaizo'] as const) {
      if (!alive(owner)) continue;
      for (let lane = 0; lane < knightSwordSettings.lanes; lane++) {
        if (lane === gaps[attack.waves]) continue;
        attack.swords.push({
          id: attack.nextId++,
          owner,
          launch,
          active: true,
          hitOpponent: false,
          x: owner === 'roaring' ? knightSwordSettings.left : knightSwordSettings.right,
          y: knightSwordLane(attack, lane),
        });
      }
    }
    attack.waves++;
  }
  const arrived: KnightSword[] = [];
  for (const sword of attack.swords) {
    const distance = Math.max(0, attack.age - sword.launch) * knightSwordSettings.speed;
    sword.x =
      sword.owner === 'roaring' ? knightSwordSettings.left + distance : knightSwordSettings.right - distance;
    // The leading blade meets the opposing knight's body, outside the soul arena.
    // Testing a crossed boundary also handles slow frames without losing enemy hits.
    if (sword.owner === 'roaring' ? sword.x + 35 >= 510 : sword.x - 35 <= 130) arrived.push(sword);
  }
  return {
    arrived: [...arrived, ...miniMotion.arrived],
    finished:
      attack.waves === knightSwordSettings.waves &&
      attack.swords.every((sword) => sword.hitOpponent) &&
      miniMotion.finished,
  };
}
