import type { Room } from '../../world/types.ts';
export const rooftopScene = 'neonRooftop';

export function createRooftopRoom(crossingIndex: number): Room {
  const map: number[][] = Array.from({ length: 12 }, (_, y) => Array(16).fill(y === 8 || y === 9 ? 0 : 1));
  map[9][0] = 6;
  return {
    name: 'Neon Rooftops',
    scene: rooftopScene,
    theme: 'dark',
    map,
    spawn: { x: 2, y: 9 },
    flowey: { x: 1, y: 9 },
    target: crossingIndex,
    doorLinks: { '0,9': crossingIndex },
    npcs: [],
    trees: [],
    spikes: [],
    savePoints: [],
    glitchPoints: [],
    dialogue: [],
  };
}
