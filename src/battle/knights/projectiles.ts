import type { Encounter } from '../shared/types.ts';

export type KnightOwner = 'roaring' | 'kaizo';
export interface KnightProjectile {
  owner: KnightOwner;
  hitOpponent: boolean;
}
export const knightProjectileRules = {
  roaring: { partyDamage: 40, opponentDamage: 30 },
  kaizo: { partyDamage: 50, opponentDamage: 60 },
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
