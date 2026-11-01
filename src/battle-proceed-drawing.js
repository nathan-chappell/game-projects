import { proceedGlitchSeconds } from './battle-proceed.js';

export function createProceedGlitchDrawing(ctx, reducedMotion) {
  const snapshot = document.createElement('canvas');
  snapshot.width = 640; snapshot.height = 480;
  const source = snapshot.getContext('2d');
  return function drawProceedGlitch(age) {
    const progress = Math.min(1, age / proceedGlitchSeconds);
    source.drawImage(ctx.canvas, 0, 0, 640, 480);
    ctx.save();
    // Tear the actual battle into displaced strips, then let it collapse into
    // darkness. Reduced motion keeps a still fractured image and a smooth fade.
    const frame = reducedMotion.matches ? 5 : Math.floor(age * 16);
    for (let y = 0, band = 0; y < 480; band++) {
      const height = Math.min(480 - y, 12 + (band * 17 % 29)),
        shift = Math.round(Math.sin(band * 4.7 + frame * 1.9) * (10 + progress * 48));
      ctx.fillStyle = '#07060e';
      ctx.fillRect(0, y, 640, height);
      ctx.drawImage(snapshot, 0, y, 640, height, shift, y, 640, height);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = band % 2 ? '#d749ba' : '#5dccdc';
      ctx.fillRect(Math.abs(shift) * 7 % 640, y, 30 + Math.abs(shift), 2);
      ctx.globalAlpha = 1;
      y += height;
    }
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = Math.min(1, Math.max(0, (progress - 0.55) / 0.4));
    ctx.fillRect(0, 0, 640, 480);
    ctx.restore();
  };
}
