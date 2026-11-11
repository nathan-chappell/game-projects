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

export function drawVesselArrival(ctx: CanvasRenderingContext2D, age: number, reduced: boolean) {
  const progress = Math.max(0, Math.min(1, age / 0.8));
  const ring = Math.max(0, 1 - age / 1.8);
  ctx.save();
  ctx.globalAlpha = ring;
  ctx.strokeStyle = '#777777';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(450, 280, 25 + age * 12, 7 + age * 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawVessel(ctx, 450, 280 - (reduced ? 0 : (1 - progress) * 12), 96, progress);
}
export function drawVesselXSlash(ctx: CanvasRenderingContext2D, age: number) {
  if (age < 0 || age >= 0.75) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (0.75 - age) / 0.2);
  ctx.lineCap = 'square';
  for (let i = 0; i < 2; i++) {
    const progress = Math.max(0, Math.min(1, (age - i * 0.16) / 0.18));
    if (!progress) continue;
    const startX = i ? 490 : 415,
      endX = i ? 415 : 490;
    for (const [width, color] of [
      [8, '#4a7295'],
      [4, '#ffffff'],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(startX, 165);
      ctx.lineTo(startX + (endX - startX) * progress, 165 + 105 * progress);
      ctx.stroke();
    }
  }
  ctx.restore();
}
