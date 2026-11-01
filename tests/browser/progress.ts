import type { Page } from '@playwright/test';
import { progressKey, T } from '../../src/game/config.ts';
import { createGameState } from '../../src/game/state.ts';
import type { Inventory } from '../../src/inventory/types.ts';
import { validProgress } from '../../src/persistence/progress.ts';
import type { ProgressSave } from '../../src/persistence/types.ts';
import { defaults } from '../../src/rooms/castle/starter.ts';
import { upgradeProject } from '../../src/world/upgrades.ts';

export async function seedProgress(
  page: Page,
  scene: string,
  flags: Partial<ProgressSave['story']> = {},
  position?: { x: number; y: number; facing?: string },
  items?: Partial<Inventory['items']>,
) {
  const project = upgradeProject(defaults());
  const roomIndex = project.rooms.findIndex((room) => room.scene === scene);
  if (roomIndex < 0) throw new Error(`Missing test scene ${scene}`);
  const state = createGameState(project);
  const room = project.rooms[roomIndex];
  const slot: ProgressSave = {
    version: 1,
    savedAt: 100,
    project,
    roomIndex,
    player: {
      x: position?.x ?? room.spawn.x * T + 20,
      y: position?.y ?? room.spawn.y * T + 20,
      facing: position?.facing ?? 'down',
    },
    story: {
      ...state.story,
      met: true,
      joined: true,
      explained: true,
      foundFountain: true,
      fountainWorse: true,
      teamJoined: true,
      dived: true,
      goldenDoorExplained: true,
      coreExplained: true,
      coreFroggitWarned: true,
      coreGlitchNoticed: true,
      glitchArrivalSeen: true,
      noelleGone: true,
      noelleEscaped: true,
      studioExplained: true,
      tennaInvited: true,
      tennaStorageInvited: true,
      tennaElixirsReceived: true,
      collisionSeen: true,
      darkBattleSeen: true,
      jackRevealed: true,
      jackCandyReceived: true,
      tennaFinaleExplained: true,
      queenBriefed: true,
      queenDemoSeen: true,
      queenSolved: true,
      ...flags,
    },
    partyHP: state.partyHP,
    inventory: { items: { ...state.inventory.items, ...items } },
  };
  if (!validProgress(slot)) throw new Error('Invalid browser progress fixture');
  await page.addInitScript(
    ({ key, slot }) => {
      localStorage.setItem(key, JSON.stringify([slot, null, null]));
    },
    { key: progressKey, slot },
  );
  return slot;
}
