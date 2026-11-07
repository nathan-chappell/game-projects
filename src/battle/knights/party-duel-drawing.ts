import { knightSword } from '../../rooms/post-show/knight-choreography.ts';
import { partyDuelFrame } from './party-duel.ts';

export function drawPartyDuelEffects(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const frame = partyDuelFrame(age, reduced);
  ctx.save();
  if (frame.swinging && !reduced) {
    const points = Array.from({ length: 6 }, (_, i) =>
      knightSword(partyDuelFrame(Math.max(0, age - i * 0.018))[frame.swinging!]),
    );
    ctx.fillStyle = frame.swinging === 'roaring' ? '#c4c9e52b' : '#fff8cc36';
    ctx.beginPath();
    ctx.moveTo(points[0].grip.x, points[0].grip.y);
    points.forEach((p) => ctx.lineTo(p.tip.x, p.tip.y));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = frame.swinging === 'roaring' ? '#c4c9e5aa' : '#fff8ccbb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.tip.x, p.tip.y) : ctx.moveTo(p.tip.x, p.tip.y)));
    ctx.stroke();
  }
  if (frame.contact) {
    const strength = 1 - frame.clashAge / 0.27;
    const { x, y } = frame.contact;
    ctx.globalAlpha = strength * (reduced ? 0.35 : 0.9);
    ctx.strokeStyle = '#fff3b6';
    ctx.lineWidth = 2;
    for (let i = 0; i < (reduced ? 4 : 10); i++) {
      const angle = i * 2.4,
        radius = 5 + frame.clashAge * 55;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      ctx.lineTo(x + Math.cos(angle) * (radius + 9), y + Math.sin(angle) * (radius + 9));
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 9, y);
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
  }
  ctx.restore();
}
