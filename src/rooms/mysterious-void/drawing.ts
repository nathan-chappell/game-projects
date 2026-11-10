/** The reference's pale landing platform and floating gray diamonds in a black void. */
export function drawMysteriousVoid(ctx: CanvasRenderingContext2D, time: number, reduced: boolean) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 640, 480);
  const diamonds = [
    [64, 73, 44, 44],
    [324, 73, 28, 73],
    [508, 86, 60, 30],
    [38, 218, 17, 26],
    [588, 305, 34, 75],
    [96, 398, 32, 66],
    [272, 444, 36, 42],
    [370, 440, 14, 39],
    [468, 428, 24, 15],
  ];
  ctx.fillStyle = '#808080';
  for (const [x, y, width, height] of diamonds) {
    const bob = reduced ? 0 : Math.sin(time * 0.45 + x) * 2;
    ctx.beginPath();
    ctx.moveTo(x, y - height + bob);
    ctx.lineTo(x + width, y + bob);
    ctx.lineTo(x, y + height + bob);
    ctx.lineTo(x - width, y + bob);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(160, 200, 360, 160);
}
