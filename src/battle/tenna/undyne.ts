import type { Arena } from '../shared/types.ts';
export const undyneSettings = {
  damage: 30,
  interval: 0.32,
  warmup: 1.5,
  spears: 30,
  speed: 320,
  warning: 0.45,
};
export const spearSides = ['up', 'right', 'down', 'left'] as const;
export function undyneSpawnDistance(side: string) {
  return side === 'up' || side === 'down' ? 240 : 320;
}
export function createUndyneAttack(arena: Arena, random: () => number = Math.random) {
  let previous = -1;
  return {
    age: 0,
    arena: { ...arena },
    center: { x: 320, y: 240 },
    shield: 'up' as string,
    flash: 0,
    blocked: 0,
    spears: Array.from({ length: undyneSettings.spears }, (_, i) => {
      const choice = Math.min(2, Math.floor(random() * 3));
      const side = previous >= 0 && choice >= previous ? choice + 1 : choice;
      previous = side;
      return {
        side: spearSides[side],
        yellow: i % 4 === 3,
        launch:
          undyneSettings.warmup +
          i * undyneSettings.interval +
          (320 - undyneSpawnDistance(spearSides[side])) / undyneSettings.speed,
        resolved: false,
      };
    }),
  };
}
export type UndyneAttack = ReturnType<typeof createUndyneAttack>;
export function spearDistance(a: UndyneAttack, launch: number, side = 'up', age = a.age) {
  return undyneSpawnDistance(side) - Math.max(0, age - launch) * undyneSettings.speed;
}
export function spearBlockSide(s: UndyneAttack['spears'][number]) {
  return spearSides[(spearSides.indexOf(s.side) + (s.yellow ? 2 : 0)) % 4];
}
export function undyneArenaBounds(a: UndyneAttack) {
  const progress = Math.min(1, a.age / 0.95),
    ease = 1 - (1 - progress) ** 3;
  const size = a.arena.size + (1400 - a.arena.size) * ease;
  return { x: a.center.x - size / 2, y: a.center.y - size / 2, size };
}
export function advanceUndyneAttack(a: UndyneAttack, dt: number) {
  a.age += dt;
  a.flash = Math.max(0, a.flash - dt);
  let hits = 0,
    blocked = 0;
  for (const s of a.spears) {
    if (s.resolved || a.age < s.launch) continue;
    const distance = spearDistance(a, s.launch, s.side);
    if (distance <= 34 && a.shield === spearBlockSide(s)) {
      s.resolved = true;
      a.blocked++;
      blocked++;
      a.flash = 0.16;
    } else if (distance <= 12) {
      s.resolved = true;
      hits++;
    }
  }
  return { hits, blocked, finished: a.spears.every((s) => s.resolved) };
}
export function undyneSpearPose(a: UndyneAttack, s: UndyneAttack['spears'][number], age = a.age) {
  const distance = spearDistance(a, s.launch, s.side, age);
  const turn = s.yellow ? Math.max(0, Math.min(1, (135 - distance) / 65)) : 0;
  const angle = (spearSides.indexOf(s.side) * Math.PI) / 2 + Math.PI * turn;
  return {
    x: a.center.x + Math.sin(angle) * distance,
    y: a.center.y - Math.cos(angle) * distance,
    angle,
    distance,
  };
}
export function drawUndyneAttack(ctx: CanvasRenderingContext2D, a: UndyneAttack) {
  const { x: cx, y: cy } = a.center;
  ctx.save();
  for (const s of a.spears) {
    if (s.resolved || a.age < s.launch - undyneSettings.warning) continue;
    if (a.age >= s.launch) {
      ctx.save();
      ctx.strokeStyle = s.yellow ? '#ffe045' : '#2ad4de';
      ctx.lineCap = 'round';
      // Sample the actual trajectory, so yellow trails bend with the reversal.
      for (let sample = 9; sample >= 1; sample--) {
        const fromAge = a.age - sample * 0.018;
        if (fromAge < s.launch) continue;
        const from = undyneSpearPose(a, s, fromAge),
          to = undyneSpearPose(a, s, fromAge + 0.018);
        ctx.globalAlpha = (1 - sample / 10) * 0.42;
        ctx.lineWidth = 2 + (1 - sample / 10) * 5;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    const { distance, angle } = undyneSpearPose(a, s);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    if (a.age < s.launch) {
      ctx.fillStyle = s.yellow ? '#ffe34d' : '#7debf2';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(s.yellow ? '↶' : '!', -6, -undyneSpawnDistance(s.side) + 22);
    } else {
      ctx.translate(0, -distance);
      ctx.shadowColor = s.yellow ? '#ffd42e' : '#54f3f9';
      ctx.shadowBlur = 5;
      ctx.fillStyle = s.yellow ? '#ffe045' : '#2ad4de';
      ctx.fillRect(-3, -20, 6, 25);
      ctx.beginPath();
      ctx.moveTo(-10, 1);
      ctx.lineTo(0, 17);
      ctx.lineTo(10, 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = s.yellow ? '#fff9ca' : '#e5ffff';
      ctx.fillRect(-1, -17, 2, 24);
    }
    ctx.restore();
  }
  ctx.translate(cx, cy);
  ctx.rotate((spearSides.indexOf(a.shield as (typeof spearSides)[number]) * Math.PI) / 2);
  ctx.strokeStyle = a.flash > 0 ? '#fff4b6' : '#55a8ff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-23, -34);
  ctx.lineTo(23, -34);
  ctx.stroke();
  ctx.restore();
}

export function undyneDropOffset(age: number) {
  if (age < 0.7) return 460 * (1 - (Math.max(0, age) / 0.7) ** 2);
  if (age < 1) return -Math.sin(((age - 0.7) / 0.3) * Math.PI) * 11;
  return 0;
}
