import {
  freshInventory,
  H,
  itemDefinitions,
  maxHP,
  partyNames,
  progressFlags,
  progressKey,
  W,
} from '../game/config.ts';
import { validTreeHarvests } from '../inventory/tree-items.ts';
import type { Inventory, LegacyInventory, SavedInventory } from '../inventory/types.ts';
import { hallwaySettings } from '../rooms/storage/storage-travel.ts';
import { clone } from '../world/clone.ts';
import { finite, integer, record, validProject } from '../world/validation.ts';
import type { ProgressSave } from './types.ts';

export function normalizeInventory(saved?: SavedInventory | LegacyInventory): Inventory {
  // Legacy candy totals already include items carried by individual teammates.
  return {
    items: {
      ...freshInventory().items,
      ...(saved?.items ? clone(saved.items) : { gCandy: saved?.gCandy ?? 0 }),
    },
  };
}
export function validInventory(value: unknown): value is SavedInventory | LegacyInventory {
  if (!record(value)) return false;
  if (value.items !== undefined)
    return (
      record(value.items) &&
      Object.entries(value.items).every(
        ([id, count]) => Object.hasOwn(itemDefinitions, id) && integer(count) && count >= 0 && count <= 23040,
      )
    );
  return (
    integer(value.gCandy) &&
    value.gCandy >= 0 &&
    value.gCandy <= 23040 &&
    (value.heldCandy === undefined ||
      (record(value.heldCandy) &&
        partyNames.every((name) => {
          const count = value.heldCandy && record(value.heldCandy) ? value.heldCandy[name] : undefined;
          return integer(count) && count >= 0;
        }) &&
        partyNames.reduce(
          (sum, name) =>
            sum +
            (record(value.heldCandy) && typeof value.heldCandy[name] === 'number'
              ? value.heldCandy[name]
              : 0),
          0,
        ) === value.gCandy))
  );
}
function validCandyProgress(slot: Record<string, unknown>) {
  return (
    (slot.partyHP === undefined ||
      (record(slot.partyHP) &&
        partyNames.every((name) => {
          const hp = record(slot.partyHP) ? slot.partyHP[name] : undefined;
          return integer(hp) && hp >= 0 && hp <= maxHP;
        }))) &&
    (slot.hp === undefined || (integer(slot.hp) && slot.hp >= 0 && slot.hp <= maxHP)) &&
    (slot.inventory === undefined || validInventory(slot.inventory)) &&
    validTreeHarvests(slot.treeHarvests)
  );
}
function validGlitchWaiting(waiting: unknown) {
  return (
    waiting === undefined ||
    waiting === null ||
    (record(waiting) &&
      ['Ralsey', 'Susie'].every((name) => {
        const point = waiting[name];
        return (
          record(point) &&
          finite(point.x) &&
          point.x >= 0 &&
          point.x < 640 &&
          finite(point.y) &&
          point.y >= 0 &&
          point.y < 480
        );
      }))
  );
}
export function validProgress(slot: unknown): slot is ProgressSave {
  if (!record(slot)) return false;
  const optionalFlags = [
    'noelleGone',
    'noelleEscaped',
    'studioExplained',
    'tennaInvited',
    'tennaStorageInvited',
    'tennaElixirsReceived',
    'tennaFinaleExplained',
    'tennaFinaleComplete',
    'jackCandyReceived',
    'jackRevealed',
    'darkBattleSeen',
    'collisionSeen',
    'queenDemoSeen',
    'queenSolved',
    'queenBriefed',
    'glitchArrivalSeen',
    'coreGlitchNoticed',
    'coreFroggitWarned',
    'coreExplained',
    'goldenDoorExplained',
  ];
  return (
    validGlitchWaiting(slot.glitchWaiting) &&
    (slot.savePoint === undefined ||
      (record(slot.savePoint) &&
        integer(slot.savePoint.x) &&
        slot.savePoint.x >= 0 &&
        slot.savePoint.x < W &&
        integer(slot.savePoint.y) &&
        slot.savePoint.y >= 0 &&
        slot.savePoint.y < H)) &&
    validCandyProgress(slot) &&
    (slot.hallwayX === undefined ||
      (finite(slot.hallwayX) && slot.hallwayX >= 0 && slot.hallwayX <= hallwaySettings.length)) &&
    (slot.trafficCheckpoint === undefined ||
      slot.trafficCheckpoint === 'left' ||
      slot.trafficCheckpoint === 'right') &&
    slot.version === 1 &&
    finite(slot.savedAt) &&
    validProject(slot.project) &&
    integer(slot.roomIndex) &&
    slot.roomIndex >= 0 &&
    slot.roomIndex < slot.project.rooms.length &&
    record(slot.player) &&
    finite(slot.player.x) &&
    slot.player.x >= 0 &&
    slot.player.x < 640 &&
    finite(slot.player.y) &&
    slot.player.y >= 0 &&
    slot.player.y < 480 &&
    typeof slot.player.facing === 'string' &&
    ['up', 'down', 'left', 'right'].includes(slot.player.facing) &&
    record(slot.story) &&
    optionalFlags.every(
      (key) => record(slot.story) && (slot.story[key] === undefined || typeof slot.story[key] === 'boolean'),
    ) &&
    progressFlags.every((key) => record(slot.story) && typeof slot.story[key] === 'boolean') &&
    (!slot.story.teamJoined || !!slot.story.joined)
  );
}
export function readProgressSlots(): unknown[] {
  const raw = localStorage.getItem(progressKey);
  if (raw === null) return [null, null, null];
  const slots: unknown = JSON.parse(raw);
  if (!Array.isArray(slots) || slots.length !== 3) throw new Error('Invalid save data');
  return slots;
}
