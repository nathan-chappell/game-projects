import { knightSword } from '../../rooms/post-show/knight-choreography.ts';
import { knightRiftDuel } from './rift-choreography.ts';
import { drawMysteriousVoid } from '../../rooms/mysterious-void/drawing.ts';

export function drawRiftSwordTrails(ctx: CanvasRenderingContext2D, age: number) {
  if (age < 1.4 || age > 5.3) return;
  for (const name of ['roaring', 'kaizo'] as const) {
    const blades = Array.from({ length: 7 }, (_, i) =>
      knightSword(knightRiftDuel(Math.max(0, age - i * 0.02))[name]),
    );
    ctx.save();
    ctx.fillStyle = name === 'roaring' ? '#9988cc3d' : '#eaf9ff52';
    ctx.beginPath();
    ctx.moveTo(blades[0].grip.x, blades[0].grip.y);
    for (const b of blades) ctx.lineTo(b.tip.x, b.tip.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = name === 'roaring' ? '#b9a6e8' : '#f9fbff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    blades.forEach((b, i) => (i ? ctx.lineTo(b.tip.x, b.tip.y) : ctx.moveTo(b.tip.x, b.tip.y)));
    ctx.stroke();
    ctx.restore();
  }
}
export function drawRiftClash(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const f = knightRiftDuel(age, reduced);
  if (!f.contact || f.strength <= 0) return;
  const { x, y } = f.contact;
  ctx.save();
  ctx.globalAlpha = f.strength;
  for (let i = 0; i < (reduced ? 6 : 30); i++) {
    const a = i * 2.399,
      d = f.impactAge * (90 + (i % 7) * 32);
    ctx.strokeStyle = i % 3 ? '#fff5c2' : '#bda5ff';
    ctx.lineWidth = i % 4 ? 1 : 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    ctx.lineTo(x + Math.cos(a) * (d + 8), y + Math.sin(a) * (d + 8));
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 6 + f.impactAge * 100, 15 + f.impactAge * 150, -0.5, 0, Math.PI * 2);
  ctx.stroke();
  if (!reduced && f.impactAge < 0.1) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x + 6, y - 4);
    ctx.lineTo(x + 25, y);
    ctx.lineTo(x + 5, y + 4);
    ctx.lineTo(x, y + 24);
    ctx.lineTo(x - 5, y + 4);
    ctx.lineTo(x - 25, y);
    ctx.lineTo(x - 5, y - 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
export function drawFountainRift(ctx: CanvasRenderingContext2D, age: number, p: number, reduced: boolean) {
  if (p <= 0) return;
  ctx.save();
  const radius = 18 + p * 200;
  const glow = ctx.createRadialGradient(320, 210, 8, 320, 210, radius * 1.8);
  glow.addColorStop(0, '#f6ecffaa');
  glow.addColorStop(0.4, '#9371d077');
  glow.addColorStop(1, '#17022d00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 640, 480);
  // A split dark/light aperture opens inside the Fountain, revealing the destination.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(320, 210, radius * 0.62, radius, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#090015';
  ctx.fillRect(0, 0, 640, 480);
  if (p > 0.35) {
    ctx.globalAlpha = Math.min(0.85, (p - 0.35) * 1.5);
    ctx.translate(320 - radius * 0.62, 210 - radius);
    ctx.scale((radius * 1.24) / 640, (radius * 2) / 480);
    drawMysteriousVoid(ctx, 0, true);
  }
  ctx.restore();
  for (let i = 0; i < 8; i++) {
    const offset = (i - 3.5) * (2 + p * 3);
    const twist = Math.sin((reduced ? 0 : age * 0.8) + i * 0.28) * (5 + p * 14);
    ctx.strokeStyle = i % 2 ? '#fbf7ff' : '#170526';
    ctx.lineWidth = 2 + p * 4;
    ctx.beginPath();
    ctx.moveTo(320 + offset, 0);
    ctx.bezierCurveTo(320 + offset + twist, 100, 320 + offset - twist, 300, 320 + offset, 480);
    ctx.stroke();
  }
  for (let side = 0; side < 2; side++) {
    ctx.strokeStyle = side ? '#ffffff' : '#8059b7';
    ctx.lineWidth = 2 + p * 3;
    ctx.beginPath();
    ctx.ellipse(
      320,
      210,
      radius * 0.62,
      radius,
      0,
      side * Math.PI - Math.PI / 2,
      side * Math.PI + Math.PI / 2,
    );
    ctx.stroke();
  }
  if (!reduced) {
    for (let i = 0; i < 36; i++) {
      const phase = (age * 0.35 + i / 36) % 1,
        a = i * 2.399;
      const distance = radius + 100 * (1 - phase);
      const x = 320 + Math.cos(a) * distance,
        y = 210 + Math.sin(a) * distance;
      ctx.globalAlpha = Math.sin(phase * Math.PI) * p;
      ctx.fillStyle = i % 2 ? '#e7d8ff' : '#2a1241';
      ctx.fillRect(x, y, i % 3 ? 2 : 4, i % 3 ? 2 : 4);
    }
  }
  ctx.restore();
}
