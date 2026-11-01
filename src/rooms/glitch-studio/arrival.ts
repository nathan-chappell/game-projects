import { H, T, W } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import type { GameState } from '../../game/types.ts';
import type { Point, Room } from '../../world/types.ts';

interface Dependencies {
  readonly state: GameState;
  readonly cellOpen: (r: Room, x: number, y: number, avoidFlowey?: boolean) => boolean;
  readonly current: () => Room;
  readonly openDialogue: (lines: string[], kind?: string, customSpeaker?: string | null) => void;
  readonly reducedParticleMotion: MediaQueryList;
  readonly routeToPlayer: (start: Point, target?: Point) => { x: number; y: number }[];
  readonly storyUI: () => void;
}

export function createGlitchArrival(dependencies: Dependencies) {
  const state = dependencies.state;

  function openGlitchArrival() {
    if (state.glitchComfort || state.story.glitchArrivalSeen) return;
    const starts: Record<string, Point> = {
      Kris: { x: state.player.x, y: state.player.y },
      Flowey: { x: state.follower.x, y: state.follower.y },
      ...Object.fromEntries(state.companions.map((member) => [member.name, { x: member.x, y: member.y }])),
    };
    const used = new Set([Math.floor(state.player.x / T) + ',' + Math.floor(state.player.y / T)]);
    const pickSpot = (x: number, y: number, fallback: Point) => {
      const spots = [];
      for (let ty = 0; ty < H; ty++)
        for (let tx = 0; tx < W; tx++)
          if (dependencies.cellOpen(dependencies.current(), tx, ty, false) && !used.has(tx + ',' + ty))
            spots.push({ x: tx * T + 20, y: ty * T + 20, tx, ty });
      spots.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
      const spot = spots[0];
      if (!spot) return fallback;
      used.add(spot.tx + ',' + spot.ty);
      return { x: spot.x, y: spot.y };
    };
    const ralsey = pickSpot(state.player.x - 80, state.player.y, starts.Ralsey || state.player);
    const susie = pickSpot(ralsey.x - 40, ralsey.y, starts.Susie || ralsey);
    const flowey = pickSpot(state.player.x + 40, state.player.y, starts.Flowey);
    state.glitchComfort = {
      roomIndex: state.roomIndex,
      age: 0,
      reach: 0,
      aside: 0,
      starts,
      targets: { Kris: starts.Kris, Ralsey: ralsey, Susie: susie, Flowey: flowey },
    };
    dependencies.openDialogue(
      [
        "[Ralsey] * Susie... I'm worried we're not going to make it.",
        "[Susie] * Hey, don't say that. We've made it this far together.",
        "[Susie] * We'll find a way out. I've got you, okay?",
        "[Flowey] * Kris... let's continue without them.",
      ],
      'glitchArrival',
    );
  }

  function updateGlitchComfort(dt: number) {
    present(state.glitchComfort).age += dt;
    if ((state.dialogue?.index ?? -1) >= 1)
      present(state.glitchComfort).reach = Math.min(1, present(state.glitchComfort).reach + dt / 0.65);
    if ((state.dialogue?.index ?? -1) >= 3)
      present(state.glitchComfort).aside = Math.min(1, present(state.glitchComfort).aside + dt / 0.7);
  }

  function glitchComfortPose(name: string) {
    const start = present(state.glitchComfort).starts[name] || present(state.glitchComfort).targets[name],
      target = present(state.glitchComfort).targets[name];
    const progress =
      name === 'Flowey'
        ? present(state.glitchComfort).aside
        : Math.min(1, present(state.glitchComfort).age / 0.65);
    const t =
      dependencies.reducedParticleMotion.matches && progress > 0
        ? 1
        : progress * progress * (3 - 2 * progress);
    return { x: start.x + (target.x - start.x) * t, y: start.y + (target.y - start.y) * t };
  }

  function finishGlitchComfort() {
    if (!state.glitchComfort) return;
    state.story.glitchArrivalSeen = true;
    state.glitchWaiting = {
      Ralsey: { ...state.glitchComfort.targets.Ralsey },
      Susie: { ...state.glitchComfort.targets.Susie },
    };
    if (state.glitchComfort.roomIndex === state.roomIndex && state.mode === 'play') {
      Object.assign(state.follower, glitchComfortPose('Flowey'));
      state.follower.trail = dependencies.routeToPlayer(state.follower);
    }
    state.companions = [];
    state.glitchComfort = null;
    dependencies.storyUI();
  }

  return { openGlitchArrival, updateGlitchComfort, glitchComfortPose, finishGlitchComfort };
}
