import vesselURL from '../../../assets/vessel-left.png?inline';
let image: HTMLImageElement | undefined;
/** The grayscale reference variant is already facing left; never mirror it again. */
export function drawVessel(
  ctx: CanvasRenderingContext2D,
  x: number,
  feetY: number,
  height: number,
  alpha = 1,
) {
  image ??= new Image();
  if (!image.src) image.src = vesselURL;
  if (!image.complete || !image.naturalWidth) return false;
  const width = (height * image.naturalWidth) / image.naturalHeight;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
  ctx.filter = 'grayscale(1)';
  ctx.drawImage(image, Math.round(x - width / 2), Math.round(feetY - height), Math.round(width), height);
  ctx.restore();
  return true;
}
