import type { Encounter } from '../shared/types.ts';
export const pelletsSettings = { gather: 0.4, travel: 0.6, close: 0.3, recover: 0.5, count: 32 };
export const pelletsImpactTime = pelletsSettings.gather + pelletsSettings.travel + pelletsSettings.close;
export const pelletsDuration = pelletsImpactTime + pelletsSettings.recover;
export const isPelletCast = (encounter: Encounter | null) => encounter?.phase === 'pellets';

// The white pellet ring forms at Flowey, surrounds the enemy, then closes in.
export function pelletsFrame(age: number, reducedMotion = false, dark: boolean = false) {
  const origin = dark ? { x: 83, y: 202 } : { x: 178, y: 224 },
    target = dark ? { x: 512, y: 80 } : { x: 528, y: 192 };
  let x = target.x,
    y = target.y,
    radius = 76,
    alpha = 1,
    size = 1,
    rotation = 0;
  if (age < pelletsSettings.gather) {
    const p = age / pelletsSettings.gather;
    x = origin.x;
    y = origin.y;
    radius = 24 + p * 10;
    alpha = Math.min(1, p * 4);
    size = 0.65;
    rotation = p * 0.3;
  } else if (age < pelletsSettings.gather + pelletsSettings.travel) {
    const p = (age - pelletsSettings.gather) / pelletsSettings.travel,
      ease = p * p * (3 - 2 * p);
    x = origin.x + (target.x - origin.x) * ease;
    y = origin.y + (target.y - origin.y) * ease;
    radius = 34 + ease * 42;
    size = 0.65 + p * 0.35;
    rotation = 0.3 + p * 0.5;
  } else if (age < pelletsImpactTime) {
    const p = (age - pelletsSettings.gather - pelletsSettings.travel) / pelletsSettings.close;
    radius = 76 * (1 - p * p);
    rotation = 0.8 + p * 0.25;
  } else {
    const p = Math.min(1, (age - pelletsImpactTime) / pelletsSettings.recover);
    radius = 8 + p * 36;
    alpha = (1 - p) ** 2;
    size = 1 - p * 0.5;
  }
  if (reducedMotion) {
    x = target.x;
    y = target.y;
    radius = 76;
    rotation = 0;
    size = 1;
    if (age >= pelletsImpactTime)
      alpha = Math.max(0, 1 - (age - pelletsImpactTime) / pelletsSettings.recover);
  }
  return { x, y, radius, alpha, size, rotation };
}
