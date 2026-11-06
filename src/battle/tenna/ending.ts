import type { Encounter } from '../shared/types.ts';
export const tennaCollapseSeconds = 2.2;
export const tennaEndingPhases = [
  'tennaFinaleOutburst',
  'tennaFinaleGlitch',
  'tennaFinaleShutdown',
  'tennaFinaleReturn',
];
export function beginTennaEnding(b: Encounter) {
  if (b.kind !== 'tenna' || b.tennaEndingStarted) return false;
  b.tennaEndingStarted = true;
  if (b.tennaSavedEnemy) b.enemy = { ...b.tennaSavedEnemy };
  b.enemy.name = 'Tenna';
  b.enemy.visible = true;
  b.undyneLeft = true;
  b.undyneMenuSpear = null;
  b.soul = b.snowAttack = null;
  b.minigame = null;
  b.pelletsCast = null;
  b.tennaHeadGlitch = true;
  b.hitAge = null;
  b.phase = 'tennaFinaleOutburst';
  b.turn = 'Tenna';
  b.screen = 'menu';
  b.tennaEndingAge = 0;
  return true;
}
export function completeTennaOutburst(b: Encounter) {
  if (b.phase !== 'tennaFinaleOutburst') return false;
  b.phase = 'tennaFinaleGlitch';
  b.tennaEndingAge = 0;
  return true;
}
export function advanceTennaEnding(b: Encounter, dt: number) {
  if (b.phase !== 'tennaFinaleGlitch') return false;
  b.tennaEndingAge = Math.min(tennaCollapseSeconds, (b.tennaEndingAge ?? 0) + dt);
  if (b.tennaEndingAge >= tennaCollapseSeconds - 1e-9) {
    b.enemy.visible = false;
    b.phase = 'tennaFinaleShutdown';
    return true;
  }
  return false;
}
export function completeTennaShutdown(b: Encounter) {
  if (b.phase !== 'tennaFinaleShutdown') return false;
  b.phase = 'tennaFinaleReturn';
  return true;
}
