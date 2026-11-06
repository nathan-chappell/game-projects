import tennaURL from '../../../assets/tenna-pointing.png?inline';

// Share the reference cutout across the entrance, backstage NPC and portrait.
const image = new Image();
image.src = tennaURL;
const body = { x: 18, y: 24, width: 1001, height: 1480, anchorX: 600 };

export function createTennaSprite(ctx: CanvasRenderingContext2D) {
  const ready = () => image.complete && image.naturalWidth > 0;
  function draw(x: number, y: number, scale = 1.3) {
    if (!ready()) return;
    const height = 126 * scale,
      ratio = height / body.height;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      body.x,
      body.y,
      body.width,
      body.height,
      Math.round(x - (body.anchorX - body.x) * ratio),
      Math.round(y - height),
      Math.round(body.width * ratio),
      Math.round(height),
    );
    ctx.restore();
  }
  let staticCanvas: HTMLCanvasElement | null = null;
  let staticFrame = -1;
  function drawStatic(x: number, y: number, scale: number, time: number) {
    if (!ready()) return;
    if (!staticCanvas) {
      staticCanvas = document.createElement('canvas');
      staticCanvas.width = 96;
      staticCanvas.height = 80;
    }
    const noise = staticCanvas.getContext('2d')!;
    const frame = Math.floor(time * 12);
    if (frame !== staticFrame) {
      staticFrame = frame;
      const pixels = noise.createImageData(96, 80);
      // Local deterministic noise keeps the visual effect out of gameplay randomness.
      let seed = ((frame + 1) * 2654435761) | 0;
      for (let row = 0; row < 80; row++)
        for (let col = 0; col < 96; col++) {
          seed ^= seed << 13;
          seed ^= seed >>> 17;
          seed ^= seed << 5;
          let value = 30 + ((seed >>> 0) % 206);
          if ((row + frame * 3) % 80 < 3) value = Math.round(value * 0.48);
          const i = (row * 96 + col) * 4;
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
          pixels.data[i + 3] = 255;
        }
      noise.putImageData(pixels, 0, 0);
    }
    const ratio = (126 * scale) / body.height;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x - body.anchorX * ratio, y - (body.y + body.height) * ratio);
    ctx.scale(ratio, ratio);
    // Follow the inset glass, leaving the white bezel, antennae and black dial intact.
    const glass = [
      484, 164, 583, 164, 583, 176, 651, 176, 651, 188, 700, 188, 700, 200, 751, 200, 751, 212, 808, 212, 808,
      299, 795, 299, 795, 330, 768, 330, 768, 341, 711, 341, 711, 402, 660, 429, 558, 410, 521, 389, 500, 365,
      484, 311,
    ];
    ctx.beginPath();
    ctx.moveTo(glass[0], glass[1]);
    for (let i = 2; i < glass.length; i += 2) ctx.lineTo(glass[i], glass[i + 1]);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(staticCanvas, 480, 160, 330, 280);
    ctx.restore();
  }
  function portrait() {
    ctx.clearRect(0, 0, 64, 64);
    if (!ready()) {
      image.addEventListener('load', portrait, { once: true });
      return;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 360, 16, 568, 530, 0, 2, 64, 60);
    ctx.restore();
  }
  return { draw, portrait, drawStatic };
}
