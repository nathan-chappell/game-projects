import statueURL from '../../../assets/roaring-knight-cutout.png?inline';
import chargeURL from '../../../assets/roaring-knight-charge.png?inline';
import roaringURL from '../../../assets/roaring-knight-rig.png?inline';
import kaizoURL from '../../../assets/kaizo-knight-rig.png?inline';
import { knightSword, type KnightActorPose } from './knight-choreography.ts';

type Bounds = { x: number; y: number; width: number; height: number };
interface Rig {
  image: HTMLImageElement;
  body: Bounds | null;
  weapon: Bounds | null;
}
let rigs: { roaring: Rig; kaizo: Rig } | undefined;
function load(url: string, atlas = true): Rig {
  const rig: Rig = { image: new Image(), body: null, weapon: null };
  rig.image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = rig.image.naturalWidth;
    canvas.height = rig.image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(rig.image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    // Both reference atlases leave a clear gutter at 60% between body and weapon.
    const split = Math.floor(canvas.width * 0.6);
    const bounds = (start: number, end: number): Bounds | null => {
      let left = end,
        top = canvas.height,
        right = -1,
        bottom = -1;
      for (let y = 0; y < canvas.height; y++)
        for (let x = start; x < end; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] < 12) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      return right >= left && bottom >= top
        ? { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
        : null;
    };
    rig.body = bounds(0, atlas ? split : canvas.width);
    rig.weapon = atlas ? bounds(split, canvas.width) : null;
  };
  rig.image.src = url;
  return rig;
}
function getRig(kaizo: boolean) {
  rigs ??= { roaring: load(roaringURL), kaizo: load(kaizoURL) };
  return kaizo ? rigs.kaizo : rigs.roaring;
}
export function drawKnightWeapon(ctx: CanvasRenderingContext2D, actor: KnightActorPose, kaizo: boolean) {
  const rig = getRig(kaizo),
    b = rig.weapon;
  if (!b) return false;
  const { grip } = knightSword(actor),
    height = 122,
    width = Math.round((height * b.width) / b.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(grip.x), Math.round(grip.y));
  ctx.scale(actor.facing, 1);
  ctx.rotate(actor.swordAngle);
  ctx.drawImage(rig.image, b.x, b.y, b.width, b.height, -Math.round(width / 2), -12, width, height);
  ctx.restore();
  return true;
}
export function drawKnightActor(ctx: CanvasRenderingContext2D, actor: KnightActorPose, kaizo: boolean) {
  const rig = getRig(kaizo),
    b = rig.body;
  if (!b) return false;
  const height = 145,
    width = Math.round((height * b.width) / b.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(actor.x), Math.round(350 - actor.jump));
  ctx.scale(kaizo ? -actor.facing : actor.facing, 1);
  ctx.rotate(actor.lean);
  ctx.drawImage(rig.image, b.x, b.y, b.width, b.height, -Math.round(width / 2), -171, width, height);
  ctx.restore();
  drawKnightWeapon(ctx, actor, kaizo);
  return true;
}

let charge: Rig | undefined;
export function drawKnightCharge(ctx: CanvasRenderingContext2D, actor: KnightActorPose) {
  charge ??= load(chargeURL, false);
  const b = charge.body;
  if (!b) return false;
  const height = 178,
    width = Math.round((height * b.width) / b.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(actor.x), Math.round(350 - actor.jump));
  ctx.scale(actor.facing, 1);
  ctx.drawImage(charge.image, b.x, b.y, b.width, b.height, -Math.round(width / 2), -height, width, height);
  ctx.restore();
  return true;
}

let statue: Rig | undefined;
export function drawRoaringKnightStatue(ctx: CanvasRenderingContext2D, x: number, y: number) {
  statue ??= load(statueURL, false);
  const b = statue.body;
  if (!b) return false;
  const height = 140,
    width = Math.round((height * b.width) / b.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.filter = 'grayscale(1) brightness(0.65)';
  ctx.drawImage(
    statue.image,
    b.x,
    b.y,
    b.width,
    b.height,
    Math.round(x - width / 2),
    y - height,
    width,
    height,
  );
  ctx.restore();
  return true;
}
