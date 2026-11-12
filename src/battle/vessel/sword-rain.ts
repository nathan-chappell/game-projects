import { createGoalAttack } from '../noelle/goal.ts';
import { createStarBomb, starBombSettings, type StarBomb } from './star-bombs.ts';
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
  edgeSpeedMultiplier: 0.85,
  fallingDamage: 40,
  miniCount: 4,
  miniDamage: 15,
  hitCooldown: 0.75,
  miniSpeed: 210,
  miniLifetime: 3.5,
};
export const vesselJumpSettings = {
  volleys: 12,
  interval: 0.95,
  pairDelay: 0.18,
  speed: 300,
  soulSpeed: 180,
  redWave: 4,
  miniSpacing: 0.16,
};

export interface VesselSword extends Point {
  kind: 'falling' | 'launched' | 'sweeping' | 'mini';
  vx: number;
  vy: number;
  angle: number;
  scale: number;
  age: number;
  active: boolean;
  hitOpponent: false;
  red?: boolean;
  delay?: number;
}
export interface VesselRain {
  pattern: 'rain' | 'edges' | 'bombs' | 'jump';
  blueSoul: ReturnType<typeof createGoalAttack>;
  age: number;
  volleys: number;
  nextVolley: number;
  bombs: StarBomb[];
  warnings: (Point & { angle: number; remaining: number; red?: boolean })[];
  swords: VesselSword[];
  bursts: (Point & { age: number; angle: number; radial?: boolean })[];
}
export function createVesselRain(pattern: VesselRain['pattern'] = 'rain'): VesselRain {
  return {
    pattern,
    blueSoul: createGoalAttack(),
    age: 0,
    volleys: 0,
    nextVolley: vesselRainSettings.warmup,
    bombs: [],
    warnings: [],
    swords: [],
    bursts: [],
  };
}

export function advanceVesselRain(rain: VesselRain, dt: number, soul: Point, random = Math.random) {
  const volleys = rain.pattern === 'jump' ? vesselJumpSettings.volleys : vesselRainSettings.volleys;
  const interval = rain.pattern === 'jump' ? vesselJumpSettings.interval : vesselRainSettings.interval;
  // Substeps keep floor impacts and accelerated swords consistent across frame rates.
  let remaining = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  while (remaining > 1e-9) {
    const step = Math.min(remaining, 1 / 120);
    remaining -= step;
    rain.age += step;
    rain.nextVolley -= step;
    if (rain.volleys < volleys && rain.nextVolley <= 1e-9) {
      if (rain.pattern === 'jump') {
        const left = rain.volleys % 2 === 0;
        for (let i = 0; i < 2; i++)
          rain.warnings.push({
            x: left ? -40 : 680,
            y: 468,
            angle: left ? 0 : Math.PI,
            remaining: vesselRainSettings.warning + i * vesselJumpSettings.pairDelay,
            red: rain.volleys === vesselJumpSettings.redWave && i === 0,
          });
      } else if (rain.pattern === 'bombs') {
        for (let i = 0; i < 2; i++) rain.bombs.push(createStarBomb(soul, rain.bombs, random));
      } else if (rain.pattern === 'edges') {
        const first = Math.floor(random() * 4);
        const second = (first + 1 + Math.floor(random() * 3)) % 4;
        for (const side of [first, second]) {
          const along = random();
          const x = side === 0 ? -40 : side === 1 ? 680 : 24 + along * 592;
          const y = side === 2 ? -40 : side === 3 ? 520 : 24 + along * 432;
          // Lock the aim at the warning; an interior target always sends the sword inward.
          const target = { x: Math.max(80, Math.min(560, soul.x)), y: Math.max(80, Math.min(400, soul.y)) };
          rain.warnings.push({
            x,
            y,
            angle: Math.atan2(target.y - y, target.x - x),
            remaining: vesselRainSettings.warning,
          });
        }
      } else {
        const x = Math.max(24, Math.min(616, soul.x));
        const other = 24 + ((x - 24 + 180 + random() * 232) % 592);
        rain.warnings.push(
          ...[x, other].map((column) => ({
            x: column,
            y: -40,
            angle: Math.PI / 2,
            remaining: vesselRainSettings.warning,
          })),
        );
      }
      rain.volleys++;
      rain.nextVolley += interval;
    }
    rain.bursts = rain.bursts.filter((burst) => (burst.age += step) < 0.45);
    rain.bombs = rain.bombs.filter((bomb) => {
      bomb.age += step;
      if (bomb.age < starBombSettings.fuse - 1e-9) return true;
      rain.bursts.push({ x: bomb.x, y: bomb.y, age: 0, angle: 0, radial: true });
      for (let i = 0; i < starBombSettings.miniCount; i++) {
        const angle = bomb.angle + (i / starBombSettings.miniCount) * Math.PI * 2;
        rain.swords.push({
          kind: 'mini',
          x: bomb.x,
          y: bomb.y,
          vx: Math.cos(angle) * starBombSettings.miniSpeed,
          vy: Math.sin(angle) * starBombSettings.miniSpeed,
          angle,
          scale: 0.4,
          age: 0,
          active: true,
          hitOpponent: false,
          red: true,
        });
      }
      return false;
    });
    rain.warnings = rain.warnings.filter((warning) => {
      warning.remaining -= step;
      if (warning.remaining > 1e-9) return true;
      const speed =
        rain.pattern === 'jump'
          ? vesselJumpSettings.speed
          : vesselRainSettings.fallingSpeed *
            (rain.pattern === 'edges' ? vesselRainSettings.edgeSpeedMultiplier : 1);
      rain.swords.push({
        kind: rain.pattern === 'jump' ? 'sweeping' : rain.pattern === 'edges' ? 'launched' : 'falling',
        x: warning.x,
        y: warning.y,
        vx: Math.cos(warning.angle) * speed,
        vy: Math.sin(warning.angle) * speed,
        angle: warning.angle,
        red: warning.red,
        scale: 1,
        age: 0,
        active: true,
        hitOpponent: false,
      });
      return false;
    });
    const next: VesselSword[] = [];
    for (const sword of rain.swords) {
      if ((sword.delay ?? 0) > 1e-9) {
        sword.delay = Math.max(0, (sword.delay ?? 0) - step);
        sword.active = sword.delay <= 1e-9;
        next.push(sword);
        continue;
      }
      sword.age += step;
      if (sword.kind === 'falling' || sword.kind === 'launched') {
        const multiplier = sword.kind === 'launched' ? vesselRainSettings.edgeSpeedMultiplier : 1;
        const speed = Math.min(
          vesselRainSettings.fallingMaxSpeed * multiplier,
          Math.hypot(sword.vx, sword.vy) + vesselRainSettings.fallingGravity * multiplier * step,
        );
        sword.vx = Math.cos(sword.angle) * speed;
        sword.vy = Math.sin(sword.angle) * speed;
      }
      sword.x += sword.vx * step;
      sword.y += sword.vy * step;
      const tip = { x: sword.x + Math.cos(sword.angle) * 35, y: sword.y + Math.sin(sword.angle) * 35 };
      const impactAngle =
        sword.kind === 'mini'
          ? null
          : sword.vx < -1e-9 && tip.x <= 0
            ? 0
            : sword.vx > 1e-9 && tip.x >= 640
              ? Math.PI
              : sword.vy < -1e-9 && tip.y <= 0
                ? Math.PI / 2
                : sword.vy > 1e-9 && tip.y >= 480
                  ? -Math.PI / 2
                  : null;
      if (impactAngle !== null) {
        if (sword.kind === 'sweeping' && !sword.red) continue;
        const impact = { x: Math.max(0, Math.min(640, tip.x)), y: Math.max(0, Math.min(480, tip.y)) };
        const x = Math.max(6, Math.min(634, impact.x)),
          y = Math.max(6, Math.min(474, impact.y));
        rain.bursts.push({ ...impact, age: 0, angle: impactAngle });
        for (let i = 0; i < vesselRainSettings.miniCount; i++) {
          const fraction = i / (vesselRainSettings.miniCount - 1);
          const angle =
            sword.kind === 'sweeping'
              ? impactAngle
              : impactAngle - Math.PI / 2 + 0.3 + fraction * (Math.PI - 0.6);
          const miniSpeed = sword.red ? starBombSettings.miniSpeed : vesselRainSettings.miniSpeed;
          next.push({
            kind: 'mini',
            red: sword.red,
            delay: sword.kind === 'sweeping' ? i * vesselJumpSettings.miniSpacing : 0,
            x,
            y: sword.kind === 'sweeping' ? 468 : y,
            vx: Math.cos(angle) * miniSpeed,
            vy: Math.sin(angle) * miniSpeed,
            angle,
            scale: 0.4,
            age: 0,
            active: sword.kind !== 'sweeping' || i === 0,
            hitOpponent: false,
          });
        }
      } else if (
        sword.kind !== 'mini' ||
        (sword.age < vesselRainSettings.miniLifetime &&
          sword.x > -40 &&
          sword.x < 680 &&
          sword.y > -40 &&
          sword.y < 520)
      )
        next.push(sword);
    }
    rain.swords = next;
  }
  return (
    rain.volleys === volleys &&
    !rain.bombs.length &&
    !rain.warnings.length &&
    !rain.swords.length &&
    !rain.bursts.length
  );
}
