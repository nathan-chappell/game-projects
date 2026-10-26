// Retained decorative soul and snowflake preview. These were drawings, not attack patterns.
// Nothing imports this module; future attacks can reuse these shapes.
export function createUnusedBattleEffects(ctx, rect) {
  function drawBattleHeart(cx, cy, scale = 2) {
    const rows = ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000'];
    for (let y = 0; y < rows.length; y++)
      for (let x = 0; x < rows[y].length; x++)
        if (rows[y][x] === '1') rect(cx + (x - 4) * scale, cy + (y - 3) * scale, scale, scale, '#ff163b');
  }

  function drawSnowflake(x, y, radius) {
    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    for (const [color, width] of [
      ['#e8fcff', 4],
      ['#35b9fa', 2],
    ]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3,
          dx = Math.cos(angle),
          dy = Math.sin(angle);
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx * radius, y + dy * radius);
        for (const side of [-1, 1]) {
          const branch = angle + side * 2.25;
          ctx.moveTo(x + dx * radius * 0.62, y + dy * radius * 0.62);
          ctx.lineTo(
            x + dx * radius * 0.62 + Math.cos(branch) * radius * 0.35,
            y + dy * radius * 0.62 + Math.sin(branch) * radius * 0.35,
          );
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  return { drawBattleHeart, drawSnowflake };
}
