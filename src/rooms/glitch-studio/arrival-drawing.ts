import { T } from '../../game/config.ts';
import type { Elements } from '../../game/dom.ts';
import { present } from '../../game/invariants.ts';
import type { Actor, GameState } from '../../game/types.ts';
import type { Npc, Point, Room, Tree } from '../../world/types.ts';
import { objectLayer } from '../../world/validation.ts';

interface Dependencies {
  readonly reducedParticleMotion: MediaQueryList;
  readonly glitchComfortPose: (name: string) => Point;
  readonly state: GameState;
  readonly roomNpcs: () => Npc[];
  readonly drawNpc: (npc: Npc) => void;
  readonly roomTrees: (room?: Room | undefined) => Tree[];
  readonly drawDarkTree: (tree: Tree) => void;
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
  readonly ctx: CanvasRenderingContext2D;
  readonly rect: (x: number, y: number, w: number, h: number, color: string) => void;
  readonly roomWaitingFriends: () => Actor[];
  readonly glitchStrands: { color: string; points: number[][] }[];
  readonly $: Elements;
}

export function createGlitchArrivalDrawing(dependencies: Dependencies) {
  const state = dependencies.state;
  const ctx = dependencies.ctx;

  function drawGlitchComfort(time: number) {
    const t = dependencies.reducedParticleMotion.matches ? 0 : time,
      ralsey = dependencies.glitchComfortPose('Ralsey'),
      susie = dependencies.glitchComfortPose('Susie');
    const reach =
      dependencies.reducedParticleMotion.matches && present(state.glitchComfort).reach > 0
        ? 1
        : present(state.glitchComfort).reach;
    const actors = dependencies
      .roomNpcs()
      .filter((object) => objectLayer(object) === 'normal')
      .map((npc) => ({ y: npc.y * T + 24, draw: () => dependencies.drawNpc(npc) }));
    for (const tree of dependencies.roomTrees().filter((object) => objectLayer(object) === 'normal'))
      actors.push({
        y: tree.y * T + 20,
        draw: () => dependencies.drawDarkTree({ ...tree, x: tree.x * T + 20, y: tree.y * T + 20 }),
      });
    for (const name of ['Kris', 'Flowey', 'Ralsey', 'Susie'] as const) {
      const pose = dependencies.glitchComfortPose(name);
      actors.push({
        y: pose.y,
        draw: () =>
          name === 'Kris'
            ? dependencies.drawPlayer(pose.x, pose.y, t)
            : name === 'Flowey'
              ? dependencies.drawFlowey(pose.x, pose.y, t)
              : dependencies.drawFountainFriend(
                  { name, ...pose, worried: name === 'Ralsey', comforting: name === 'Susie' && reach > 0 },
                  t,
                ),
      });
    }
    actors.sort((a, b) => a.y - b.y).forEach((actor) => actor.draw());
    drawComfortingArm(susie, ralsey, reach);
  }

  function drawComfortingArm(susie: Point, ralsey: Point, reach = 1) {
    if (reach <= 0) return;
    const sx = susie.x + 16,
      sy = susie.y - 31;
    const hx = sx + (ralsey.x - 11 - sx) * reach,
      hy = susie.y - 18 + (ralsey.y - 27 - (susie.y - 18)) * reach;
    ctx.save();
    ctx.strokeStyle = '#b37fc0';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(Math.round((sx + hx) / 2), Math.round(hy + 4));
    ctx.lineTo(hx, hy);
    ctx.stroke();
    dependencies.rect(hx - 6, hy - 2, 4, 6, '#e1bf62');
    dependencies.rect(hx - 2, hy - 3, 7, 7, '#c995cc');
    ctx.restore();
  }

  function drawWaitingFriends(time: number) {
    for (const friend of dependencies.roomWaitingFriends()) dependencies.drawFountainFriend(friend, time);
    if (dependencies.roomWaitingFriends().length)
      drawComfortingArm(present(state.glitchWaiting).Susie, present(state.glitchWaiting).Ralsey);
  }

  function drawGlitchDescent() {
    const age = present(state.holeFall).age,
      phase = age - 1.3,
      still = dependencies.reducedParticleMotion.matches;
    const t = still ? 0 : phase,
      intensity = Math.min(1, phase / 5);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    dependencies.rect(0, 0, 640, 480, '#080910');
    // The real room tears into scrolling strips before dissolving into the void.
    const worldAlpha = Math.max(0, 1 - phase / 4) * 0.6;
    if (present(state.holeFall).worldFrame && worldAlpha > 0) {
      ctx.globalAlpha = worldAlpha;
      for (let i = 0; i < 12; i++) {
        const shift = still ? 0 : Math.round(Math.sin(Math.floor(t * 6) + i * 3.1) * (12 + intensity * 90));
        const y = (((i * 40 - t * 150) % 480) + 480) % 480;
        ctx.drawImage(present(present(state.holeFall).worldFrame), 0, i * 40, 640, 40, shift, y, 640, 40);
      }
    }
    const colors = ['#ff3c59', '#ffe433', '#637bff', '#b6c0d6'];
    for (let i = 0; i < 38; i++) {
      const x = (i * 83 + 17) % 640,
        y = ((((i * 61 - t * (220 + (i % 3) * 45)) % 540) + 540) % 540) - 40;
      ctx.globalAlpha = 0.12 + (i % 4) * 0.05;
      dependencies.rect(x, y, (i % 3) + 1, 20 + (i % 6) * 9, colors[i % 4]);
      if (i % 6 === 0) dependencies.rect(x - 10, y + 12, 25 + (i % 4) * 12, 2, colors[(i + 1) % 4]);
    }
    // Tangled color strands drift upward around the falling party.
    for (let side = 0; side < 2; side++) {
      const cx = 100 + side * 430,
        cy = ((((side * 240 + 390 - t * 80) % 580) + 580) % 580) - 50;
      for (const [i, strand] of dependencies.glitchStrands.entries()) {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = strand.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [j, [px, py]] of strand.points.entries()) {
          const x = cx + px * 0.4 + (still ? 0 : Math.sin(Math.floor(t * 5) + i + j) * 4);
          const y = cy + py * 0.4;
          if (!j) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    present(state.holeFall).actors.forEach((actor, i) => {
      const jitter = still ? 0 : Math.sin(Math.floor(t * 7) + i * 4) * intensity * 5;
      const x = 235 + i * 58 + Math.sin(t * 0.8 + i) * 10 + jitter,
        y = 190 + i * 35 + Math.sin(t * 1.7 + i * 2) * 18;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(still ? 0 : Math.sin(t * 1.4 + i) * 0.1);
      if (actor.name === 'Kris') dependencies.drawPlayer(0, 0, t);
      else if (actor.name === 'Flowey') dependencies.drawFlowey(0, 0, t);
      else dependencies.drawFountainFriend({ name: actor.name, x: 0, y: 0 }, t);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    // Fade into the white destination without a flash back to the CORE.
    if (age > 9) dependencies.rect(0, 0, 640, 480, 'rgba(255,255,255,' + Math.min(1, age - 9) + ')');
    ctx.restore();
    dependencies.$('gameHint').textContent = 'The party keeps falling...';
  }

  return { drawGlitchComfort, drawComfortingArm, drawWaitingFriends, drawGlitchDescent };
}
