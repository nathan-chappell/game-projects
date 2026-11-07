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
  for (const sword of attack.swords) if (!sword.hitOpponent) drawKnightSword(ctx, sword, reduced);
  ctx.restore();
}
