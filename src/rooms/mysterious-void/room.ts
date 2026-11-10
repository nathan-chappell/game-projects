import type { Project, Room } from '../../world/types.ts';

export const mysteriousVoidScene = 'mysteriousVoid';
export function createMysteriousVoid(): Room {
  return {
    name: 'Mysterious Room',
    scene: mysteriousVoidScene,
    theme: 'dark',
    backgroundColor: '#000000',
    map: Array.from({ length: 12 }, (_, y) =>
      Array.from({ length: 16 }, (_, x) => (x >= 4 && x <= 12 && y >= 5 && y <= 8 ? 0 : 1)),
    ),
    spawn: { x: 4, y: 6 },
    flowey: { x: 5, y: 6 },
    target: -1,
    npcs: [],
    trees: [],
    spikes: [],
    savePoints: [],
    glitchPoints: [],
    dialogue: [],
  };
}
export function addMysteriousVoid(project: Project) {
  if (!project.rooms.some((room) => room.scene === mysteriousVoidScene) && project.rooms.length < 28)
    project.rooms.push(createMysteriousVoid());
  return project;
}
