import type { KnightOwner } from './projectiles.ts';

export function drawKnightSword(
  ctx: CanvasRenderingContext2D,
  sword: { x: number; y: number; angle: number; owner: KnightOwner; scale?: number; red?: boolean },
  reduced: boolean,
) {
  const black = sword.owner === 'roaring';
  ctx.save();
  ctx.translate(Math.round(sword.x), Math.round(sword.y));
  ctx.rotate(sword.angle);
  const scale = sword.scale ?? 1;
  ctx.scale(scale, scale);
  if (!reduced) {
    ctx.strokeStyle = sword.red ? '#ff334c88' : black ? '#bcb4d44d' : '#ffffff66';
    ctx.lineWidth = 2;
    for (const y of [-5, 5]) {
      ctx.beginPath();
      ctx.moveTo(-42, y);
      ctx.lineTo(-70, y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = sword.red ? '#ff233f' : black ? '#08060b' : '#ffffff';
  ctx.strokeStyle = sword.red ? '#ffafbb' : black ? '#c2bad4' : '#272335';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(35, 0);
  ctx.lineTo(20, -5);
  ctx.lineTo(-14, -5);
  ctx.lineTo(-14, -16);
  ctx.lineTo(-21, -16);
  ctx.lineTo(-21, -3);
  ctx.lineTo(-39, -3);
  ctx.lineTo(-39, 3);
  ctx.lineTo(-21, 3);
  ctx.lineTo(-21, 16);
  ctx.lineTo(-14, 16);
  ctx.lineTo(-14, 5);
  ctx.lineTo(20, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
