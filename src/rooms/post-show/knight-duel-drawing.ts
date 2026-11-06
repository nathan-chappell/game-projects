import { drawKnightActor, drawKnightWeapon } from './knight-sprites.ts';
import { knightDuelPose, knightSword, type KnightActorPose } from './knight-choreography.ts';

function swordTrail(ctx: CanvasRenderingContext2D, age: number, kaizo: boolean) {
  const points = Array.from({ length: 9 }, (_, i) => {
    const pose = knightDuelPose(age - i * 0.022);
    return knightSword(kaizo ? pose.kaizo : pose.roaring);
  });
  const latest = points[0];
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = kaizo ? '#d3e998' : '#adbfff';
  ctx.beginPath();
  ctx.moveTo(latest.grip.x, latest.grip.y);
  points.forEach((p) => ctx.lineTo(p.tip.x, p.tip.y));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = kaizo ? '#edf9c1' : '#e5ecff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.tip.x, p.tip.y) : ctx.moveTo(p.tip.x, p.tip.y)));
  ctx.stroke();
  ctx.restore();
}
function impact(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const pose = knightDuelPose(age);
  if (pose.impactAge < 0) return;
  const atImpact = knightDuelPose(age - pose.impactAge);
  const hit = atImpact.contact ?? { x: 3602, y: 280 };
  const strength = pose.clash,
    elapsed = pose.impactAge;
  ctx.save();
  const light = ctx.createRadialGradient(hit.x, hit.y, 0, hit.x, hit.y, 110);
  light.addColorStop(0, `rgba(208,220,255,${strength * (reduced ? 0.08 : 0.23)})`);
  light.addColorStop(1, 'rgba(208,220,255,0)');
  ctx.fillStyle = light;
  ctx.fillRect(hit.x - 110, hit.y - 110, 220, 220);
  ctx.globalAlpha = strength * (reduced ? 0.25 : 0.8);
  ctx.strokeStyle = '#aaa4c5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(hit.x, 370, 30 + elapsed * 330, 5 + elapsed * 70, 0, 0, Math.PI * 2);
  ctx.stroke();
  const count = reduced ? 5 : 30;
  for (let i = 0; i < count; i++) {
    const a = i * 2.399,
      radius = 7 + elapsed * (90 + (i % 7) * 29);
    const x = hit.x + Math.cos(a) * radius,
      y = hit.y + Math.sin(a) * radius + elapsed * elapsed * 90;
    ctx.strokeStyle = i % 3 ? '#dce8ff' : '#e7d48e';
    ctx.lineWidth = i % 4 ? 1.5 : 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (7 + strength * 13), y + Math.sin(a) * (7 + strength * 13));
    ctx.stroke();
  }
  ctx.globalAlpha = strength * (reduced ? 0.4 : 1);
  ctx.fillStyle = '#fff9de';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      r = i % 2 ? 4 : 12 + strength * 19;
    const x = hit.x + Math.cos(a) * r,
      y = hit.y + Math.sin(a) * r;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  // A short broken lightning fork makes the hardest final parry read clearly.
  if (!reduced && pose.beat >= 9.6 && pose.beat < 9.95) {
    ctx.strokeStyle = '#ece9ff';
    ctx.lineWidth = 2;
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hit.x, hit.y);
      for (let i = 1; i < 6; i++) ctx.lineTo(hit.x + direction * i * 20, hit.y - i * 18 + (i % 2 ? 9 : -8));
      ctx.stroke();
    }
  }
  ctx.restore();
}
function dust(ctx: CanvasRenderingContext2D, actor: KnightActorPose, time: number) {
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = '#b7acbd';
  for (let i = 0; i < 9; i++) {
    const phase = (time * 3 + i * 0.17) % 1;
    const x = actor.x - actor.facing * (20 + phase * 100),
      y = 365 - phase * (10 + (i % 3) * 5);
    ctx.fillRect(x, y, 3 + (1 - phase) * 12, 2);
  }
  ctx.restore();
}
export function drawKnightDuel(ctx: CanvasRenderingContext2D, age: number, reducedMotion: boolean) {
  const pose = knightDuelPose(age);
  ctx.save();
  ctx.fillStyle = '#292731';
  ctx.beginPath();
  ctx.ellipse(3600, 375, 240, 38, 0, 0, Math.PI * 2);
  ctx.fill();
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
    if (pose.dashing) {
      dust(ctx, pose.roaring, age);
      dust(ctx, pose.kaizo, age);
    }
    for (let i = 4; i >= 1; i--) {
      const previous = knightDuelPose(age - i * 0.035);
      ctx.globalAlpha = (pose.dashing ? 0.055 : 0.02) * (5 - i);
      drawKnightActor(ctx, previous.roaring, false);
      drawKnightActor(ctx, previous.kaizo, true);
    }
    if (pose.slash) {
      swordTrail(ctx, age, false);
      swordTrail(ctx, age, true);
    }
  }
  ctx.globalAlpha = 1;
  drawKnightActor(ctx, pose.roaring, false);
  drawKnightActor(ctx, pose.kaizo, true);
  // Repaint blades last so neither body hides an opponent's actual swinging sword.
  drawKnightWeapon(ctx, pose.roaring, false);
  drawKnightWeapon(ctx, pose.kaizo, true);
  impact(ctx, age, reducedMotion);
  ctx.restore();
}
