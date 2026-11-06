import undyneURL from '../../../assets/undyne-reference.png?inline';
let sprite: HTMLImageElement | null = null;
export function drawUndyne(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  scale = 1,
  glitch = false,
  healAge = 2,
) {
  if (!sprite) {
    sprite = new Image();
    sprite.src = undyneURL;
  }
  if (!sprite.complete || !sprite.naturalWidth) return;
  const height = 152 * scale,
    width = (height * sprite.naturalWidth) / sprite.naturalHeight,
    left = x - width / 2,
    top = y - height;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, left, top, width, height);
  if (glitch && Math.floor(time * 7) % 5 === 0) {
    for (let strip = 0; strip < 3; strip++) {
      const sy = top + height * (0.24 + strip * 0.22),
        offset = (strip % 2 ? -1 : 1) * 4 * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(left - 6, sy, width + 12, 3 * scale);
      ctx.clip();
      ctx.drawImage(sprite, left + offset, top, width, height);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = strip % 2 ? '#ef59bd' : '#6ce9f2';
      ctx.fillRect(left + width * 0.2 + offset, sy, width * 0.45, scale);
      ctx.restore();
    }
  }
  if (healAge < 1) {
    ctx.globalAlpha = 1 - healAge;
    ctx.fillStyle = '#75ffb7';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('MAX HP', x - 26, top - 10 - healAge * 20);
    for (let i = 0; i < 5; i++) {
      const px = x + Math.sin(i * 7) * 35,
        py = y - (height * (i + 1)) / 6 - healAge * 25;
      ctx.fillRect(px - 1, py - 5, 3, 11);
      ctx.fillRect(px - 5, py - 1, 11, 3);
    }
  }
  ctx.restore();
}
