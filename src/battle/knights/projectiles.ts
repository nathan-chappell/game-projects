import type { Point } from '../../world/types.ts';
import type { Encounter } from '../shared/types.ts';

export type KnightOwner = 'roaring' | 'kaizo';
export interface KnightProjectile {
  owner: KnightOwner;
  hitOpponent: boolean;
}
export const knightProjectileRules = {
  roaring: { partyDamage: 40, opponentDamage: 5 },
  kaizo: { partyDamage: 50, opponentDamage: 5 },
} as const;

/** All knight patterns use this when an owned projectile reaches the other knight. */
export function hitOpposingKnight(encounter: Encounter, projectile: KnightProjectile) {
  if (encounter.kind !== 'knights' || !encounter.knightEnemies || projectile.hitOpponent) return 0;
  projectile.hitOpponent = true;
  const target = projectile.owner === 'roaring' ? 'kaizo' : 'roaring';
  const enemy = encounter.knightEnemies[target];
  const damage = Math.min(Math.max(0, enemy.hp), knightProjectileRules[projectile.owner].opponentDamage);
  enemy.hp -= damage;
  if (damage > 0) {
    encounter.knightImpacts ??= {};
    encounter.knightImpacts[target] = { damage, age: 0 };
  }
  return damage;
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
export function crossesOpposingKnight(owner: KnightOwner, from: Point, to: Point, radius = 0) {
  return segmentInRect(from, to, {
    x: (owner === 'roaring' ? 482 : 8) - radius,
    y: 50 - radius,
    width: 155 + radius * 2,
    height: 240 + radius * 2,
  });
}
