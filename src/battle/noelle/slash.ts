import sweepURL from '../../../assets/red-sweep.png?inline';
import { rescueSettings } from './aftermath.ts';

export const redSlashSeconds = rescueSettings.slash;

export function createRedSlashDrawing(ctx: CanvasRenderingContext2D) {
  const sweep = new Image();
  sweep.src = sweepURL;
  // The edited image has transparent margins. Crop to the inspected solid sprite
  // so its long, thin silhouette keeps the same proportions as the reference.
  const source = { x: 105, y: 338, width: 1816, height: 137 };
  return function drawRedSlash(age: number, reducedMotion = false) {
    if (!Number.isFinite(age) || age < 0 || age >= redSlashSeconds || !sweep.complete || !sweep.naturalWidth)
      return;
    const reach = reducedMotion ? 1 : Math.min(1, (age + 1 / 60) / 0.12);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sweep, source.x, source.y, source.width, source.height, 40, 219, 560 * reach, 42);
    ctx.restore();
  };
}
