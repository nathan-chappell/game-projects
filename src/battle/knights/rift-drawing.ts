import poseURL from '../../../assets/knight-raised-blade-reference.png?inline';
import { drawKnightBattlefield } from '../../rooms/post-show/knight-duel-drawing.ts';
import { drawKnightActor } from '../../rooms/post-show/knight-sprites.ts';
import { drawKnightHover } from '../../rooms/post-show/knight-hover.ts';
import { knightRiftFrame } from './rift.ts';

let raised: HTMLImageElement | undefined;
export function drawKnightRift(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const f = knightRiftFrame(age);
  drawKnightBattlefield(ctx, reduced ? 0 : age);
  ctx.save();
  if (!reduced && f.clash) ctx.translate(Math.sin(age * 70) * 2, Math.cos(age * 53) * 2);
  const lunge = f.raised ? 0 : Math.sin((Math.min(1, f.beat / 0.4) * Math.PI) / 2) * 65;
  for (const kaizo of [false, true]) {
    const side = kaizo ? -1 : 1;
    const x = (kaizo ? 445 : 195) + side * lunge;
    const hover = reduced ? 0 : Math.sin(age * 2.5 + Number(kaizo)) * 5;
    const actor = {
      x,
      jump: 95 + hover,
      facing: side,
      swordAngle: f.raised ? -0.9 : -1.2 + Math.min(1, f.beat / 0.4) * 2.7,
      lean: f.raised ? 0 : side * 0.08,
    };
    drawKnightHover(ctx, actor, age, kaizo, reduced);
    if (f.raised && !kaizo) {
      raised ??= new Image();
      if (!raised.src) raised.src = poseURL;
      if (raised.complete && raised.naturalWidth) {
        ctx.save();
        ctx.translate(x, 220 + hover);
        ctx.scale(side, 1);
        // Screen composition preserves the supplied pixel pose while its black backing blends into the scene.
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = '#9080c5';
        ctx.shadowBlur = reduced ? 0 : 3;
        ctx.drawImage(raised, -76, -165, 153, 190);
        ctx.restore();
      } else drawKnightActor(ctx, actor, kaizo);
    } else {
      if (!reduced && age < 5.6) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        drawKnightActor(ctx, { ...actor, x: x - side * 18 }, kaizo);
        ctx.restore();
      }
      drawKnightActor(ctx, actor, kaizo);
    }
  }
  if (age >= 1.4 && age < 5.6) {
    ctx.save();
    const strength = f.clash ? 1 : 0.18;
    ctx.globalAlpha = strength;
    for (let i = 0; i < (reduced ? 4 : 20); i++) {
      const a = i * 2.4,
        distance = (f.beat - 0.38) * 140;
      if (distance < 0) continue;
      ctx.strokeStyle = i % 2 ? '#fff9c5' : '#b6a7f5';
      ctx.lineWidth = i % 3 ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(320 + Math.cos(a) * distance, 155 + Math.sin(a) * distance);
      ctx.lineTo(320 + Math.cos(a) * (distance + 13), 155 + Math.sin(a) * (distance + 13));
      ctx.stroke();
    }
    ctx.strokeStyle = '#f7f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(320, 155, 12 + f.beat * 38, 30 + f.beat * 60, 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  if (f.fountain > 0) {
    ctx.save();
    const p = f.fountain;
    const glow = ctx.createRadialGradient(320, 175, 5, 320, 175, 30 + p * 350);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.22, '#e3d7ffbb');
    glow.addColorStop(1, '#6b3dbe00');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 640, 480);
    for (let i = 0; i < 12; i++) {
      const wave = Math.sin(age * (reduced ? 0.4 : 1.6) + i) * (8 + 40 * p);
      ctx.strokeStyle = i % 2 ? '#fcf9ff' : '#0a001b';
      ctx.lineWidth = 4 + p * 10;
      ctx.beginPath();
      ctx.moveTo(320 + wave - (i - 6) * p * 12, 0);
      ctx.bezierCurveTo(260 + wave, 125, 390 - wave, 245, 320 - wave + (i - 6) * p * 20, 480);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f8efff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(320, 175, 15 + p * (75 + i * 80), 25 + p * (90 + i * 90), -0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (f.whiteout > 0) {
    ctx.fillStyle = `rgba(255,255,255,${f.whiteout})`;
    ctx.fillRect(0, 0, 640, 480);
  }
  if (f.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${f.fade})`;
    ctx.fillRect(0, 0, 640, 480);
  }
}
