import type { DrawingHelpers } from '../../rendering/types.ts';
import type { Room } from '../../world/types.ts';
export function createBackstageDrawing(
  ctx: CanvasRenderingContext2D,
  { rect }: Pick<DrawingHelpers, 'rect'>,
) {
  const wing = ctx.createLinearGradient(0, 0, 0, 210);
  wing.addColorStop(0, '#a86232');
  wing.addColorStop(1, '#bc773e');
  const poly = (points: number[][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  function star(cx: number, cy: number, radius: number, color: string) {
    const points = Array.from({ length: 10 }, (_, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5,
        r = i % 2 ? radius * 0.43 : radius;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    });
    poly(points, color);
  }
  function room(room: Room) {
    rect(0, 0, 640, 200, '#030303');
    for (const x of [0, 520]) {
      ctx.fillStyle = wing;
      ctx.fillRect(x, 0, 120, 200);
      rect(x, 0, 18, 200, '#945329');
      rect(x + 93, 0, 17, 200, '#8a4b27');
      rect(x + 111, 0, 9, 200, '#532f1e');
      poly(
        [
          [x + 23, 0],
          [x + 81, 0],
          [x + 88, 194],
          [x + 16, 200],
        ],
        '#b56e38',
      );
      star(x + 59, 117, 40, '#9b5c2e');
      star(x + 56, 111, 37, '#74421f');
      poly(
        [
          [x + 56, 74],
          [x + 56, 111],
          [x + 20, 123],
          [x + 41, 103],
        ],
        '#62391f',
      );
      rect(x + 17, 0, 83, 3, '#d79a58');
    }
    rect(111, 0, 9, 200, '#3f261a');
    rect(520, 0, 9, 200, '#4d2d1b');
    rect(120, 194, 400, 6, '#17100c');
    // Warm, dark planks remain clipped to traversable floor tiles.
    ctx.save();
    ctx.beginPath();
    for (let y = 5; y < 11; y++)
      for (let x = 0; x < 16; x++)
        if ([0, 2, 3, 5, 6].includes(room.map[y][x])) ctx.rect(x * 40, y * 40, 40, 40);
    ctx.clip();
    ctx.strokeStyle = '#37200f';
    ctx.lineWidth = 2;
    for (let end = -240; end <= 880; end += 65) {
      ctx.beginPath();
      ctx.moveTo(320 + (end - 320) * 0.65, 200);
      ctx.lineTo(end, 440);
      ctx.stroke();
    }
    ctx.strokeStyle = '#633c20';
    ctx.lineWidth = 1;
    for (const y of [226, 272, 334, 413]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }
    for (let i = 0; i < 30; i++) rect(45 + ((i * 83) % 550), 214 + ((i * 47) % 212), 2, 7, '#623c23');
    ctx.restore();
    // The small raised board behind the host, as seen in the reference.
    rect(279, 210, 94, 12, '#2a1b13');
    rect(283, 209, 86, 3, '#a29b81');
    rect(269, 220, 115, 13, '#352218');
    rect(273, 220, 107, 3, '#805137');
    rect(0, 440, 640, 40, '#21140c');
  }
  return { room };
}
