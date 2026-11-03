import { hammerLanes, hammerSettings, hammerTVScale } from './hammers.ts';
import type { HammerMinigame } from './hammers.ts';
export function drawHammerMinigame(
  ctx: CanvasRenderingContext2D,
  m: HammerMinigame,
  score: number,
  drawSusie: (x: number, y: number) => void,
) {
  ctx.save();
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const text = (s: string, x: number, y: number, c = '#fff', size = 16) => {
    ctx.fillStyle = c;
    ctx.font = `bold ${size}px monospace`;
    ctx.fillText(s, x, y);
  };
  rect(0, 0, 640, 480, '#171629');
  const glow = ctx.createRadialGradient(430, 245, 20, 430, 245, 420);
  glow.addColorStop(0, '#36334e');
  glow.addColorStop(1, '#171629');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 47, 640, 361);
  drawSusie(98, 288);
  for (const tv of m.tvs) {
    if (tv.resolved || m.age < tv.spawn) continue;
    ctx.save();
    ctx.translate(tv.x, hammerLanes[tv.lane]);
    const scale = hammerTVScale(tv.x);
    ctx.scale(scale, scale);
    const x = 0,
      y = 0;
    rect(x - 30, y - 29, 60, 55, '#090c19');
    rect(x - 27, y - 26, 54, 49, '#a9a7b8');
    rect(x - 23, y - 22, 42, 38, tv.flowey ? '#253d30' : '#352366');
    rect(x - 21, y + 26, 10, 5, '#ddd');
    rect(x + 12, y + 26, 10, 5, '#ddd');
    ctx.strokeStyle = '#c4c2e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 13, y - 40);
    ctx.lineTo(x, y - 29);
    ctx.lineTo(x + 13, y - 40);
    ctx.stroke();
    if (tv.flowey) {
      for (let p = 0; p < 6; p++)
        rect(
          x - 7 + Math.cos((p * Math.PI) / 3) * 12,
          y - 10 + Math.sin((p * Math.PI) / 3) * 11,
          10,
          10,
          '#ffe24d',
        );
      rect(x - 8, y - 10, 17, 18, '#fff7ca');
      rect(x - 5, y - 6, 3, 5, '#16241b');
      rect(x + 3, y - 6, 3, 5, '#16241b');
      rect(x - 3, y + 3, 8, 2, '#16241b');
    } else {
      rect(x - 15, y - 15, 27, 25, '#111022');
      rect(x - 12, y - 12, 21, 16, '#f6d8ff');
      rect(x - 10, y - 9, 6, 4, '#171326');
      rect(x + 1, y - 9, 6, 4, '#171326');
      rect(x - 7, y - 1, 12, 3, '#d94399');
      rect(x - 8, y + 11, 14, 6, '#e93f9c');
    }
    ctx.restore();
  }
  for (const h of m.hammers) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.age * 15);
    rect(-3, -2, 6, 27, '#ce914f');
    rect(-15, -11, 30, 15, '#17121e');
    rect(-13, -9, 26, 11, '#e1dbee');
    rect(-12, -8, 5, 9, '#fff');
    ctx.restore();
  }
  ctx.strokeStyle = '#ff465c';
  ctx.lineWidth = 2;
  const { x, y } = m.cursor;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(x + side * 12, y);
    ctx.lineTo(x + side * 28, y);
    ctx.moveTo(x, y + side * 12);
    ctx.lineTo(x, y + side * 28);
  }
  ctx.stroke();
  ctx.strokeRect(x - 17, y - 17, 34, 34);
  rect(0, 0, 640, 47, '#0c0c18');
  text('SUSIE: HAMMER TIME!', 16, 29, '#f9b4ef', 20);
  text(`SCORE ${score + m.points}`, 447, 29, '#ffdd72');
  text('TENNA TV +5   /   FLOWEY TV = X', 95, 83, '#e4dafa', 16);
  rect(0, 408, 640, 72, '#0c0c18');
  text(`Xs: ${m.misses}   ROUND +${m.points}`, 16, 433, '#ffcaea');
  text(`TIME ${Math.ceil(Math.max(0, hammerSettings.duration - m.age))}`, 526, 433);
  text('Mouse / arrows aim · Click / Z / Space throws', 16, 459, '#d9d2ee', 13);
  if (m.feedbackAge > 0) text(m.feedback, 140, 106, m.feedback.includes('X') ? '#ff647f' : '#ffdf80', 14);
  ctx.restore();
}
