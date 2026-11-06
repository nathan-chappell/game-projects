import type { Room } from '../../world/types.ts';

export function drawPostShowRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  time: number,
  reducedMotion: boolean,
) {
  const t = reducedMotion ? 0 : time;
  const open = (x: number, y: number) => room.map[y]?.[x] !== undefined && [0, 6].includes(room.map[y][x]);
  ctx.save();
  // Soft, broken shadows hug the path; the surrounding void remains completely black.
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 16; x++) {
      if (!open(x, y)) continue;
      const grey = x >= 7;
      ctx.fillStyle = grey ? '#dedee2' : y < 5 && x <= 2 ? '#b67b56' : '#ffa979';
      ctx.fillRect(x * 40, y * 40, 40, 40);
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        if (open(x + dx, y + dy)) continue;
        for (let step = 0; step < 40; step += 4) {
          const seed = (dx ? y * 40 + step : x * 40 + step) * 0.09 + dx * 3 + dy * 5;
          const ripple = Math.sin(seed + t * 1.4);
          const depth = Math.round(5 + (ripple + 1) * (grey ? 5 : 2));
          // Dim echoes dissolve into the void, rather than forming a solid outer wall.
          for (const distance of [6, 12, 20]) {
            const drift = Math.round(distance + ripple * 4);
            ctx.globalAlpha = (grey ? 0.11 : 0.055) * (1 - distance / 25);
            ctx.fillStyle = grey ? '#a0a0af' : '#ae7c63';
            ctx.fillRect(
              x * 40 + (dx === 1 ? 40 + drift : dx === -1 ? -drift - 4 : step),
              y * 40 + (dy === 1 ? 40 + drift : dy === -1 ? -drift - 4 : step),
              4,
              4,
            );
          }
          ctx.fillStyle = grey ? '#64646f' : '#845642';
          const px = x * 40 + (dx === 1 ? 40 - depth : dx === -1 ? 0 : step);
          const py = y * 40 + (dy === 1 ? 40 - depth : dy === -1 ? 0 : step);
          ctx.globalAlpha = 0.55;
          ctx.fillRect(px, py, dx ? depth : 4, dy ? depth : 4);
          ctx.globalAlpha = 0.65;
          ctx.fillStyle = '#000000';
          ctx.fillRect(
            dx === 1 ? (x + 1) * 40 - 2 : px,
            dy === 1 ? (y + 1) * 40 - 2 : py,
            dx ? 2 : 4,
            dy ? 2 : 4,
          );
          ctx.globalAlpha = 1;
        }
      }
      if (grey) {
        // Low-contrast drifting grain gives the grey stretch the reference's wavering texture.
        for (let i = 0; i < 5; i++) {
          ctx.globalAlpha = 0.07 + 0.04 * Math.sin(t + x + i);
          ctx.fillStyle = '#31313e';
          ctx.fillRect(x * 40 + ((i * 17 + y * 11) % 35), y * 40 + ((i * 13 + x * 7) % 36), 5, 3);
        }
        ctx.globalAlpha = 1;
      }
    }
  ctx.fillStyle = '#634530';
  ctx.fillRect(45, 41, 30, 7);
  ctx.fillStyle = '#281a14';
  ctx.fillRect(50, 40, 20, 4);
  ctx.restore();
}
