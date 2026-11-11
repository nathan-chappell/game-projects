import type { Encounter } from '../shared/types.ts';
export const vesselSettings = {
  hp: 10000,
  xSlashDamage: 250,
  krisDamage: 100,
  teammateDamage: 10,
  actDamage: 20,
  xSlashSeconds: 0.75,
  openingSeconds: 1,
  guardSeconds: 1,
};
export const vesselBattleLayout = {
  kris: { x: 185, y: 238, scale: 1.1 },
  flowey: { x: 220, y: 286, scale: 1.1 },
  susie: { x: 285, y: 225, scale: 1.1 },
  ralsey: { x: 350, y: 288, scale: 1.1 },
  vessel: { x: 455, y: 270, height: 120 },
};
export function vesselDamage(encounter: Encounter, act = false) {
  return act
    ? encounter.turn === 'Kris'
      ? vesselSettings.xSlashDamage
      : vesselSettings.actDamage
    : encounter.turn === 'Kris'
      ? vesselSettings.krisDamage
      : vesselSettings.teammateDamage;
}
export function xSlashBackgroundShake(age: number | undefined, reduced: boolean) {
  return reduced || age === undefined ? 0 : Math.max(0, 1 - age / 0.65) * 2;
}
