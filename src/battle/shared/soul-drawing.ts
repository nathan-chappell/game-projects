import type { Point } from '../../world/types.ts';

export function drawPixelSoul(ctx: CanvasRenderingContext2D, soul: Point, color = '#ff0000') {
  const rows = ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000'];
  const left = Math.round(soul.x - 12),
    top = Math.round(soul.y - 10.5);
  ctx.fillStyle = color;
  for (let row = 0; row < rows.length; row++)
    for (let col = 0; col < rows[row].length; col++)
      if (rows[row][col] === '1') ctx.fillRect(left + col * 3, top + row * 3, 3, 3);
}
