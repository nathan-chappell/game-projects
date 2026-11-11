import type { Point } from '../../world/types.ts';

export const vesselRainArena = { x: 0, y: 0, width: 640, height: 480, border: 0 };
export const vesselRainSettings = {
  volleys: 14,
  interval: 0.65,
  warmup: 0.7,
  warning: 0.5,
  fallingSpeed: 270,
  fallingGravity: 480,
  fallingMaxSpeed: 780,
  fallingDamage: 40,
  miniCount: 4,
  miniDamage: 15,
  hitCooldown: 0.75,
  miniSpeed: 210,
  miniLifetime: 3.5,
};
export interface VesselSword extends Point {
  kind: 'falling' | 'mini';
  vx: number;
  vy: number;
  angle: number;
  scale: number;
  age: number;
  active: boolean;
  hitOpponent: false;
}
export interface VesselRain {
  age: number;
  volleys: number;
  nextVolley: number;
  warnings: { x: number; remaining: number }[];
  swords: VesselSword[];
  bursts: (Point & { age: number })[];
}
export function createVesselRain(): VesselRain {
  return { age: 0, volleys: 0, nextVolley: vesselRainSettings.warmup, warnings: [], swords: [], bursts: [] };
}

export function advanceVesselRain(rain: VesselRain, dt: number, soul: Point, random = Math.random) {
  // Substeps keep floor impacts and accelerated swords consistent across frame rates.
  let remaining = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  while (remaining > 1e-9) {
    const step = Math.min(remaining, 1 / 120);
    remaining -= step;
    rain.age += step;
    rain.nextVolley -= step;
    if (rain.volleys < vesselRainSettings.volleys && rain.nextVolley <= 1e-9) {
      const x = Math.max(24, Math.min(616, soul.x));
      const other = 24 + ((x - 24 + 180 + random() * 232) % 592);
      rain.warnings.push(
        ...[x, other].map((column) => ({ x: column, remaining: vesselRainSettings.warning })),
      );
      rain.volleys++;
      rain.nextVolley += vesselRainSettings.interval;
    }
    rain.bursts = rain.bursts.filter((burst) => (burst.age += step) < 0.45);
    rain.warnings = rain.warnings.filter((warning) => {
      warning.remaining -= step;
      if (warning.remaining > 1e-9) return true;
      rain.swords.push({
        kind: 'falling',
        x: warning.x,
        y: -40,
        vx: 0,
        vy: vesselRainSettings.fallingSpeed,
        angle: Math.PI / 2,
        scale: 1,
        age: 0,
        active: true,
        hitOpponent: false,
      });
      return false;
    });
    const next: VesselSword[] = [];
    for (const sword of rain.swords) {
      sword.age += step;
      if (sword.kind === 'falling')
        sword.vy = Math.min(
          vesselRainSettings.fallingMaxSpeed,
          sword.vy + vesselRainSettings.fallingGravity * step,
        );
      sword.x += sword.vx * step;
      sword.y += sword.vy * step;
      if (sword.kind === 'falling' && sword.y + 35 >= vesselRainArena.height) {
        const x = sword.x,
          y = vesselRainArena.height - 6;
        rain.bursts.push({ x, y: vesselRainArena.height, age: 0 });
        for (let i = 0; i < vesselRainSettings.miniCount; i++) {
          const angle = -Math.PI + 0.3 + (i / (vesselRainSettings.miniCount - 1)) * (Math.PI - 0.6);
          next.push({
            kind: 'mini',
            x,
            y,
            vx: Math.cos(angle) * vesselRainSettings.miniSpeed,
            vy: Math.sin(angle) * vesselRainSettings.miniSpeed,
            angle,
            scale: 0.4,
            age: 0,
            active: true,
            hitOpponent: false,
          });
        }
      } else if (
        sword.kind === 'falling' ||
        (sword.age < vesselRainSettings.miniLifetime && sword.x > -40 && sword.x < 680 && sword.y > -40)
      )
        next.push(sword);
    }
    rain.swords = next;
  }
  return (
    rain.volleys === vesselRainSettings.volleys &&
    !rain.warnings.length &&
    !rain.swords.length &&
    !rain.bursts.length
  );
}
