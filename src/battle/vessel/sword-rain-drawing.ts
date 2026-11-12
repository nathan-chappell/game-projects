import { starBombSettings } from './star-bombs.ts';
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
    ctx.save();
    ctx.translate(Math.max(8, Math.min(632, warning.x)), Math.max(8, Math.min(472, warning.y)));
    ctx.rotate(warning.angle);
    ctx.beginPath();
    ctx.moveTo(-5, -8);
    ctx.lineTo(5, 0);
    ctx.lineTo(-5, 8);
    ctx.stroke();
    ctx.restore();
    if (rain.pattern === 'rain') {
      ctx.fillStyle = '#a92436';
      ctx.fillRect(warning.x - 12, 477, 24, 3);
    }
  }
  ctx.globalAlpha = 1;
  for (const bomb of rain.bombs) {
    const progress = bomb.age / starBombSettings.fuse;
    ctx.save();
    ctx.translate(Math.round(bomb.x), Math.round(bomb.y));
    const urgent = progress > 0.65;
    ctx.fillStyle = '#100b18';
    ctx.strokeStyle = urgent ? '#ff6a7f' : '#d6cce0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 8;
      const radius = i % 2 ? 12 : 23;
      const x = Math.cos(angle) * radius,
        y = Math.sin(angle) * radius;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = urgent ? '#ff233f' : '#ffffff';
    ctx.fillRect(-2, -7, 4, 14);
    ctx.fillRect(-7, -2, 14, 4);
    ctx.strokeStyle = urgent ? '#ff334c88' : '#a99bb766';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 25 + 12 * (1 - progress), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const sword of rain.swords) drawKnightSword(ctx, { ...sword, owner: 'kaizo' }, reduced);
  for (const burst of rain.bursts) {
    const progress = burst.age / 0.45;
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = burst.radial ? '#ff334c' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.rotate(burst.angle + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      8 + progress * 42,
      burst.radial ? 8 + progress * 42 : 4 + progress * 22,
      0,
      burst.radial ? 0 : Math.PI,
      Math.PI * 2,
    );
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const angle = burst.radial ? (i / 7) * Math.PI * 2 : -Math.PI + (i / 6) * Math.PI;
      const radius = 10 + progress * 35;
      ctx.fillStyle = i % 2 ? '#b8c7de' : '#ffffff';
      ctx.fillRect(Math.cos(angle) * radius, Math.sin(angle) * radius, 3, 3);
    }
    ctx.restore();
  }
  ctx.restore();
}
