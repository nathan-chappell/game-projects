import { H, T, tiles, W } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import type { GameState } from '../../game/types.ts';
import type { Npc, Point, Room } from '../../world/types.ts';

interface Dependencies {
  readonly current: () => Room;
  readonly state: GameState;
  readonly npcAt: (x: number, y: number) => Npc | undefined;
  readonly openDialogue: (lines: string[], kind?: string, customSpeaker?: string | null) => void;
  readonly announce: (t: string) => void;
  readonly changeRoom: (
    index: number,
    throughDoor?: boolean,
    preferred?: Point | undefined,
    bossConfirmed?: boolean,
  ) => boolean;
  readonly toast: (t: string) => void;
  readonly storyUI: () => void;
}

export function createFountain(dependencies: Dependencies) {
  const state = dependencies.state;

  function facingFountain() {
    if (dependencies.current().scene !== 'fountain') return false;
    const [dx, dy] = present(
      { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.player.facing],
    );
    for (let distance = 8; distance <= 64; distance += 4) {
      const x = Math.floor((state.player.x + dx * distance) / T),
        y = Math.floor((state.player.y + dy * distance) / T);
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      if (dependencies.npcAt(x, y)) return false;
      if (x >= 7 && x <= 8 && y >= 3 && y <= 4) return true;
      if (tiles[dependencies.current().map[y][x]].solid) return false;
    }
    return false;
  }

  function interactFountain() {
    if (!facingFountain() || !state.story.teamJoined || state.story.dived) return false;
    dependencies.openDialogue(
      [
        '[Kris] * There is something beyond the darkness. A way through.',
        '[Ralsey] * Then this fountain might be a passage between the worlds.',
        '[Susie] * Beats standing around waiting for it to swallow the castle. Come on!',
        '[Kris] * Together.',
        '[Flowey] * Wait. You mean... INTO it?',
      ],
      'fountainDive',
    );
    return true;
  }

  function startFountainDive() {
    state.keys.clear();
    state.player.moving = false;
    state.dive = {
      phase: 'trio',
      age: 0,
      starts: {
        Kris: { x: state.player.x, y: state.player.y },
        Flowey: { x: state.follower.x, y: state.follower.y },
        ...Object.fromEntries(state.companions.map((n) => [n.name, { x: n.x, y: n.y }])),
      },
    };
    dependencies.announce('Ralsey, Susie and Kris jump into the Dark Fountain.');
  }

  function updateDive(dt: number) {
    present(state.dive).age += dt;
    state.player.moving = false;
    if (present(state.dive).phase === 'trio' && present(state.dive).age >= 3.4) {
      present(state.dive).phase = 'hesitate';
      present(state.dive).age = 0;
      dependencies.openDialogue(
        [
          '[Flowey] * (This is a bad idea. This is a REALLY bad idea.)',
          '[Flowey] * ...But I am not staying here alone.',
          '[Flowey] * Wait for me!',
        ],
        'floweyHesitate',
      );
    } else if (present(state.dive).phase === 'flowey' && present(state.dive).age >= 2.3) {
      state.dive = null;
      state.keys.clear();
      const destination = state.project.rooms.findIndex((r) => r.scene === 'darkArrival');
      if (!dependencies.changeRoom(destination, true)) {
        dependencies.toast('The arrival area needs an open floor tile. You can fix it in Build.');
        return;
      }
      state.story.dived = true;
      dependencies.storyUI();
      dependencies.openDialogue(
        [
          '[Narrator] * You arrive in D.G.W.',
          '[Flowey] * ...Everybody here?',
          '[Ralsey] * We made it. Stay together.',
        ],
        'fountainArrival',
      );
    }
  }

  function divePose(name: string) {
    const start = present(state.dive).starts[name];
    if (!start) return null;
    const order = ['Ralsey', 'Susie', 'Kris'];
    if (name !== 'Flowey' && present(state.dive).phase !== 'trio') return null;
    if (name === 'Flowey' && present(state.dive).phase !== 'flowey') return { ...start, scale: 1 };
    const delay = name === 'Flowey' ? 0.1 : 0.15 + order.indexOf(name) * 1.05;
    const t = (present(state.dive).age - delay) / 0.95;
    if (t <= 0) return { ...start, scale: 1 };
    if (t >= 1) return null;
    return {
      x: start.x + (320 - start.x) * t,
      y: start.y + (172 - start.y) * t - Math.sin(t * Math.PI) * 83,
      scale: 1 - (Math.max(0, t - 0.65) / 0.35) * 0.8,
    };
  }

  function openFountainScene() {
    if (!state.story.foundFountain) {
      dependencies.openDialogue(dependencies.current().dialogue, 'fountain');
      return;
    }
    if (state.story.fountainWorse) {
      openBusterAfter();
      return;
    }
    dependencies.openDialogue(
      [
        '[Susie] * Wait. We are not giving up yet. Let me try something stronger.',
        '[Ralsey] * Susie, wait! We do not know how the fountain will react to attack magic!',
        '[Flowey] * That sounds like a very good reason NOT to—',
        '[Susie] * RUDE BUSTER!',
      ],
      'busterWindup',
    );
  }

  function openBusterAfter() {
    dependencies.openDialogue(
      [
        '[Susie] * ...Uh. That was supposed to make it SMALLER.',
        '[Ralsey] * It absorbed your spell! The fountain is turning the attack into more darkness!',
        '[Flowey] * Great. We just FED it.',
        '[Kris] * Everyone, get back. We need another way.',
        '[Susie] * ...Yeah. My bad. No more blasting it.',
        '[Ralsey] * I cannot hold it here anymore. I am coming with you, Kris. We will find a way together.',
        '[Susie] * Count me in. I helped make this mess bigger. I am helping fix it.',
        '[Flowey] * Four of us against two mixed-up worlds. Okay. Stay close.',
      ],
      'busterAfter',
    );
  }

  return {
    facingFountain,
    interactFountain,
    startFountainDive,
    updateDive,
    divePose,
    openFountainScene,
    openBusterAfter,
  };
}
