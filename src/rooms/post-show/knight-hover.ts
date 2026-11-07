import type { KnightActorPose } from './knight-choreography.ts';

export function floatingKnight(
  actor: KnightActorPose,
  time: number,
  kaizo: boolean,
  reduced = false,
): KnightActorPose {
  const lift = 6 + (reduced ? 0 : Math.sin(time * 2.1 + (kaizo ? 1.7 : 0)) * 2.3);
  return { ...actor, jump: actor.jump + lift };
}

export function drawKnightHover(
  ctx: CanvasRenderingContext2D,
  actor: KnightActorPose,
  time: number,
  kaizo: boolean,
  reduced = false,
  charging = false,
) {
  const t = reduced ? 0 : time;
  const feet = 350 - actor.jump + (kaizo ? -26 : charging ? 0 : 24);
  ctx.save();
  ctx.strokeStyle = kaizo ? '#b9f1e4' : '#b9bfd7';
  ctx.lineWidth = 1;
  // Thin rising wisps leave a visible gap below the feet, keeping the legs readable.
  ctx.globalAlpha = 0.25;
  for (const side of [-1, 1]) {
    const x = actor.x + side * 10,
      sway = Math.sin(t * 1.6 + side) * 3;
    ctx.beginPath();
    ctx.moveTo(x + side * 3, feet + 33);
    ctx.bezierCurveTo(x - side * 7 + sway, feet + 25, x + side * 7 + sway, feet + 17, x, feet + 7);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const progress = (((t * 0.65 + i / 6) % 1) + 1) % 1;
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.4;
    ctx.fillStyle = kaizo && i % 3 === 0 ? '#d7d494' : kaizo ? '#caf2eb' : '#c7cce0';
    ctx.fillRect(
      Math.round(actor.x + Math.sin(i * 2.4 + t * 0.6) * 18),
      Math.round(feet + 39 - progress * 29),
      i % 2 ? 1 : 2,
      2,
    );
  }
  ctx.restore();
}
