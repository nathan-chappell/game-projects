import type { AttackDirection, BattleAction } from './types.ts';

export const battleSettings = {
  enemyHP: 3000,
  krisAttackDamage: 75,
  floweyAttackDamage: 80,
  fastKillDamage: 1000,
  pelletsDamage: 150,
  pelletsHealing: 35,
  pelletsCost: 90,
  swordSwingSeconds: 0.32,
  enemyHitSeconds: 0.5,
  soulSpeed: 150,
  darkSoulSpeed: 157.5,
  soulWidth: 24,
  soulHeight: 21,
  snowballDamage: 15,
  snowballRadius: 10,
  snowballSpeed: 70,
  snowballGravity: 180,
  snowballPileHeight: 6.2,
  snowBorderDepth: 16,
  snowWaveDelay: 0.55,
  snowStartDelay: 0.7,
  strongerWaveStagger: 0.45,
  snowEndPause: 0.65,
  snowSlowMultiplier: 0.5,
  snowContactDamage: 25,
  snowContactInterval: 1,
  snowPathDamage: 30,
  snowPathSlowMultiplier: 0.25,
  snowPathWidth: 80,
  strongerPathWidth: 64,
  strongerDamageBonus: 7,
  snowPathSpeed: 88,
  snowPathSegment: 140,
  snowPathDuration: 14,
  soulHitCooldown: 0.75,
  maxTP: 100,
  grazeTP: 3,
  grazeDistance: 10,
  grazeInterval: 0.5,
  defendTP: 10,
  tpGainSeconds: 0.65,
  proceedCost: 100,
  proceedsToDisappear: 3,
  defendDamageMultiplier: 0.5,
};

export const battleActions: BattleAction[] = ['attack', 'act', 'item', 'defend'];

export const enemyAttacks: AttackDirection[] = ['down', 'right', 'path', 'orbit', 'crossing'];

export const battleArena = { x: 205, y: 48, size: 230, border: 4 };
