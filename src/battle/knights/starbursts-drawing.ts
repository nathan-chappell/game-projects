import { starBurstTime, starFragmentAngle, starburstSettings, type Starbursts } from './starbursts.ts';
import type { KnightOwner } from './projectiles.ts';

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  owner: KnightOwner,
  angle = 0,
) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.fillStyle = owner === 'roaring' ? '#100916' : '#eae5ff';
  ctx.strokeStyle = owner === 'roaring' ? '#d3c7e6' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const r = i % 2 ? radius * 0.46 : radius,
      a = (i * Math.PI) / 6;
    if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = owner === 'roaring' ? '#ffffff' : '#332544';
  ctx.fillRect(-1.5, -1.5, 3, 3);
  ctx.restore();
}
export function drawStarbursts(ctx: CanvasRenderingContext2D, attack: Starbursts, reduced: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 640, 295);
  ctx.clip();
  const sinceCast =
    attack.age - (starburstSettings.warmup + Math.max(0, attack.waves - 1) * starburstSettings.interval);
  if (attack.waves > 0 && sinceCast < 0.65) {
    ctx.fillStyle = '#751ba5';
    ctx.globalAlpha = reduced ? 0.08 : 0.15 * (1 - Math.max(0, sinceCast) / 0.65);
    for (const side of [0, 1]) {
      const x = side ? 510 : 130,
        end = side ? attack.arena.x : attack.arena.x + attack.arena.size;
      ctx.beginPath();
      ctx.moveTo(x, 190);
      ctx.lineTo(end, attack.arena.y - 30);
      ctx.lineTo(end, attack.arena.y + attack.arena.size + 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  for (const star of attack.stars) {
    if (star.hitOpponent) continue;
    const until = starBurstTime(star) - attack.age;
    if (star.exploded) {
      if (until < -0.3) continue;
      ctx.globalAlpha = Math.max(0, 1 + until / 0.3) * 0.6;
      ctx.strokeStyle = star.owner === 'roaring' ? '#bda6e8' : '#fff0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(star.x, star.y, reduced ? 23 : 16 - until * 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    if (!reduced) {
      for (let i = 2; i >= 1; i--) {
        ctx.globalAlpha = 0.15 / i;
        drawStar(ctx, star.x + (star.owner === 'roaring' ? -i * 7 : i * 7), star.y, star.radius, star.owner);
      }
      ctx.globalAlpha = 1;
    }
    const charging = until < starburstSettings.fuse;
    drawStar(
      ctx,
      star.x,
      star.y,
      star.radius + (!reduced && charging ? Math.sin(attack.age * 16) * 1.5 : 0),
      star.owner,
      reduced ? 0 : attack.age * 0.4,
    );
    if (charging) {
      for (let i = 0; i < 6; i++) {
        const angle = starFragmentAngle(star, i);
        ctx.fillStyle = '#d3b2ef';
        ctx.fillRect(star.x + Math.cos(angle) * 25 - 1, star.y + Math.sin(angle) * 25 - 1, 2, 2);
      }
    }
  }
  for (const shot of attack.fragments)
    if (shot.active && !shot.hitOpponent) drawStar(ctx, shot.x, shot.y, shot.radius, shot.owner);
  ctx.restore();
}
