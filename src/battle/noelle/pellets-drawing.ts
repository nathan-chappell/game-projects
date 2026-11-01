import { context2D } from '../../game/dom.ts';
import type { Encounter } from '../shared/types.ts';
import { pelletsFrame, pelletsSettings } from './pellets.ts';

export function createPelletsDrawing(ctx: CanvasRenderingContext2D, reducedMotion: MediaQueryList) {
  const grain = document.createElement('canvas');
  grain.width = 6;
  grain.height = 10;
  const ink = context2D(grain);
  ink.fillStyle = '#ffffff';
  [
    '001100',
    '011110',
    '011110',
    '111111',
    '111111',
    '111111',
    '111111',
    '011110',
    '011110',
    '001100',
  ].forEach((row, y) =>
    [...row].forEach((pixel, x) => {
      if (pixel === '1') ink.fillRect(x, y, 1, 1);
    }),
  );
  return function drawPellets(encounter: Encounter) {
    const cast = encounter.pelletsCast;
    if (!cast) return;
    const frame = pelletsFrame(cast.age, reducedMotion.matches, encounter.kind === 'dark');
    ctx.save();
    ctx.globalAlpha = frame.alpha;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < pelletsSettings.count; i++) {
      const angle = (i * Math.PI * 2) / pelletsSettings.count + frame.rotation;
      ctx.save();
      ctx.translate(
        Math.round(frame.x + Math.cos(angle) * frame.radius),
        Math.round(frame.y + Math.sin(angle) * frame.radius),
      );
      ctx.rotate(angle + (i % 2 ? Math.PI / 2 : 0));
      const width = 5 * frame.size,
        height = 9 * frame.size;
      // A dark one-pixel edge keeps the white grains visible on the bright room.
      ctx.shadowColor = '#17121d';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.drawImage(grain, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
    ctx.restore();
  };
}
