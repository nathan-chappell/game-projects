import roaringURL from '../../../assets/roaring-knight-cutout.png?inline';
import kaizoURL from '../../../assets/kaizo-knight-cutout.png?inline';

interface Sprite {
  image: HTMLImageElement;
  bounds: { x: number; y: number; width: number; height: number } | null;
}
let sprites: { roaring: Sprite; kaizo: Sprite } | undefined;
function load(url: string): Sprite {
  const sprite: Sprite = { image: new Image(), bounds: null };
  sprite.image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = sprite.image.naturalWidth;
    canvas.height = sprite.image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(sprite.image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width,
      top = canvas.height,
      right = -1,
      bottom = -1;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 12) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    if (right >= left && bottom >= top)
      sprite.bounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  };
  sprite.image.src = url;
  return sprite;
}

export function drawKnightSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  kaizo: boolean,
) {
  sprites ??= { roaring: load(roaringURL), kaizo: load(kaizoURL) };
  const sprite = kaizo ? sprites.kaizo : sprites.roaring;
  if (!sprite.bounds) return false;
  const b = sprite.bounds,
    height = 178,
    width = Math.round((height * b.width) / b.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  // The supplied Roaring Knight faces right; the supplied Kaizo Knight faces left.
  ctx.scale(kaizo ? -facing : facing, 1);
  ctx.drawImage(sprite.image, b.x, b.y, b.width, b.height, -Math.round(width / 2), -height, width, height);
  ctx.restore();
  return true;
}
