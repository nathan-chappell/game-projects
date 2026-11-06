import fieldURL from '../../../assets/knight-battlefield-reference.png?inline';
import swoonURL from '../../../assets/red-sweep.png?inline';
import { drawKnightActor, drawKnightCharge, drawKnightWeapon } from './knight-sprites.ts';
import { knightDuelPose, knightSword } from './knight-choreography.ts';
let field: HTMLImageElement | undefined, swoon: HTMLImageElement | undefined;
export function drawKnightBattlefield(ctx: CanvasRenderingContext2D) {
  field ??= new Image();
  if (!field.src) field.src = fieldURL;
  ctx.fillStyle = '#0b030b';
  ctx.fillRect(0, 0, 640, 480);
  ctx.imageSmoothingEnabled = false;
  if (field.complete && field.naturalWidth) {
    // Only the empty center and overhead scenery are sampled; the reference's fighters are excluded.
    ctx.drawImage(field, 174, 40, 330, 183, 0, 44, 640, 436);
    ctx.drawImage(field, 140, 0, 360, 38, 125, 0, 390, 44);
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 125, 44);
  ctx.fillRect(515, 0, 125, 44);
}
function swoonAttack(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const pose = knightDuelPose(age);
  const outgoing = pose.phase === 'roaringSwoon' || pose.phase === 'kaizoBlocksSwoon';
  const returning = pose.phase === 'kaizoSwoon' || pose.phase === 'roaringBlocksSwoon';
  if (!outgoing && !returning) return;
  swoon ??= new Image();
  if (!swoon.src) swoon.src = swoonURL;
  if (!swoon.complete || !swoon.naturalWidth) return;
  const start = outgoing ? 5.3 : 7.8,
    block = outgoing ? 6.15 : 8.55;
  const progress = Math.max(0, Math.min(1, (age - start) / (block - start)));
  const origin = outgoing ? knightSword(pose.roaring).grip.x : knightSword(pose.kaizo).grip.x;
  const destination = outgoing ? knightSword(pose.kaizo).grip.x : knightSword(pose.roaring).grip.x;
  const width = Math.abs(destination - origin) * progress;
  const fade = age > block ? Math.max(0, 1 - (age - block) / 0.35) : 1;
  ctx.save();
  ctx.translate(origin, 235);
  ctx.scale(outgoing ? 1 : -1, 1);
  ctx.filter = 'brightness(0) invert(1)';
  ctx.globalAlpha = fade;
  ctx.shadowColor = returning ? '#dcefa6' : '#dce6ff';
  ctx.shadowBlur = reduced ? 0 : 9;
  ctx.drawImage(swoon, 105, 338, 1816, 137, 0, -15, width, 30);
  ctx.restore();
}
function blockBurst(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const pose = knightDuelPose(age);
  if (pose.impactAge < 0) return;
  const event = knightDuelPose(age - pose.impactAge);
  const hit =
    event.phase === 'chargeBlocked'
      ? (event.contact ?? { x: 517, y: 210 })
      : { x: event.phase === 'kaizoBlocksSwoon' ? 517 : 168, y: 235 };
  const strength = pose.clash;
  ctx.save();
  ctx.globalAlpha = strength * (reduced ? 0.4 : 0.9);
  ctx.strokeStyle = '#e5f2ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(
    hit.x,
    hit.y,
    14 + pose.impactAge * 100,
    35 + pose.impactAge * 100,
    0,
    -Math.PI / 2,
    Math.PI / 2,
  );
  ctx.stroke();
  ctx.strokeStyle = '#d9cd85';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(hit.x, hit.y, 21 + pose.impactAge * 130, 43 + pose.impactAge * 100, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < (reduced ? 5 : 26); i++) {
    const angle = i * 2.399,
      radius = 6 + pose.impactAge * (80 + (i % 7) * 30);
    const x = hit.x + Math.cos(angle) * radius,
      y = hit.y + Math.sin(angle) * radius;
    ctx.strokeStyle = i % 2 ? '#eef5ff' : '#ebdca3';
    ctx.lineWidth = i % 3 ? 2 : 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12);
    ctx.stroke();
  }
  ctx.fillStyle = '#fffbe2';
  ctx.fillRect(hit.x - 2, hit.y - 21, 4, 42);
  ctx.fillRect(hit.x - 20, hit.y - 2, 40, 4);
  ctx.restore();
}
export function drawKnightDuel(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const pose = knightDuelPose(age);
  drawKnightBattlefield(ctx);
  ctx.save();
  if (!reduced && pose.clash > 0)
    ctx.translate(
      Math.round(Math.sin(age * 90) * pose.clash * 2),
      Math.round(Math.cos(age * 76) * pose.clash),
    );
  if (!reduced && pose.dashing) {
    for (let i = 5; i >= 1; i--) {
      const previous = knightDuelPose(Math.max(0, age - i * 0.032));
      ctx.globalAlpha = (6 - i) * 0.055;
      drawKnightCharge(ctx, previous.roaring);
    }
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#a6a9c1';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = 150 + i * 18;
      ctx.beginPath();
      ctx.moveTo(pose.roaring.x - 140 - (i % 3) * 20, y);
      ctx.lineTo(pose.roaring.x - 60, y);
      ctx.stroke();
    }
  }
  for (const [offset, filter] of [
    [22, 'sepia(1) saturate(5) hue-rotate(5deg)'],
    [11, 'sepia(1) saturate(5) hue-rotate(65deg)'],
  ] as const) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.filter = filter;
    drawKnightActor(ctx, { ...pose.kaizo, x: pose.kaizo.x + offset }, true);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (pose.chargePose) drawKnightCharge(ctx, pose.roaring);
  else drawKnightActor(ctx, pose.roaring, false);
  drawKnightActor(ctx, pose.kaizo, true);
  if (!pose.chargePose) drawKnightWeapon(ctx, pose.roaring, false);
  drawKnightWeapon(ctx, pose.kaizo, true);
  swoonAttack(ctx, age, reduced);
  blockBurst(ctx, age, reduced);
  ctx.restore();
  if (pose.phase === 'transition') {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, age - 10)})`;
    ctx.fillRect(0, 0, 640, 480);
  }
}
