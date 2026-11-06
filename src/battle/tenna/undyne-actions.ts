import { canPartyAct } from '../shared/availability.ts';
import type { Encounter } from '../shared/types.ts';
export function undynePresent(b: Encounter | null) {
  return b?.kind === 'tenna' && !!b.undyneJoined && !b.undyneLeft;
}
export function rejectUndyneAction(b: Encounter, target: 'act' | 'spare') {
  if (!undynePresent(b) || !canPartyAct(b) || (target === 'act' && b.turn !== 'Kris')) return false;
  b.undyneMenuSpear = { target, age: 0 };
  b.screen = 'menu';
  b.selectedAction = target;
  b.message =
    target === 'act'
      ? 'Undyne spears the Minigame ACT! No games while she is fighting.'
      : 'Undyne spears the SPARE button!';
  return true;
}
export function drawUndyneMenuSpear(ctx: CanvasRenderingContext2D, b: Encounter) {
  const shot = b.undyneMenuSpear;
  if (!shot || !undynePresent(b)) return;
  const target = shot.target === 'spare' ? { x: 279, y: 382 } : { x: 100, y: 415 };
  const progress = Math.min(1, shot.age / 0.3),
    from = { x: 425, y: 150 };
  const x = from.x + (target.x - from.x) * progress,
    y = from.y + (target.y - from.y) * progress;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(target.y - from.y, target.x - from.x));
  ctx.shadowColor = '#59eaff';
  ctx.shadowBlur = 7;
  ctx.fillStyle = '#27cfe3';
  ctx.fillRect(-66, -3, 65, 6);
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-6, -10);
  ctx.lineTo(-6, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e2ffff';
  ctx.fillRect(-60, -1, 54, 2);
  ctx.restore();
  if (progress === 1) {
    ctx.save();
    ctx.strokeStyle = '#b5faff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(target.x - 10, target.y - 14);
    ctx.lineTo(target.x + 3, target.y + 3);
    ctx.lineTo(target.x - 5, target.y + 14);
    ctx.stroke();
    ctx.restore();
  }
}
