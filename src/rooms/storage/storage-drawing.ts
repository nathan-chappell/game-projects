import type { DrawingHelpers } from '../../rendering/types.ts';
import type { Room } from '../../world/types.ts';
export function createStorageDrawing(
  ctx: CanvasRenderingContext2D,
  { rect, reducedParticleMotion }: Pick<DrawingHelpers, 'rect' | 'reducedParticleMotion'>,
) {
  const poly = (points: number[][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  function camera(x: number, y: number, index: number, time: number) {
    const sway = reducedParticleMotion.matches ? 0 : Math.round(Math.sin(time * 0.65 + index) * 2);
    ctx.strokeStyle = '#53616d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x + sway, y - 16);
    ctx.stroke();
    x += sway;
    rect(x - 12, y - 8, 27, 18, '#10171f');
    rect(x - 10, y - 6, 23, 13, '#3b4a55');
    rect(x - 7, y - 3, 14, 7, '#26313d');
    rect(x - 8, y - 5, 17, 2, '#6a7d8b');
    for (const dx of [-6, 6]) {
      rect(x + dx - 5, y - 17, 10, 10, '#18212c');
      rect(x + dx - 3, y - 15, 6, 6, '#5a6a7c');
      rect(x + dx - 1, y - 13, 2, 2, '#17222b');
    }
    poly(
      [
        [x + 15, y - 5],
        [x + 24, y - 10],
        [x + 27, y - 7],
        [x + 27, y + 9],
        [x + 24, y + 11],
        [x + 15, y + 5],
      ],
      '#17212e',
    );
    rect(x + 24, y - 5, 3, 12, '#7796a0');
    rect(x + 25, y - 3, 1, 6, '#b1d1cd');
    const lit = reducedParticleMotion.matches || Math.floor(time + index) % 3 !== 0;
    rect(x - 9, y + 3, 2, 2, lit ? '#d87565' : '#75473f');
    rect(x - 2, y + 11, 6, 5, '#26323d');
    rect(x - 5, y + 16, 12, 2, '#354350');
  }
  function room(time: number, room: Room) {
    rect(0, 0, 640, 160, '#03070c');
    rect(30, 22, 580, 10, '#25303a');
    rect(30, 22, 580, 2, '#56616a');
    for (let x = 44; x < 610; x += 80) {
      rect(x, 25, 4, 4, '#10171f');
      rect(x + 1, 26, 1, 1, '#87959c');
    }
    for (const [i, [x, y]] of [
      [92, 89],
      [202, 126],
      [314, 82],
      [436, 116],
      [546, 88],
    ].entries())
      camera(x, y, i, time);
    ctx.save();
    ctx.globalAlpha = 0.07;
    poly(
      [
        [190, 134],
        [216, 134],
        [289, 440],
        [108, 440],
      ],
      '#9abeb8',
    );
    poly(
      [
        [427, 124],
        [450, 124],
        [516, 440],
        [365, 440],
      ],
      '#a7acb3',
    );
    ctx.restore();
    rect(0, 156, 640, 4, '#29333b');
    ctx.save();
    ctx.beginPath();
    for (let y = 4; y < 11; y++)
      for (let x = 0; x < 16; x++)
        if ([0, 2, 3, 5].includes(room.map[y][x])) ctx.rect(x * 40, y * 40, 40, 40);
    ctx.clip();
    ctx.strokeStyle = '#29333d';
    ctx.lineWidth = 1;
    for (let x = 40; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 160);
      ctx.lineTo(x, 440);
      ctx.stroke();
    }
    for (let y = 160; y < 440; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }
    ctx.restore();
    rect(0, 440, 640, 40, '#04070b');
  }
  return { room };
}
