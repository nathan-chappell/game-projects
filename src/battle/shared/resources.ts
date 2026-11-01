import { battleSettings } from './settings.ts';
import type { Encounter } from './types.ts';

export function bossAttackDamage(encounter: Encounter, baseDamage: number) {
  return baseDamage + (encounter?.snowAttack?.buffed ? battleSettings.strongerDamageBonus : 0);
}

// Future projectile patterns should use this instead of subtracting their full damage directly.
export function projectileDamage(encounter: Encounter, baseDamage: number) {
  return Math.max(0, Math.round(baseDamage * (encounter?.projectileDamageMultiplier ?? 1)));
}

// All TP gains share the same cap, including Defend and projectile grazing.
export function addTP(encounter: Encounter, amount: number) {
  if (!encounter || !Number.isFinite(amount) || amount < 0) return;
  encounter.tp = Math.min(battleSettings.maxTP, encounter.tp + amount);
}

export function gainBattleTP(encounter: Encounter, amount: number, source: string) {
  const before = encounter.tp;
  addTP(encounter, amount);
  const gained = encounter.tp - before;
  if (gained > 0) {
    encounter.tpGainAge = 0;
    encounter.tpGainAmount = gained;
    encounter.tpGainSource = source;
  }
  return gained;
}
