import type { Arena } from '../shared/types.ts';
export const undyneSettings = {
  damage: 30,
  interval: 0.32,
  warmup: 1.5,
  spears: 30,
  speed: 360,
  warning: 0.45,
};
export const spearSides = ['up', 'right', 'down', 'left'] as const;
export function createUndyneAttack(arena: Arena, random: () => number = Math.random) {
  let previous = -1;
  return {
    age: 0,
    arena: { ...arena },
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
        launch: undyneSettings.warmup + i * undyneSettings.interval,
        resolved: false,
      };
    }),
  };
}
export type UndyneAttack = ReturnType<typeof createUndyneAttack>;
export function spearDistance(a: UndyneAttack, launch: number) {
  return 260 - Math.max(0, a.age - launch) * undyneSettings.speed;
}
export function spearBlockSide(s: UndyneAttack['spears'][number]) {
  return spearSides[(spearSides.indexOf(s.side) + (s.yellow ? 2 : 0)) % 4];
}
export function undyneArenaBounds(a: UndyneAttack) {
  const progress = Math.min(1, a.age / 0.95),
    ease = 1 - (1 - progress) ** 3;
  const size = a.arena.size + (1400 - a.arena.size) * ease;
  return { x: a.arena.x + a.arena.size / 2 - size / 2, y: a.arena.y + a.arena.size / 2 - size / 2, size };
}
export function advanceUndyneAttack(a: UndyneAttack, dt: number) {
  a.age += dt;
  a.flash = Math.max(0, a.flash - dt);
  let hits = 0,
    blocked = 0;
  for (const s of a.spears) {
    if (s.resolved || a.age < s.launch) continue;
    const distance = spearDistance(a, s.launch);
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
export function drawUndyneAttack(ctx: CanvasRenderingContext2D, a: UndyneAttack) {
  const cx = a.arena.x + a.arena.size / 2,
    cy = a.arena.y + a.arena.size / 2;
  ctx.save();
  for (const s of a.spears) {
    if (s.resolved || a.age < s.launch - undyneSettings.warning) continue;
    const index = spearSides.indexOf(s.side),
      distance = spearDistance(a, s.launch),
      turn = s.yellow ? Math.max(0, Math.min(1, (135 - distance) / 65)) : 0,
      angle = (index * Math.PI) / 2 + Math.PI * turn;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    if (a.age < s.launch) {
      ctx.fillStyle = s.yellow ? '#ffe34d' : '#7debf2';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(s.yellow ? '↶' : '!', -6, -98);
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
