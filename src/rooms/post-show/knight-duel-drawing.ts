import { drawKnightSprite } from './knight-sprites.ts';
import { knightDuelPose } from './knight-path.ts';

export function drawRoaringStatue(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.8, 0.8);
  ctx.filter = 'grayscale(1) brightness(0.65)';
  const ready = drawKnightSprite(ctx, 0, 0, 1, false);
  ctx.restore();
  return ready;
}
export function drawKnightDuel(ctx: CanvasRenderingContext2D, age: number, reducedMotion: boolean) {
  const pose = knightDuelPose(age),
    t = reducedMotion ? 0 : age;
  ctx.save();
  ctx.fillStyle = '#292731';
  ctx.beginPath();
  ctx.ellipse(3600, 375, 240, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dark fissures radiate from the repeated sword impacts.
  ctx.strokeStyle = '#0c0b13';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = i * 0.79;
    ctx.beginPath();
    ctx.moveTo(3600, 370);
    ctx.lineTo(3600 + Math.cos(a) * 50, 370 + Math.sin(a) * 10);
    ctx.lineTo(3600 + Math.cos(a + 0.1) * 150, 370 + Math.sin(a) * 28);
    ctx.stroke();
  }
  if (!reducedMotion) {
    for (let i = 3; i >= 1; i--) {
      const previous = knightDuelPose(Math.max(0, age - i * 0.045));
      ctx.globalAlpha = 0.08 * (4 - i);
      drawKnightSprite(ctx, previous.roaringX, 350, 1, false);
      drawKnightSprite(ctx, previous.kaizoX, 350 - previous.kaizoJump, -1, true);
    }
  }
  ctx.globalAlpha = 1;
  drawKnightSprite(ctx, pose.roaringX, 350, 1, false);
  drawKnightSprite(ctx, pose.kaizoX, 350 - pose.kaizoJump, -1, true);
  if (pose.slash) {
    for (const [x, color, facing] of [
      [pose.roaringX + 40, '#d6dcff', 1],
      [pose.kaizoX - 40, '#e7eaa6', -1],
    ] as const) {
      ctx.save();
      ctx.translate(x, 270);
      ctx.scale(facing, 1);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.globalAlpha = reducedMotion ? 0.35 : 0.65;
      ctx.beginPath();
      ctx.ellipse(0, 0, 75, 100, -0.6, -1.5, 1.2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(8, 0, 88, 111, -0.6, -1.5, 1.2);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (pose.clash > 0.05) {
    const force = pose.clash;
    ctx.globalAlpha = force * (reducedMotion ? 0.25 : 0.8);
    ctx.strokeStyle = '#a298c4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(3600, 360, 40 + (1 - force) * 150, 9 + (1 - force) * 30, 0, 0, Math.PI * 2);
    ctx.stroke();
    const sparks = reducedMotion ? 5 : 22;
    for (let i = 0; i < sparks; i++) {
      const a = i * 2.4 + t * 0.3,
        radius = 15 + (1 - force) * (35 + i * 3);
      ctx.strokeStyle = i % 2 ? '#dce8ff' : '#e4d78b';
      ctx.lineWidth = i % 3 ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(3600 + Math.cos(a) * radius, 270 + Math.sin(a) * radius);
      ctx.lineTo(3600 + Math.cos(a) * (radius + 13), 270 + Math.sin(a) * (radius + 13));
      ctx.stroke();
    }
    ctx.globalAlpha = force * 0.85;
    ctx.fillStyle = '#f0e5ff';
    ctx.fillRect(3597, 244, 6, 54);
    ctx.fillRect(3575, 268, 50, 4);
  }
  ctx.restore();
}
