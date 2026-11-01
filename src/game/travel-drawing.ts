import type { Point } from '../world/types.ts';
import { T } from './config.ts';
import { present } from './invariants.ts';
import type { GameState } from './types.ts';

interface Dependencies {
  readonly state: GameState;
  readonly reducedParticleMotion: MediaQueryList;
  readonly ctx: CanvasRenderingContext2D;
  readonly drawPlayer: (x: number, y: number, time: number) => void;
  readonly drawFlowey: (x: number, y: number, time: number, lookRight?: boolean) => void;
  readonly drawFountainFriend: (
    n: Point & {
      name: string;
      worried?: boolean | undefined;
      comforting?: boolean | undefined;
      lookRight?: boolean | undefined;
      hideName?: boolean | undefined;
    },
    time: number,
  ) => void;
}

export function createTravelDrawing(dependencies: Dependencies) {
  const state = dependencies.state;
  const ctx = dependencies.ctx;

  function drawPadJump(time: number) {
    const target = { x: present(state.padJump).launchX * T + 20, y: present(state.padJump).launchY * T + 20 };
    for (const [i, actor] of present(state.padJump).actors.entries()) {
      const t = Math.max(0, Math.min(1, (present(state.padJump).age - i * 0.12) / 0.9));
      const arc = dependencies.reducedParticleMotion.matches
        ? 0
        : Math.sin(Math.PI * t) * (present(state.padJump).targetRoom !== state.roomIndex ? 105 : 70);
      ctx.save();
      ctx.translate(actor.x + (target.x - actor.x) * t, actor.y + (target.y - actor.y) * t - arc);
      if (present(state.padJump).targetRoom !== state.roomIndex) ctx.globalAlpha = Math.min(1, (1 - t) * 5);
      if (actor.name === 'Kris') dependencies.drawPlayer(0, 0, time);
      else if (actor.name === 'Flowey') dependencies.drawFlowey(0, 0, time);
      else dependencies.drawFountainFriend({ name: actor.name, x: 0, y: 0 }, time);
      ctx.restore();
    }
  }

  function drawHoleFall(time: number) {
    present(state.holeFall).actors.forEach((actor, index) => {
      const t = Math.max(0, Math.min(1, (present(state.holeFall).age - index * 0.16) / 0.9));
      if (t >= 1) return;
      if (present(state.holeFall).kind === 'core' || present(state.holeFall).kind === 'glitch') {
        const converge = Math.min(1, t * 3),
          sink = dependencies.reducedParticleMotion.matches ? 0 : t * t * 100;
        ctx.save();
        if (t > 0.35) {
          ctx.beginPath();
          ctx.rect(0, 0, 640, present(present(state.holeFall).y) + 18);
          ctx.clip();
        }
        ctx.translate(
          actor.x + (present(present(state.holeFall).x) - actor.x) * converge,
          actor.y + (present(present(state.holeFall).y) - actor.y) * converge + sink,
        );
        ctx.globalAlpha = 1 - Math.max(0, (t - 0.5) * 2);
        if (actor.name === 'Kris') dependencies.drawPlayer(0, 0, time);
        else if (actor.name === 'Flowey') dependencies.drawFlowey(0, 0, time);
        else dependencies.drawFountainFriend({ name: actor.name, x: 0, y: 0 }, time);
        ctx.restore();
        return;
      }
      const scale = 1 - Math.max(0, (t - 0.6) / 0.4) * 0.98;
      const arc = dependencies.reducedParticleMotion.matches ? 0 : Math.sin(t * Math.PI) * 58;
      const x = actor.x + (420 - actor.x) * t;
      const y = actor.y + (140 - actor.y) * t - arc;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      if (actor.name === 'Kris') dependencies.drawPlayer(0, 0, time);
      else if (actor.name === 'Flowey') dependencies.drawFlowey(0, 0, time);
      else dependencies.drawFountainFriend({ name: actor.name, x: 0, y: 0 }, time);
      ctx.restore();
    });
  }

  function drawCoreCollapse() {
    if (!['core', 'glitch'].includes(state.holeFall?.kind ?? '')) return;
    const { x = 0, y = 0, age } = present(state.holeFall),
      radius = dependencies.reducedParticleMotion.matches ? 38 : 14 + Math.min(1, age / 0.35) * 24;
    ctx.save();
    ctx.strokeStyle = '#91b4c4';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#05060c';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6,
        r = radius + (i % 2 ? 4 : -3);
      const px = x + Math.cos(angle) * r,
        py = y + Math.sin(angle) * r * 0.55;
      if (!i) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#202638';
    ctx.beginPath();
    for (const direction of [-1, 1]) {
      ctx.moveTo(x + direction * radius, y);
      ctx.lineTo(x + direction * (radius + 14), y - 8);
      ctx.lineTo(x + direction * (radius + 27), y - 3);
    }
    ctx.stroke();
    ctx.restore();
  }

  return { drawPadJump, drawHoleFall, drawCoreCollapse };
}
