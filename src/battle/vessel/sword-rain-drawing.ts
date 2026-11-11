import { drawKnightSword } from '../knights/sword-drawing.ts';
import { vesselRainSettings, type VesselRain } from './sword-rain.ts';

export function drawVesselRain(ctx: CanvasRenderingContext2D, rain: VesselRain, reduced: boolean) {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 640, 480);
  for (const warning of rain.warnings) {
    const progress = 1 - warning.remaining / vesselRainSettings.warning;
    ctx.strokeStyle = '#be273e';
    ctx.globalAlpha = 0.35 + progress * 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(warning.x - 8, 8);
    ctx.lineTo(warning.x, 18);
    ctx.lineTo(warning.x + 8, 8);
    ctx.stroke();
    ctx.fillStyle = '#a92436';
    ctx.fillRect(warning.x - 12, 477, 24, 3);
  }
  ctx.globalAlpha = 1;
  for (const sword of rain.swords) drawKnightSword(ctx, { ...sword, owner: 'kaizo' }, reduced);
  for (const burst of rain.bursts) {
    const progress = burst.age / 0.45;
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(burst.x, burst.y, 8 + progress * 42, 4 + progress * 22, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const angle = -Math.PI + (i / 6) * Math.PI;
      const radius = 10 + progress * 35;
      ctx.fillStyle = i % 2 ? '#b8c7de' : '#ffffff';
      ctx.fillRect(burst.x + Math.cos(angle) * radius, burst.y + Math.sin(angle) * radius, 3, 3);
    }
  }
  ctx.restore();
}
