import type { CrossingSword } from './crossing-swords.ts';
import { crossingWarnings, crossingSwordSettings, type CrossingSwords } from './crossing-swords.ts';
import { drawKnightSword } from './sword-drawing.ts';

export function drawCrossingSwords(ctx: CanvasRenderingContext2D, attack: CrossingSwords, reduced: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 640, 295);
  ctx.clip();
  ctx.strokeStyle = reduced ? '#9f1d25aa' : '#c31b2780';
  ctx.lineWidth = 2;
  for (const line of crossingWarnings(attack)) {
    ctx.beginPath();
    ctx.moveTo(line.origin.x, line.origin.y);
    ctx.lineTo(
      line.origin.x + Math.cos(line.angle) * crossingSwordSettings.distance,
      line.origin.y + Math.sin(line.angle) * crossingSwordSettings.distance,
    );
    ctx.stroke();
  }
  drawEdgeMiniWarnings(ctx, attack.miniWarnings);
  for (const sword of attack.swords) if (!sword.hitOpponent) drawKnightSword(ctx, sword, reduced);
  ctx.restore();
}

export function drawEdgeMiniWarnings(ctx: CanvasRenderingContext2D, warnings: CrossingSword[]) {
  ctx.save();
  for (const sword of warnings) {
    ctx.fillStyle = '#ffc77b';
    ctx.beginPath();
    ctx.arc(sword.origin.x, sword.origin.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#eaa95c99';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sword.origin.x, sword.origin.y);
    ctx.lineTo(sword.origin.x + Math.cos(sword.angle) * 46, sword.origin.y + Math.sin(sword.angle) * 46);
    ctx.stroke();
    drawKnightSword(ctx, sword, true);
  }
  ctx.restore();
}
