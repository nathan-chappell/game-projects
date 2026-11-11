import poseURL from '../../../assets/knight-raised-blade-reference.png?inline';
import { drawKnightBattlefield } from '../../rooms/post-show/knight-duel-drawing.ts';
import { drawKnightActor } from '../../rooms/post-show/knight-sprites.ts';
import { drawKnightHover } from '../../rooms/post-show/knight-hover.ts';
import { knightRiftDuel } from './rift-choreography.ts';
import { drawRiftSwordTrails, drawRiftClash, drawFountainRift } from './rift-effects.ts';
import { knightRiftFrame } from './rift.ts';

let raised: HTMLImageElement | undefined;
export function drawKnightRift(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const f = knightRiftFrame(age);
  drawKnightBattlefield(ctx, reduced ? 0 : age);
  const duel = knightRiftDuel(age, reduced);
  ctx.save();
  ctx.translate(320, 240);
  ctx.scale(duel.zoom, duel.zoom);
  ctx.translate(-duel.cameraX, -duel.cameraY);
  if (!reduced && duel.strength > 0)
    ctx.translate(Math.sin(age * 70) * duel.strength * 3, Math.cos(age * 53) * duel.strength * 2);
  if (!reduced) drawRiftSwordTrails(ctx, age);
  for (const kaizo of [false, true]) {
    const side = kaizo ? -1 : 1;
    const actor = kaizo ? duel.kaizo : duel.roaring;
    const { x } = actor;
    const hover = reduced ? 0 : Math.sin(age * 2.5 + Number(kaizo)) * 3;
    drawKnightHover(ctx, actor, age, kaizo, reduced);
    if (f.raised && !kaizo) {
      raised ??= new Image();
      if (!raised.src) raised.src = poseURL;
      if (raised.complete && raised.naturalWidth) {
        ctx.save();
        ctx.translate(x, 220 + hover);
        ctx.scale(side, 1);
        // Remove the near-black backing during drawing so the reference cannot tint a rectangle.
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = 'contrast(4)';
        ctx.drawImage(raised, -76, -165, 153, 190);
        ctx.restore();
      } else drawKnightActor(ctx, actor, kaizo);
    } else {
      if (!reduced && age < 5.6) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        drawKnightActor(
          ctx,
          knightRiftDuel(Math.max(0, age - 0.04), reduced)[kaizo ? 'kaizo' : 'roaring'],
          kaizo,
        );
        ctx.restore();
      }
      drawKnightActor(ctx, actor, kaizo);
    }
  }
  drawRiftClash(ctx, age, reduced);
  ctx.restore();
  drawFountainRift(ctx, age, f.fountain, reduced);
  // Letterboxing frames the combat; it yields as the rift fills the screen.
  const bars = 20 * (1 - f.whiteout);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 640, bars);
  ctx.fillRect(0, 480 - bars, 640, bars);
  if (f.whiteout > 0) {
    ctx.fillStyle = `rgba(255,255,255,${f.whiteout})`;
    ctx.fillRect(0, 0, 640, 480);
  }
  if (f.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${f.fade})`;
    ctx.fillRect(0, 0, 640, 480);
  }
}
