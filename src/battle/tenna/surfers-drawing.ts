import { surferSettings } from './surfers.ts';
import type { SurferMinigame } from './surfers.ts';
export function drawSurferMinigame(
  ctx: CanvasRenderingContext2D,
  m: SurferMinigame,
  score: number,
  drawKris: (x: number, y: number) => void,
) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const text = (s: string, x: number, y: number, c = '#fff', size = 16) => {
    ctx.fillStyle = c;
    ctx.font = `bold ${size}px monospace`;
    ctx.fillText(s, x, y);
  };
  const poly = (pts: number[][], c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  ctx.save();
  r(0, 0, 640, 480, '#b0e9f5');
  r(0, 180, 640, 90, '#ddf6f5');
  r(505, 67, 38, 38, '#fff1ac');
  r(497, 77, 54, 19, '#fff1ac');
  for (let i = 0; i < 5; i++) {
    const x = ((((i * 170 - m.age * 17) % 800) + 800) % 800) - 60;
    r(x, 100 + (i % 2) * 34, 75, 8, '#fff');
    r(x + 15, 92 + (i % 2) * 34, 37, 10, '#fff');
  }
  for (let band = 0; band < 3; band++) {
    const top = 282 + band * 35;
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.lineTo(0, top);
    for (let x = 0; x <= 640; x += 4) ctx.lineTo(x, top + Math.sin(x * 0.023 + m.age * (band + 1) * 1.5) * 9);
    ctx.lineTo(640, 480);
    ctx.closePath();
    ctx.fillStyle = ['#318fc8', '#18add7', '#087cae'][band];
    ctx.fill();
  }
  for (const rock of m.rocks) {
    if (rock.x < -60 || rock.x > 700) continue;
    const x = rock.x,
      y = surferSettings.waterY;
    poly(
      [
        [x - 24, y + 8],
        [x - 17, y - rock.height + 13],
        [x - 5, y - rock.height],
        [x + 8, y - rock.height + 5],
        [x + 23, y + 8],
      ],
      rock.hit ? '#5f6471' : '#252d3b',
    );
    poly(
      [
        [x - 5, y - rock.height + 3],
        [x + 7, y - rock.height + 7],
        [x + 18, y + 3],
        [x + 3, y - 4],
      ],
      '#566071',
    );
    if (rock.flowey) {
      const cy = y - rock.height - 17;
      for (let p = 0; p < 6; p++) {
        const a = (p * Math.PI) / 3;
        r(x + Math.cos(a) * 10 - 4, cy + Math.sin(a) * 10 - 4, 8, 8, '#ffe049');
      }
      r(x - 7, cy - 7, 14, 15, '#fff8df');
      r(x - 4, cy - 3, 2, 4, '#222');
      r(x + 3, cy - 3, 2, 4, '#222');
      r(x - 3, cy + 4, 6, 2, '#222');
      r(x - 2, cy + 8, 4, 12, '#53ac64');
    }
  }
  for (const c of m.coins) {
    if (c.collected || c.x < -20 || c.x > 660) continue;
    const w = 5 + Math.abs(Math.cos(m.age * 7 + c.x * 0.01)) * 7;
    r(c.x - w / 2 - 2, c.y - 10, w + 4, 20, c.purple ? '#6136ac' : '#ba7d1c');
    r(c.x - w / 2, c.y - 8, w, 16, c.purple ? '#c685ff' : '#ffe16a');
    r(c.x - 1, c.y - 5, 2, 10, c.purple ? '#f5dbff' : '#fff7b1');
  }
  const x = surferSettings.playerX,
    y = m.feetY;
  r(x - 31, y + 12, 59, 3, '#a8f0ff');
  r(x - 40, y + 17, 27, 2, '#d1fcff');
  poly(
    [
      [x - 37, y + 4],
      [x + 28, y + 4],
      [x + 40, y - 3],
      [x + 32, y + 12],
      [x - 28, y + 12],
    ],
    '#d89b23',
  );
  poly(
    [
      [x - 34, y + 3],
      [x + 29, y + 3],
      [x + 39, y - 3],
      [x + 31, y + 8],
      [x - 26, y + 8],
    ],
    '#ffe57a',
  );
  drawKris(x, y + 2);
  for (let i = 0; i < 10; i++) {
    const px = ((((i * 83 - m.age * 110) % 750) + 750) % 750) - 40;
    r(px, 382 + (i % 3) * 24, 25, 2, '#38c8e3');
  }
  r(0, 0, 640, 43, '#141b37');
  text('SURFERS', 16, 28, '#fff0a5', 21);
  text(`SCORE ${Math.max(0, score + m.points)}`, 435, 27, '#fff0a5', 18);
  r(0, 423, 640, 57, '#141b37');
  text(`COINS ${m.coinsCollected}  CRASHES ${m.misses}`, 15, 445, '#a7efff', 15);
  text(`ROUND ${m.points >= 0 ? '+' : ''}${m.points} POINTS`, 15, 469, '#ffe27d', 14);
  text(`TIME ${Math.ceil(Math.max(0, 15 - m.age))}`, 528, 468, '#fff', 16);
  if (m.feedbackAge > 0) text(m.feedback, 15, 72, m.feedback.includes('CRASH') ? '#b42858' : '#30356e', 15);
  if (m.purpleCollected) text('PURPLE COIN +10', 330, 445, '#d6a5ff', 14);
  ctx.restore();
}
