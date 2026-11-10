import { aimedWarningAngle, type AimedSwords } from './aimed-swords.ts';
import { drawKnightSword } from './sword-drawing.ts';

export function drawAimedSwords(ctx: CanvasRenderingContext2D, attack: AimedSwords, reduced: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 640, 295);
  ctx.clip();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = '#dbaa6977';
  ctx.lineWidth = 1;
  for (const sword of attack.warnings) {
    ctx.beginPath();
    ctx.moveTo(sword.x, sword.y);
    ctx.lineTo(sword.x + Math.cos(sword.angle) * 200, sword.y + Math.sin(sword.angle) * 200);
    ctx.stroke();
    drawKnightSword(ctx, { ...sword, angle: aimedWarningAngle(sword, attack.arena) }, true);
  }
  ctx.globalAlpha = 1;
  for (const sword of attack.swords) if (!sword.hitOpponent) drawKnightSword(ctx, sword, reduced);
  ctx.restore();
}
