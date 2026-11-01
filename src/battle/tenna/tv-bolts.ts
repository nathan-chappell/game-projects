import type { Point } from '../../world/types.ts';
import type { Arena } from '../shared/types.ts';
export const tvBoltSettings = {
  damage: 30,
  hitCooldown: 0.75,
  warmup: 0.8,
  fireInterval: 0.22,
  speed: 330,
  duration: 10,
  glitchWarning: 0.35,
};
interface Bolt extends Point {
  vx: number;
  vy: number;
  burst: boolean;
}
export function createTvBolts(arena: Arena, random: () => number = Math.random) {
  return {
    arena: { ...arena },
    age: 0,
    tvX: arena.x + 24,
    bolts: [] as Bolt[],
    nextShot: tvBoltSettings.warmup,
    nextGlitch: 2 + random() * 1.5,
    burstAt: null as number | null,
    bursts: 0,
  };
}
export type TvBolts = ReturnType<typeof createTvBolts>;
export function advanceTvBolts(a: TvBolts, dt: number, random: () => number = Math.random) {
  a.age += dt;
  const span = a.arena.size - 48,
    phase = (a.age * 150) % (2 * span);
  a.tvX = a.arena.x + 24 + Math.min(phase, 2 * span - phase);
  const launch = (angle: number, burst: boolean) =>
    a.bolts.push({
      x: a.tvX,
      y: a.arena.y + 6,
      vx: Math.sin(angle) * tvBoltSettings.speed,
      vy: Math.cos(angle) * tvBoltSettings.speed,
      burst,
    });
  if (a.age < tvBoltSettings.duration) {
    if (a.burstAt === null && a.age >= a.nextGlitch) a.burstAt = a.age + tvBoltSettings.glitchWarning;
    if (a.burstAt !== null && a.age >= a.burstAt) {
      for (const angle of [-0.6, -0.3, 0, 0.3, 0.6]) launch(angle, true);
      a.bursts++;
      a.burstAt = null;
      a.nextGlitch = a.age + 2 + random() * 1.5;
      a.nextShot = a.age + tvBoltSettings.fireInterval;
    }
    if (a.age >= a.nextShot) {
      if (a.burstAt === null) launch(0, false);
      a.nextShot = a.age + tvBoltSettings.fireInterval;
    }
  } else a.burstAt = null;
  for (const b of a.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  a.bolts = a.bolts.filter(
    (b) => b.y < a.arena.y + a.arena.size + 24 && b.x > a.arena.x - 24 && b.x < a.arena.x + a.arena.size + 24,
  );
  return a.age >= tvBoltSettings.duration && !a.bolts.length;
}
export function boltTouches(b: Point, soul: Point, width = 24, height = 21, margin = 0) {
  return [
    { x: b.x + 1, y: b.y - 9, hw: 7, hh: 5 },
    { x: b.x - 1, y: b.y, hw: 5, hh: 5 },
    { x: b.x - 2, y: b.y + 9, hw: 3, hh: 6 },
  ].some(
    (p) =>
      Math.abs(p.x - soul.x) < p.hw + width / 2 + margin &&
      Math.abs(p.y - soul.y) < p.hh + height / 2 + margin,
  );
}
export function drawTvBolts(ctx: CanvasRenderingContext2D, a: TvBolts) {
  const warning = a.burstAt !== null,
    jitter = warning ? Math.sin(a.age * 95) * 3 : 0,
    x = Math.round(a.tvX + jitter),
    y = a.arena.y - 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#11131d';
  ctx.fillRect(-23, -14, 46, 29);
  ctx.fillStyle = '#b7bac4';
  ctx.fillRect(-20, -11, 40, 23);
  ctx.fillStyle = warning ? '#ff68d1' : '#303543';
  ctx.fillRect(-16, -8, 27, 17);
  ctx.fillStyle = warning ? '#ffffff' : '#b9e9df';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(warning ? '!?!' : 'TV', -12, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(14, -5, 3, 3);
  ctx.fillRect(14, 2, 3, 3);
  ctx.strokeStyle = '#cbd0d9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -14);
  ctx.lineTo(-12, -21);
  ctx.moveTo(5, -14);
  ctx.lineTo(12, -21);
  ctx.stroke();
  if (warning) {
    ctx.fillStyle = '#8af8ed';
    ctx.fillRect(-24, -5, 17, 2);
    ctx.fillStyle = '#ee5ea4';
    ctx.fillRect(5, 5, 22, 3);
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(a.arena.x + 3, a.arena.y + 3, a.arena.size - 6, a.arena.size - 6);
  ctx.clip();
  for (const b of a.bolts) {
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(8, -14);
    ctx.lineTo(2, -3);
    ctx.lineTo(6, -3);
    ctx.lineTo(-4, 15);
    ctx.lineTo(-2, 3);
    ctx.lineTo(-7, 3);
    ctx.lineTo(-3, -5);
    ctx.closePath();
    ctx.strokeStyle = '#17151c';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = b.burst ? '#ffb5e6' : '#fff4ac';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
