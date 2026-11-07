import { knightSwordWarning, type KnightSwordAttack } from './swords.ts';

export function drawKnightSwords(ctx: CanvasRenderingContext2D, attack: KnightSwordAttack, reduced: boolean) {
  ctx.save();
  for (const y of knightSwordWarning(attack)) {
    ctx.strokeStyle = '#cf9f6d66';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.moveTo(attack.arena.x, y);
    ctx.lineTo(attack.arena.x + attack.arena.size, y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const x of [attack.arena.x - 10, attack.arena.x + attack.arena.size + 10]) {
      ctx.fillStyle = '#eac58e';
      ctx.fillRect(x - 2, y - 4, 4, 8);
    }
  }
  for (const sword of attack.swords) {
    if (sword.hitOpponent) continue;
    const black = sword.owner === 'roaring',
      direction = black ? 1 : -1;
    ctx.save();
    ctx.translate(Math.round(sword.x), Math.round(sword.y));
    ctx.scale(direction, 1);
    if (!reduced) {
      ctx.strokeStyle = black ? '#bcb4d44d' : '#ffffff66';
      ctx.lineWidth = 2;
      for (const y of [-5, 5]) {
        ctx.beginPath();
        ctx.moveTo(-42, y);
        ctx.lineTo(-70, y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = black ? '#08060b' : '#ffffff';
    ctx.strokeStyle = black ? '#c2bad4' : '#272335';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(35, 0);
    ctx.lineTo(20, -5);
    ctx.lineTo(-14, -5);
    ctx.lineTo(-14, -16);
    ctx.lineTo(-21, -16);
    ctx.lineTo(-21, -3);
    ctx.lineTo(-39, -3);
    ctx.lineTo(-39, 3);
    ctx.lineTo(-21, 3);
    ctx.lineTo(-21, 16);
    ctx.lineTo(-14, 16);
    ctx.lineTo(-14, 5);
    ctx.lineTo(20, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
