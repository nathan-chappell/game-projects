import { context2D } from '../../game/dom.ts';
import type { DrawingHelpers } from '../../rendering/types.ts';
// Draw the city once at half resolution, then enlarge its hard pixel edges.
export function createRooftopDrawing(
  ctx: CanvasRenderingContext2D,
  {
    rect,
    pixelText,
    reducedParticleMotion,
  }: Pick<DrawingHelpers, 'rect' | 'pixelText' | 'reducedParticleMotion'>,
) {
  let city: HTMLCanvasElement | null = null;
  function skyline() {
    if (city) return city;
    city = document.createElement('canvas');
    city.width = 320;
    city.height = 240;
    const ink = context2D(city);
    const r = (x: number, y: number, w: number, h: number, color: string) => {
      ink.fillStyle = color;
      ink.fillRect(x, y, w, h);
    };
    function line(x: number, y: number, endX: number, endY: number, color: string) {
      x = Math.round(x);
      y = Math.round(y);
      endX = Math.round(endX);
      endY = Math.round(endY);
      const dx = Math.abs(endX - x),
        sx = x < endX ? 1 : -1,
        dy = -Math.abs(endY - y),
        sy = y < endY ? 1 : -1;
      let error = dx + dy;
      while (true) {
        r(x, y, 1, 1, color);
        if (x === endX && y === endY) break;
        const e = 2 * error;
        if (e >= dy) {
          error += dy;
          x += sx;
        }
        if (e <= dx) {
          error += dx;
          y += sy;
        }
      }
    }
    function building(x: number, y: number, w: number, h: number, color = '#282439') {
      r(x, y, w, h, color);
      r(x, y, w, 1, '#815044');
      r(x, y + 1, 1, h, '#563546');
      r(x + w - 1, y + 1, 1, h, '#39283b');
      r(x + 3, y + 4, w - 6, 2, '#342940');
    }
    function wheel(x: number, y: number, radius: number) {
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          const d = Math.hypot(dx, dy);
          if (d <= radius && d >= radius - 3)
            r(x + dx, y + dy, 1, 1, d >= radius - 1 ? '#875443' : '#4a303c');
        }
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        line(x, y, x + Math.cos(a) * (radius - 5), y + Math.sin(a) * (radius - 5), '#785044');
        r(
          Math.round(x + Math.cos(a) * (radius - 2)) - 1,
          Math.round(y + Math.sin(a) * (radius - 2)) - 1,
          3,
          3,
          '#e7b870',
        );
      }
      r(x - 3, y - 3, 7, 7, '#282238');
      r(x - 1, y - 1, 3, 3, '#d29963');
      r(x - 18, y + radius - 5, 36, 3, '#b2714e');
    }
    r(0, 0, 320, 240, '#171427');
    // Green light cables crisscross the sky behind the industrial skyline.
    for (const [x, y, toX, toY] of [
      [0, 2, 168, 105],
      [0, 34, 209, 0],
      [29, 0, 206, 120],
      [0, 79, 286, 2],
      [141, 0, 76, 120],
      [183, 0, 183, 108],
      [222, 0, 160, 120],
      [249, 0, 319, 47],
      [284, 0, 229, 135],
      [319, 14, 176, 91],
      [319, 37, 180, 113],
      [319, 55, 225, 94],
    ])
      line(x, y, toX, toY, '#337a33');
    // Distant chimneys and rooftop boxes make a second, darker city layer.
    for (const [x, y, w, h] of [
      [9, 79, 16, 77],
      [38, 107, 34, 49],
      [75, 93, 20, 64],
      [101, 85, 26, 73],
      [136, 105, 27, 52],
      [171, 77, 38, 81],
      [214, 92, 25, 66],
      [253, 103, 44, 55],
      [305, 80, 26, 78],
    ])
      building(x, y, w, h, '#201e32');
    for (const [x, y, h] of [
      [10, 59, 50],
      [20, 73, 42],
      [207, 57, 57],
      [218, 78, 37],
    ]) {
      r(x, y, 6, h, '#3b304c');
      r(x - 1, y + 2, 8, 3, '#68415a');
      r(x + 2, y - 5, 1, 7, '#6b5873');
    }
    wheel(59, 119, 27);
    wheel(263, 117, 27);
    for (const x of [89, 180, 298]) {
      r(x, 37, 3, 96, '#3e5966');
      r(x + 1, 28, 1, 104, '#79b8bb');
      r(x - 4, 46, 4, 12, '#40bdd0');
      r(x + 4, 55, 4, 12, '#41b5c8');
      r(x - 4, 43, 4, 2, '#71739a');
      r(x + 4, 52, 4, 2, '#74739c');
      r(x - 1, 72, 4, 7, '#3bd3d7');
      r(x + 4, 82, 3, 4, '#5489a5');
    }
    building(-12, 101, 40, 59);
    building(99, 94, 33, 66);
    building(132, 108, 24, 52);
    building(157, 91, 39, 69);
    building(195, 102, 35, 58);
    building(304, 94, 35, 66);
    building(28, 138, 15, 22, '#1a2836');
    building(65, 138, 32, 22, '#1e2d38');
    building(268, 135, 30, 25, '#243342');
    // Cyan display windows with small warm yellow segments, as in the reference.
    for (const [x, y, w] of [
      [-4, 114, 29],
      [-4, 125, 29],
      [-4, 138, 29],
      [102, 105, 24],
      [102, 117, 24],
      [198, 111, 27],
      [198, 124, 27],
      [198, 138, 27],
      [307, 105, 23],
      [307, 117, 23],
    ]) {
      r(x, y, w, 5, '#25576c');
      r(x, y, Math.max(6, w - 7), 5, '#36b1cb');
      r(x + Math.floor(w / 3), y, 5, 5, '#e5d983');
    }
    r(67, 140, 28, 13, '#2bb5c9');
    r(270, 137, 27, 16, '#2bb3c7');
    for (const [x, y] of [
      [52, 138],
      [58, 145],
      [51, 153],
      [245, 138],
      [252, 146],
      [246, 153],
    ])
      r(x, y, 3, 4, '#3299b4');
    r(29, 157, 12, 2, '#31b0bf');
    r(98, 157, 29, 2, '#2cb0be');
    r(287, 157, 27, 2, '#2cb0be');
    // The green panelled walkway and the dark, layered ledge below it.
    r(0, 160, 320, 40, '#0c4939');
    r(0, 158, 320, 4, '#596077');
    r(0, 162, 320, 2, '#141625');
    for (let x = 0; x < 320; x += 10) {
      r(x, 164, 1, 33, '#061c23');
      r(x + 1, 164, 1, 33, '#175340');
      r(x + 2, 164, 7, 33, x % 20 ? '#0b4c3b' : '#0c4537');
    }
    r(0, 198, 320, 3, '#041219');
    r(0, 203, 320, 3, '#555571');
    r(0, 206, 320, 14, '#2c2a4a');
    r(0, 220, 320, 5, '#18172b');
    r(0, 225, 320, 15, '#0d0d18');
    return city;
  }
  return function drawRooftop(time: number) {
    ctx.drawImage(skyline(), 0, 0, 640, 480);
    // Restrained sparkles keep the skyline alive without flashing the room.
    for (let i = 0; i < 15; i++) {
      const x = 448 + ((i * 29) % 159),
        y = 24 + ((i * 19) % 77);
      const alpha = reducedParticleMotion.matches ? 0.55 : 0.45 + Math.sin(time * 0.9 + i * 2) * 0.22;
      ctx.save();
      ctx.globalAlpha = alpha;
      rect(x - 2, y, 5, 1, '#9ba4ab');
      rect(x, y - 3, 1, 7, '#84a99a');
      ctx.restore();
    }
    pixelText('< CROSSING', 9, 389, '#93b8a4', 10);
  };
}
