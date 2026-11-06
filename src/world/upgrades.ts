import { addPostShowPassage } from '../rooms/post-show/post-show.ts';
import { addBackstageRoom } from '../rooms/backstage/world.ts';
import { addCoreEntrance, addDeeperCore, addFurnaceChamber, addLowerCore } from '../rooms/core/world.ts';
import { addStorageCrossing } from '../rooms/crossing/world.ts';
import {
  addDarkWorldChapter,
  addDarkWorldDescent,
  addDarkWorldGlowPassage,
  addDarkWorldJunction,
  addGoldenDoorHall,
  addJumpIslands,
  addWindingPassage,
  customizeHolePassage,
} from '../rooms/dark-world/world.ts';
import { addEchoChapter } from '../rooms/echo-chamber/world.ts';
import { addFountainChapter } from '../rooms/fountain/world.ts';
import { addGlitchBossRoom, addGlitchStudioRoom, addGlitchWorld } from '../rooms/glitch-studio/world.ts';
import { addCollisionChamber } from '../rooms/monochrome-chamber/world.ts';
import { addQueenRoom } from '../rooms/queen-terminal/world.ts';
import { addNeonRooftop } from '../rooms/rooftop/world.ts';
import { addTennaStorage } from '../rooms/storage/world.ts';
import type { Project } from './types.ts';

// Run room updates in story order. Each update keeps the player's existing Build edits.
export function upgradeProject(project: Project) {
  const updates = [
    addEchoChapter,
    addFountainChapter,
    addDarkWorldChapter,
    addDarkWorldJunction,
    addDarkWorldDescent,
    addDarkWorldGlowPassage,
    customizeHolePassage,
    addJumpIslands,
    addWindingPassage,
    addGoldenDoorHall,
    addFurnaceChamber,
    addCoreEntrance,
    addLowerCore,
    addDeeperCore,
    addGlitchWorld,
    addGlitchBossRoom,
    addGlitchStudioRoom,
    addBackstageRoom,
    addTennaStorage,
    addStorageCrossing,
    addNeonRooftop,
    addQueenRoom,
    addCollisionChamber,
    addPostShowPassage,
  ];
  for (const update of updates) project = update(project);
  return project;
}
