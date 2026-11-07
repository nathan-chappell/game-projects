import { drawKnightSword } from './sword-drawing.ts';
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
    drawKnightSword(ctx, { ...sword, angle: sword.owner === 'roaring' ? 0 : Math.PI }, reduced);
  }
  ctx.restore();
}
