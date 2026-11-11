import { createKnightPath } from '../rooms/post-show/knight-path.ts';
import { buildKey, freshPartyHP, keyName, maxHP, progressFlags, progressKey, T } from '../game/config.ts';
import type { Elements } from '../game/dom.ts';
import { present } from '../game/invariants.ts';
import type { GameState } from '../game/types.ts';
import type { PartyName } from '../inventory/types.ts';
import { createTraffic } from '../rooms/crossing/traffic.ts';
import { createHallway, hallwaySettings } from '../rooms/storage/storage-travel.ts';
import { clone } from '../world/clone.ts';
import type { Point, Room } from '../world/types.ts';
import { upgradeProject } from '../world/upgrades.ts';
import { readSavedBuild } from './build.ts';
import { normalizeInventory, readProgressSlots, validProgress } from './progress.ts';
import type { ProgressSave } from './types.ts';
interface Dependencies {
  readonly state: GameState;
  readonly $: Elements;
  readonly endStroke: () => void;
  readonly current: () => Room;
  readonly toast: (t: string) => void;
  readonly remember: () => void;
  readonly choiceDialogOpen: () => boolean;
  readonly isImportantCutscene: () => boolean;
  readonly announce: (t: string) => void;
  readonly resetBossEncounter: () => void;
  readonly closeDialogue: () => void;
  readonly preparePartyForRoom: () => void;
  readonly collides: (x: number, y: number) => boolean;
  readonly positionPlayer: (r: Room, preferred?: Point | undefined) => boolean;
  readonly resetFollower: () => void;
  readonly updateRoomUI: () => void;
  readonly storyUI: () => void;
  readonly canvas: HTMLCanvasElement;
  readonly partyStageForRoom: (room: Room, index: number) => 1 | 0 | 2;
}
/** Adventure restoration keeps newer Build edits and maps story rooms by scene key. */
export function createPersistence(dependencies: Dependencies) {
  const state = dependencies.state;
  function buildSnapshot() {
    return { format: 'little-lantern-build', version: 1, savedAt: Date.now(), project: clone(state.project) };
  }
  function save() {
    state.project.updatedAt = Date.now();
    try {
      // Keep the edited world separate from snapshots stored in adventure slots.
      if (state.mode === 'build') localStorage.setItem(buildKey, JSON.stringify(buildSnapshot()));
      localStorage.setItem(keyName, JSON.stringify(state.project));
      dependencies.$('saveStatus').textContent =
        'Build saved in this browser · ' + new Date(state.project.updatedAt).toLocaleTimeString();
      return true;
    } catch {
      dependencies.$('saveStatus').textContent =
        'Could not save in this browser. Download a backup to keep your edits.';
      return false;
    }
  }
  function finishBuildEdits() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    dependencies.endStroke();
    clearTimeout(state.saveTimer);
  }
  function roomSavePoints(r = dependencies.current(), index = state.roomIndex) {
    if (r.savePoints !== undefined) return r.savePoints;
    if (index === 0) return [{ x: 3, y: 6 }];
    if (r.scene === 'darkArrival') return [{ x: 7, y: 6 }];
    return [];
  }
  function nearSavePoint() {
    return roomSavePoints().some(
      (point) => Math.hypot(state.player.x - (point.x * T + 20), state.player.y - (point.y * T + 20)) < 64,
    );
  }
  function closestSavePoint(room: Room, index: number, position: Point) {
    return roomSavePoints(room, index).reduce<Point | null>(
      (closest, point) =>
        !closest ||
        Math.hypot(position.x - (point.x * T + 20), position.y - (point.y * T + 20)) <
          Math.hypot(position.x - (closest.x * T + 20), position.y - (closest.y * T + 20))
          ? point
          : closest,
      null,
    );
  }
  function savedAtPoint(slot: unknown, index: number, point: Point) {
    if (!validProgress(slot) || slot.roomIndex !== index) return false;
    const source = slot.savePoint || closestSavePoint(slot.project.rooms[index], index, slot.player);
    return source && source.x === point.x && source.y === point.y;
  }
  function removeSavePoint(x: number, y: number) {
    const removed: {
      index: number;
      slot: ProgressSave;
    }[] = [];
    try {
      const slots = readProgressSlots();
      slots.forEach((slot, index) => {
        if (validProgress(slot) && savedAtPoint(slot, state.roomIndex, { x, y })) {
          removed.push({ index, slot });
          slots[index] = null;
        }
      });
      if (removed.length) localStorage.setItem(progressKey, JSON.stringify(slots));
    } catch {
      dependencies.toast('Could not delete linked saves. The save point was kept.');
      return;
    }
    if (!present(state.stroke).changed) {
      dependencies.remember();
      present(state.stroke).changed = true;
    }
    if (removed.length) {
      const undo = state.undoStack[state.undoStack.length - 1];
      undo.removedSaves = [...(undo.removedSaves || []), ...removed];
    }
    dependencies.current().savePoints = roomSavePoints()
      .filter((point) => point.x !== x || point.y !== y)
      .map((point) => ({ ...point }));
    dependencies.toast(
      removed.length
        ? 'Save point and ' +
            removed.length +
            ' linked save' +
            (removed.length === 1 ? '' : 's') +
            ' deleted.'
        : 'Save point removed.',
    );
  }
  function openProgressMenu(action: string) {
    if (state.holeFall || state.padJump || dependencies.choiceDialogOpen()) return;
    if (state.death) {
      dependencies.toast('Use Try again to continue after your party falls.');
      return;
    }
    if (state.mode !== 'play' || dependencies.isImportantCutscene()) {
      dependencies.toast('Finish this cutscene before loading a game.');
      return;
    }
    state.keys.clear();
    state.player.moving = false;
    dependencies.$('saveDialogTitle').textContent = action === 'save' ? 'Save your game' : 'Load your game';
    dependencies.$('saveDialogNote').textContent =
      action === 'save'
        ? 'Choose a slot. Saves stay in this browser after refreshing.'
        : 'Choose a saved adventure to continue. Unsaved progress will be replaced.';
    dependencies.$('saveFeedback').textContent = '';
    dependencies.$('saveSlots').replaceChildren();
    try {
      const slots = readProgressSlots();
      slots.forEach((slot, index) => {
        const valid = validProgress(slot),
          row = document.createElement('div');
        row.className = 'save-slot';
        const title = document.createElement('strong');
        title.textContent = 'Slot ' + (index + 1);
        const detail = document.createElement('small');
        detail.textContent = valid
          ? slot.project.rooms[slot.roomIndex].name + ' · ' + new Date(slot.savedAt).toLocaleString()
          : slot === null
            ? 'Empty slot'
            : 'This save cannot be loaded.';
        const button = document.createElement('button');
        button.textContent =
          action === 'save' ? (slot === null ? 'Save here' : 'Replace save') : 'Load this save';
        button.disabled = action === 'load' && !valid;
        button.onclick = () => {
          if (action === 'load') {
            restoreProgress(slot);
            return;
          }
          if (slot !== null && !window.confirm('Replace the saved game in slot ' + (index + 1) + '?')) return;
          try {
            const point = closestSavePoint(dependencies.current(), state.roomIndex, state.player);
            if (!point) throw new Error('Save point unavailable');
            // Keep a map fallback for browsers without a newer edited build.
            const snapshot = {
              glitchWaiting: state.glitchWaiting ? clone(state.glitchWaiting) : null,
              version: 1,
              savedAt: Date.now(),
              project: clone(state.project),
              roomIndex: state.roomIndex,
              savePoint: { x: point.x, y: point.y },
              partyHP: freshPartyHP(),
              inventory: clone(state.inventory),
              treeHarvests: clone(state.treeHarvests),
              knightPathX: state.knightPath?.x,
              hallwayX: state.storageHallway?.x,
              trafficCheckpoint: state.traffic?.checkpoint,
              player: { x: state.player.x, y: state.player.y, facing: state.player.facing },
              story: {
                ...Object.fromEntries(progressFlags.map((key) => [key, state.story[key]])),
                goldenDoorExplained: state.story.goldenDoorExplained,
                coreExplained: state.story.coreExplained,
                coreFroggitWarned: state.story.coreFroggitWarned,
                coreGlitchNoticed: state.story.coreGlitchNoticed,
                glitchArrivalSeen: state.story.glitchArrivalSeen,
                noelleGone: state.story.noelleGone,
                noelleEscaped: state.story.noelleEscaped,
                studioExplained: state.story.studioExplained,
                tennaInvited: state.story.tennaInvited,
                tennaStorageInvited: state.story.tennaStorageInvited,
                tennaElixirsReceived: state.story.tennaElixirsReceived,
                collisionSeen: state.story.collisionSeen,
                darkBattleSeen: state.story.darkBattleSeen,
                jackRevealed: state.story.jackRevealed,
                jackCandyReceived: state.story.jackCandyReceived,
                tennaFinaleExplained: state.story.tennaFinaleExplained,
                tennaFinaleComplete: state.story.tennaFinaleComplete,
                knightStatuesExplained: state.story.knightStatuesExplained,
                queenBriefed: state.story.queenBriefed,
                queenDemoSeen: state.story.queenDemoSeen,
                queenSolved: state.story.queenSolved,
              },
            };
            const latest = readProgressSlots();
            latest[index] = snapshot;
            localStorage.setItem(progressKey, JSON.stringify(latest));
            state.partyHP = clone(snapshot.partyHP);
            openProgressMenu('save');
            dependencies.$('saveFeedback').textContent =
              'Saved to slot ' + (index + 1) + '. Everyone’s HP is fully restored.';
            dependencies.announce(
              'Game saved to slot ' + (index + 1) + '. Kris, Susie, Ralsey and Flowey have full HP.',
            );
          } catch {
            dependencies.$('saveFeedback').textContent =
              'Could not save. Browser storage may be full or unavailable. Your previous saves were kept.';
          }
        };
        row.append(title, detail, button);
        dependencies.$('saveSlots').append(row);
      });
    } catch {
      dependencies.$('saveFeedback').textContent =
        'Save storage is unavailable or damaged. Existing saves have not been changed.';
    }
    if (!dependencies.$('saveDialog').open) dependencies.$('saveDialog').showModal();
  }
  function restoreProgress(slot: unknown) {
    if (!validProgress(slot)) {
      dependencies.$('saveFeedback').textContent = 'This save cannot be loaded.';
      return;
    }
    const build = readSavedBuild();
    const world = upgradeProject(
      clone(
        build
          ? build.project
          : state.project.updatedAt > slot.project.updatedAt
            ? state.project
            : slot.project,
      ),
    );
    const savedRoom = slot.project.rooms[slot.roomIndex];
    const destination = savedRoom.scene
      ? world.rooms.findIndex((room) => room.scene === savedRoom.scene)
      : slot.roomIndex;
    if (
      destination < 0 ||
      destination >= world.rooms.length ||
      (!savedRoom.scene && slot.roomIndex >= 2 && world.rooms[destination].scene)
    ) {
      dependencies.$('saveFeedback').textContent =
        'This adventure needs a room missing from your build. Restore its build backup first.';
      dependencies.toast(dependencies.$('saveFeedback').textContent);
      return;
    }
    dependencies.resetBossEncounter();
    dependencies.$('bossChoiceDialog').close();
    state.pendingBossRoom = null;
    state.death = null;
    state.holeFall = null;
    state.padJump = null;
    state.pendingPad = null;
    state.lastPadContact = null;
    dependencies.$('goldenDoorChoiceDialog').close();
    dependencies.$('holeChoiceDialog').close();
    dependencies.$('gameOverDialog').close();
    clearTimeout(state.saveTimer);
    dependencies.endStroke();
    dependencies.closeDialogue();
    state.project = world;
    state.roomIndex = destination;
    state.partyHP = slot.partyHP ? clone(slot.partyHP) : { ...freshPartyHP(), Kris: slot.hp ?? maxHP };
    state.candyTarget = 'Kris';
    state.selectedItem = '';
    state.inventory = normalizeInventory(slot.inventory);
    state.treeHarvests = clone(slot.treeHarvests || {});
    Object.assign(state.story, slot.story, {
      goldenDoorExplained: slot.story.goldenDoorExplained ?? false,
      coreExplained: slot.story.coreExplained ?? false,
      coreFroggitWarned: slot.story.coreFroggitWarned ?? false,
      coreGlitchNoticed: slot.story.coreGlitchNoticed ?? false,
      glitchArrivalSeen: slot.story.glitchArrivalSeen ?? false,
      noelleGone: slot.story.noelleGone ?? false,
      noelleEscaped: slot.story.noelleEscaped ?? false,
      studioExplained: slot.story.studioExplained ?? false,
      tennaInvited: slot.story.tennaInvited ?? false,
      tennaStorageInvited: slot.story.tennaStorageInvited ?? false,
      tennaElixirsReceived: slot.story.tennaElixirsReceived ?? false,
      collisionSeen: slot.story.collisionSeen ?? false,
      darkBattleSeen: slot.story.darkBattleSeen ?? false,
      jackRevealed: slot.story.jackRevealed ?? false,
      jackCandyReceived: slot.story.jackCandyReceived ?? false,
      tennaFinaleExplained: slot.story.tennaFinaleExplained ?? false,
      tennaFinaleComplete: slot.story.tennaFinaleComplete ?? false,
      knightStatuesExplained: slot.story.knightStatuesExplained ?? false,
      queenBriefed: slot.story.queenBriefed ?? false,
      queenDemoSeen: slot.story.queenDemoSeen ?? false,
      queenSolved: slot.story.queenSolved ?? false,
      emerging: -1,
      discussion: -1,
      reveal: slot.story.met ? 1 : 0,
    });
    state.glitchWaiting = slot.glitchWaiting ? clone(slot.glitchWaiting) : null;
    Object.assign(state.player, slot.player, { moving: false, step: 0 });
    state.buster = null;
    state.tennaEntrance = null;
    state.collisionBlackout = null;
    state.queenPuzzle = null;
    state.queenDeparture = null;
    state.knightBattle = null;
    state.vesselArrival = null;
    state.knightPath =
      dependencies.current().scene === 'postShowPassage'
        ? createKnightPath(slot.knightPathX ?? state.player.x, state.player.y)
        : null;
    state.storageHallway =
      dependencies.current().scene === 'storageHallway'
        ? createHallway(slot.hallwayX ?? hallwaySettings.start, state.player.y)
        : null;
    state.traffic =
      dependencies.current().scene === 'trafficCrossing'
        ? createTraffic(slot.trafficCheckpoint ?? (state.player.x >= 560 ? 'right' : 'left'))
        : null;
    state.dive = null;
    state.companions = [];
    state.follower = { x: state.player.x, y: state.player.y, trail: [] };
    state.keys.clear();
    state.lastSpikeContact = null;
    state.cameraShakeTime = 0;
    state.undoStack = [];
    dependencies.$('undoButton').disabled = true;
    state.fade = 0.32;
    state.doorCooldown = 0.5;
    dependencies.preparePartyForRoom();
    if (dependencies.collides(state.player.x, state.player.y))
      dependencies.positionPlayer(dependencies.current(), {
        x: Math.floor(state.player.x / T),
        y: Math.floor(state.player.y / T),
      });
    if (state.story.joined) dependencies.resetFollower();
    dependencies.updateRoomUI();
    dependencies.storyUI();
    save();
    dependencies.$('saveDialog').close();
    dependencies.canvas.focus({ preventScroll: true });
    dependencies.toast('Saved game loaded.');
  }
  function savedPartyAlive(slot: ProgressSave) {
    const stage = dependencies.partyStageForRoom(slot.project.rooms[slot.roomIndex], slot.roomIndex);
    const fullParty = slot.story.teamJoined || stage === 2;
    const names: PartyName[] = [
      'Kris',
      ...(slot.story.joined || fullParty || stage >= 1 ? (['Flowey'] as const) : []),
      ...(fullParty ? (['Susie', 'Ralsey'] as const) : []),
    ];
    return names.some((name) => (slot.partyHP?.[name] ?? (name === 'Kris' ? (slot.hp ?? maxHP) : maxHP)) > 0);
  }
  return {
    save,
    buildSnapshot,
    finishBuildEdits,
    roomSavePoints,
    nearSavePoint,
    removeSavePoint,
    openProgressMenu,
    restoreProgress,
    savedPartyAlive,
  };
}
