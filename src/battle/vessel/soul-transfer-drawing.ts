import { drawPixelSoul } from '../shared/soul-drawing.ts';
import { vesselEntryLines, vesselTransferFrame } from './soul-transfer.ts';

export function drawVesselTransfer(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const frame = vesselTransferFrame(age, reduced);
  ctx.save();
  if (frame.scale > 0) {
    ctx.translate(frame.soul.x, frame.soul.y);
    ctx.scale(frame.scale, frame.scale);
    if (!reduced) {
      ctx.fillStyle = '#ff163222';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    drawPixelSoul(ctx, { x: 0, y: 0 });
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = frame.blackout;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 640, 480);
  ctx.restore();
}

export function drawVesselEntryText(ctx: CanvasRenderingContext2D, age: number) {
  const frame = vesselTransferFrame(age);
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let remaining = frame.text.length;
  const lineHeight = 30,
    startY = 240 - ((vesselEntryLines.length - 1) * lineHeight) / 2;
  for (const [index, line] of vesselEntryLines.entries()) {
    ctx.fillText(line.slice(0, Math.max(0, remaining)), 320, startY + index * lineHeight);
    remaining -= line.length + 1;
  }
  ctx.restore();
}
