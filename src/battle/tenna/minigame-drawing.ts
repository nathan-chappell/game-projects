import { galleryWindows, minigamePoints, minigameSettings, visibleGalleryTargets } from './minigame.ts';
import type { ShootingMinigame } from './minigame.ts';
export function drawShootingMinigame(
  ctx: CanvasRenderingContext2D,
  m: ShootingMinigame,
  score: number,
  drawParty: () => void,
) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const text = (s: string, x: number, y: number, c = '#fff', size = 16) => {
    ctx.fillStyle = c;
    ctx.font = `bold ${size}px monospace`;
    ctx.fillText(s, x, y);
  };
  ctx.save();
  r(0, 0, 640, 480, '#ffc991');
  r(0, 42, 640, 62, '#c0a1f2');
  r(217, 62, 423, 318, '#d79864');
  for (let y = 64; y < 378; y += 13) {
    r(217, y, 423, 2, '#f0be85');
    for (let x = 220 + (y % 26 ? 0 : 22); x < 640; x += 46) r(x, y, 2, 13, '#bd8258');
  }
  r(0, 62, 56, 318, '#514a3c');
  r(56, 62, 40, 318, '#73694c');
  r(210, 62, 9, 318, '#89694b');
  r(0, 373, 640, 8, '#795a48');
  r(0, 382, 640, 7, '#ffe5ae');
  r(0, 409, 640, 3, '#e6a57e');
  const visible = visibleGalleryTargets(m);
  for (let slot = 0; slot < 9; slot++) {
    const p = galleryWindows[slot],
      target = visible.find((t) => t.slot === slot);
    r(p.x - 42, p.y - 42, 84, 84, '#847e65');
    r(p.x - 38, p.y - 38, 76, 76, '#d4c9a5');
    r(p.x - 34, p.y - 34, 68, 68, '#3a3935');
    if (!target) {
      for (const side of [-1, 1]) {
        r(p.x + (side < 0 ? -31 : 2), p.y - 31, 29, 62, '#8c8b71');
        for (let y = p.y - 28; y < p.y + 28; y += 5) r(p.x + (side < 0 ? -28 : 5), y, 23, 2, '#555d50');
      }
    } else if (target.kind === 'flowey') {
      for (let petal = 0; petal < 6; petal++) {
        const angle = (petal * Math.PI) / 3;
        r(
          p.x + Math.round(Math.cos(angle) * 14) - 6,
          p.y - 8 + Math.round(Math.sin(angle) * 13) - 6,
          12,
          12,
          '#f5db3c',
        );
      }
      r(p.x - 9, p.y - 17, 19, 20, '#fffae6');
      r(p.x - 5, p.y - 12, 3, 5, '#181c1e');
      r(p.x + 4, p.y - 12, 3, 5, '#181c1e');
      r(p.x - 3, p.y - 3, 8, 2, '#181c1e');
      r(p.x - 2, p.y + 4, 4, 19, '#3b9d4d');
      r(p.x - 12, p.y + 13, 12, 5, '#3b9d4d');
      r(p.x + 2, p.y + 10, 12, 5, '#3b9d4d');
    } else {
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - 13, p.y - 28);
      ctx.lineTo(p.x - 5, p.y - 23);
      ctx.lineTo(p.x + 7, p.y - 30);
      ctx.lineTo(p.x + 4, p.y - 21);
      ctx.lineTo(p.x + 12, p.y - 17);
      ctx.lineTo(p.x + 6, p.y - 4);
      ctx.lineTo(p.x + 11, p.y + 13);
      ctx.lineTo(p.x + 23, p.y + 7);
      ctx.lineTo(p.x + 24, p.y + 15);
      ctx.lineTo(p.x + 10, p.y + 23);
      ctx.lineTo(p.x - 3, p.y + 11);
      ctx.lineTo(p.x - 12, p.y + 26);
      ctx.lineTo(p.x - 21, p.y + 23);
      ctx.lineTo(p.x - 9, p.y + 5);
      ctx.lineTo(p.x - 14, p.y - 12);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#12141a';
      ctx.fill();
      r(p.x + 4, p.y - 14, 4, 3, '#fff');
      if (target.fired) {
        ctx.strokeStyle = '#ff735d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 10);
        ctx.lineTo(110, 385);
        ctx.stroke();
      }
    }
  }
  // The party rides together at the left of the western shooting gallery.
  r(61, 367, 120, 25, '#436f39');
  r(76, 392, 12, 10, '#344731');
  r(149, 392, 12, 10, '#344731');
  drawParty();
  r(0, 0, 640, 43, '#181626');
  text('SHOOT THE ENEMIES!', 15, 27, '#fff3c3', 18);
  text(`SCORE ${score}`, 452, 26, '#ffdb74', 18);
  r(0, 420, 640, 60, '#191625');
  text(`MISSES: ${m.misses}`, 16, 444, '#ffb9bb');
  for (let i = 0; i < Math.min(m.misses, 12); i++) {
    const x = 165 + i * 27;
    ctx.strokeStyle = '#ff4e6c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 429);
    ctx.lineTo(x + 14, 445);
    ctx.moveTo(x + 14, 429);
    ctx.lineTo(x, 445);
    ctx.stroke();
  }
  text(`ROUND +${minigamePoints(m.misses)} POINTS`, 16, 469, '#ffdb74', 14);
  text(`TIME ${Math.ceil(Math.max(0, minigameSettings.duration - m.age))}`, 527, 469, '#fff', 14);
  if (m.feedbackAge > 0)
    text(
      m.feedback,
      18,
      73,
      m.feedback.includes('Flowey') || m.feedback.includes('shot you') ? '#ff506b' : '#fff',
      14,
    );
  const { x, y } = m.cursor;
  ctx.strokeStyle = m.shotFlash > 0 ? '#ffdf67' : '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 29, y - 31, 58, 62);
  ctx.strokeStyle = '#f14d57';
  ctx.beginPath();
  ctx.moveTo(x - 37, y);
  ctx.lineTo(x - 20, y);
  ctx.moveTo(x + 20, y);
  ctx.lineTo(x + 37, y);
  ctx.moveTo(x, y - 39);
  ctx.lineTo(x, y - 22);
  ctx.moveTo(x, y + 22);
  ctx.lineTo(x, y + 39);
  ctx.stroke();
  if (m.shotFlash > 0) {
    ctx.globalAlpha = m.shotFlash / 0.12;
    r(x - 4, y - 4, 8, 8, '#fff3aa');
  }
  ctx.restore();
}
