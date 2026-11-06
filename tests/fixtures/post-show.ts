import type { Project } from '../../src/world/types.ts';

/** Reconstruct the world before the post-Finale extension for older-build migration tests. */
export function removePostShowFixture(project: Project) {
  const passage = project.rooms.findIndex((room) => room.scene === 'postShowPassage');
  if (passage < 0) return project;
  if (passage !== project.rooms.length - 1) throw new Error('Post-show fixture must be the last room');
  for (const room of project.rooms) {
    for (const [cell, target] of Object.entries(room.doorLinks ?? {})) {
      if (target !== passage) continue;
      const [x, y] = cell.split(',').map(Number);
      delete room.doorLinks![cell];
      room.map[y][x] = 0;
    }
    delete room.postShowExitVersion;
  }
  project.rooms.pop();
  return project;
}
