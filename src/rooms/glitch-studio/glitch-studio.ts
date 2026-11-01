import type { Room } from '../../world/types.ts';
export const glitchStudioScene = 'glitchStudio';

export const studioConversation = [
  { speaker: 'Flowey', text: 'Uh... what is this place? Why is there a giant scoreboard?' },
  { speaker: 'Susie', text: "A TV studio. Pretty sure this is one of the sets for Tenna's show." },
  { speaker: 'Flowey', text: 'Tenna?' },
  { speaker: 'Susie', text: 'Big TV-headed guy. Loud suit. Even louder mouth. He runs a game show.' },
  {
    speaker: 'Susie',
    text: 'Games, challenges, points... cameras everywhere. He tries to make everything part of his show.',
  },
  { speaker: 'Flowey', text: 'And the numbers going crazy? Is that part of the show, too?' },
  {
    speaker: 'Susie',
    text: "No. This place wasn't falling apart like this before. Something's messing with the signal.",
  },
  { speaker: 'Susie', text: "Stick close. We're finding a way out, not playing his games." },
];

export function createStudioRoom(returnRoom: number): Room {
  const map: number[][] = Array.from({ length: 12 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => (y >= 5 && y <= 10 && x >= 1 && x <= 14 ? 0 : 1)),
  );
  map[8][0] = 6;
  return {
    name: 'Glitch Studio — Scoreboard',
    scene: glitchStudioScene,
    theme: 'dark',
    map,
    spawn: { x: 3, y: 8 },
    flowey: { x: 2, y: 8 },
    npcs: [],
    trees: [],
    spikes: [],
    glitchPoints: [],
    dialogue: [],
    savePoints: [{ x: 13, y: 9 }],
    target: returnRoom,
    doorLinks: { '0,8': returnRoom },
  };
}

// Refresh at a fixed pace instead of drawing new random numbers every frame.
export function createScoreboard(random = Math.random) {
  let tick: number | null = null,
    values: number[] = [];
  return (time: number, reducedMotion = false) => {
    const next = Math.floor(time / (reducedMotion ? 1.5 : 0.3));
    if (next !== tick) {
      tick = next;
      values = [1 + Math.min(998, Math.floor(random() * 999))];
    }
    return values;
  };
}
