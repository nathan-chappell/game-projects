import type { GameState } from '../../game/types.ts';
import type { createSprites } from '../../rendering/sprites.ts';
import { drawKnightDuel, drawRoaringStatue } from './knight-duel-drawing.ts';
import {
  createKnightPath,
  knightDuelPose,
  knightPartyPosition,
  knightPathCamera,
  knightPathSettings,
} from './knight-path.ts';
import { drawPostShowRoom } from './post-show-drawing.ts';

export function createKnightPathDrawing(
  ctx: CanvasRenderingContext2D,
  sprites: Pick<ReturnType<typeof createSprites>, 'drawPlayer' | 'drawFlowey' | 'drawFountainFriend'>,
  reducedMotion: MediaQueryList,
) {
  const statue = document.createElement('canvas');
  statue.width = 128;
  statue.height = 180;
  const stone = statue.getContext('2d');
  let statueReady = false;
  return function draw(state: GameState, time: number) {
    const path = (state.knightPath ??= createKnightPath(state.player.x, state.player.y));
    const camera = knightPathCamera(path),
      reduced = reducedMotion.matches;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 640, 480);
    ctx.save();
    if (!reduced && path.duelAge >= 0) {
      const impact = knightDuelPose(path.duelAge).clash;
      ctx.translate(Math.round(Math.sin(time * 67) * impact * 2), Math.round(Math.cos(time * 83) * impact));
    }
    ctx.translate(-camera, 0);
    drawPostShowRoom(ctx, state.project.rooms[state.roomIndex], time, reduced, {
      camera,
      length: knightPathSettings.length,
    });
    for (let x = 860; x <= 2860; x += 400) {
      if (x < camera - 120 || x > camera + 740) continue;
      ctx.fillStyle = '#18171e';
      ctx.fillRect(x - 50, 306, 100, 18);
      ctx.fillStyle = '#37333f';
      ctx.fillRect(x - 42, 300, 84, 7);
      ctx.fillStyle = '#777080';
      ctx.fillRect(x - 36, 298, 72, 2);
      if (!statueReady && stone) {
        stone.clearRect(0, 0, 128, 180);
        statueReady = drawRoaringStatue(stone, 64, 170);
      }
      if (statueReady) ctx.drawImage(statue, x - 64, 125);
      const light = ctx.createRadialGradient(x, 280, 5, x, 280, 100);
      light.addColorStop(0, '#a395c118');
      light.addColorStop(1, '#a395c100');
      ctx.fillStyle = light;
      ctx.fillRect(x - 100, 180, 200, 180);
    }
    if (path.duelAge >= 0) drawKnightDuel(ctx, path.duelAge, reduced);
    for (const [name, gap] of [
      ['Susie', 125],
      ['Ralsey', 84],
      ['Flowey', 43],
      ['Kris', 0],
    ] as const) {
      const p = knightPartyPosition(path, gap);
      if (name === 'Kris') sprites.drawPlayer(p.x, p.y, time);
      else if (name === 'Flowey') sprites.drawFlowey(p.x, p.y, time);
      else sprites.drawFountainFriend({ name, x: p.x, y: p.y }, time);
    }
    ctx.restore();
    if (state.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, state.fade / 0.32)})`;
      ctx.fillRect(0, 0, 640, 480);
    }
  };
}
