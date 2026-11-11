import { T, tiles } from '../../game/config.ts';
import type { GameState } from '../../game/types.ts';
import { createVesselEncounter, vesselAppearanceSeconds } from './entrance.ts';
import { mysteriousVoidScene } from '../../rooms/mysterious-void/room.ts';

export function vesselTeleporterPosition(state: GameState) {
  if (state.roomIndex !== 0) return null;
  const room = state.project.rooms[0];
  for (const [dx, dy] of [
    [3, 0],
    [2, 1],
    [-3, 0],
    [0, 3],
  ]) {
    const tx = room.spawn.x + dx,
      ty = room.spawn.y + dy;
    const tile = tiles.find((tile) => tile.id === room.map[ty]?.[tx]);
    if (tile && !tile.solid && tile.id !== 6) return { x: tx * T + T / 2, y: ty * T + T / 2 };
  }
  return null;
}
export function teleportToVesselBattle(state: GameState, enterRoom: (index: number) => boolean) {
  if (
    state.mode !== 'play' ||
    state.bossEncounter ||
    state.knightBattle ||
    state.dialogue ||
    state.death ||
    state.holeFall ||
    state.padJump ||
    state.dive ||
    state.buster ||
    state.tennaEntrance ||
    state.collisionBlackout ||
    state.vesselArrival?.phase === 'appear' ||
    state.story.emerging >= 0 ||
    state.story.discussion >= 0 ||
    (state.knightPath?.duelAge ?? -1) >= 0
  )
    return false;
  const index = state.project.rooms.findIndex((room) => room.scene === mysteriousVoidScene);
  if (index < 0 || !enterRoom(index)) return false;
  state.vesselArrival = { phase: 'battle', age: vesselAppearanceSeconds };
  state.bossEncounter = createVesselEncounter();
  state.keys.clear();
  state.player.moving = false;
  return true;
}
export function drawVesselTeleporter(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const p = vesselTeleporterPosition(state);
  if (!p) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 34);
  glow.addColorStop(0, '#dddddd88');
  glow.addColorStop(1, '#aaaaaa00');
  ctx.fillStyle = glow;
  ctx.fillRect(-34, -40, 68, 68);
  ctx.fillStyle = '#202020';
  ctx.strokeStyle = '#d6d6d6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 1, 24, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -15, 16, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const y = -((time * 14 + i * 11) % 43);
    ctx.fillStyle = i % 2 ? '#ffffff' : '#aaaaaa';
    ctx.fillRect(i % 2 ? 8 : -10, y, 3, 3);
  }
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VESSEL FIGHT', 0, -47);
  ctx.restore();
}
