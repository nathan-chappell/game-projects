import { drawKnightActor } from './knight-sprites.ts';
import type { DrawingHelpers } from '../../rendering/types.ts';
import statueURL from '../../../assets/chamber-statue-transparent.png?inline';
import type { GameState } from '../../game/types.ts';
import type { createSprites } from '../../rendering/sprites.ts';
import { drawKnightDuel, drawKnightBattlefield } from './knight-duel-drawing.ts';
import {
  createKnightPath,
  knightPartyPosition,
  knightPathCamera,
  knightPathSettings,
  knightStatuePositions,
} from './knight-path.ts';
import { drawPostShowRoom } from './post-show-drawing.ts';

export function createKnightPathDrawing(
  ctx: CanvasRenderingContext2D,
  sprites: Pick<ReturnType<typeof createSprites>, 'drawPlayer' | 'drawFlowey' | 'drawFountainFriend'>,
  reducedMotion: MediaQueryList,
  pixelText: DrawingHelpers['pixelText'],
) {
  const statue = new Image();
  statue.src = statueURL;
  return function draw(state: GameState, time: number) {
    const path = (state.knightPath ??= createKnightPath(state.player.x, state.player.y));
    if (path.duelAge >= 0) {
      if (state.knightBattle) {
        drawKnightBattlefield(ctx);
        drawKnightActor(ctx, { x: 320, jump: 25, facing: 1, swordAngle: 0.12, lean: 0 }, false);
        drawKnightActor(ctx, { x: 535, jump: 25, facing: -1, swordAngle: 0.12, lean: 0 }, true);
        sprites.drawPlayer(30, 320, time);
        sprites.drawFlowey(80, 320, time);
        sprites.drawFountainFriend({ name: 'Susie', x: 130, y: 320 }, time);
        sprites.drawFountainFriend({ name: 'Ralsey', x: 180, y: 320 }, time);
        pixelText('THREE TEAMS', 208, 92, '#eee6f2', 22);
        state.knightBattle.teams.forEach((team, i) => {
          const x = 12 + i * 210;
          ctx.fillStyle = '#101018';
          ctx.fillRect(x, 390, 196, 65);
          ctx.strokeStyle = i === 0 ? '#a8d7e3' : i === 1 ? '#c3c4cd' : '#e5e9ff';
          ctx.strokeRect(x, 390, 196, 65);
          pixelText(`TEAM ${i + 1}`, x + 12, 411, '#a7a2b9', 11);
          pixelText(team.name, x + 12, 438, '#f3edf5', 12);
        });
        if (state.knightBattle.age < 0.6) {
          ctx.fillStyle = `rgba(0,0,0,${1 - state.knightBattle.age / 0.6})`;
          ctx.fillRect(0, 0, 640, 480);
        }
      } else drawKnightDuel(ctx, path.duelAge, reducedMotion.matches);
      return;
    }
    const camera = knightPathCamera(path),
      reduced = reducedMotion.matches;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 640, 480);
    ctx.save();
    ctx.translate(-camera, 0);
    drawPostShowRoom(ctx, state.project.rooms[state.roomIndex], time, reduced, {
      camera,
      length: knightPathSettings.length,
    });
    for (const x of knightStatuePositions) {
      if (x < camera - 120 || x > camera + 740) continue;
      ctx.fillStyle = '#18171e';
      ctx.fillRect(x - 50, 306, 100, 18);
      ctx.fillStyle = '#37333f';
      ctx.fillRect(x - 42, 300, 84, 7);
      ctx.fillStyle = '#777080';
      ctx.fillRect(x - 36, 298, 72, 2);
      if (statue.complete && statue.naturalWidth) {
        ctx.drawImage(statue, 278, 112, 581, 1074, x - 38, 158, 76, 140);
      }
      const light = ctx.createRadialGradient(x, 280, 5, x, 280, 100);
      light.addColorStop(0, '#a395c118');
      light.addColorStop(1, '#a395c100');
      ctx.fillStyle = light;
      ctx.fillRect(x - 100, 180, 200, 180);
    }

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
