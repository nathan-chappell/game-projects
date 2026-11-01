import { H, tiles, W } from '../game/config.ts';
import { present } from '../game/invariants.ts';
import type { EditorObject, ObjectField, ObjectGroup } from '../game/services.ts';
import type { GameState } from '../game/types.ts';
import type { Layer, Npc, PlacedObject, Point, Room, Tree } from '../world/types.ts';
import { objectLayer } from '../world/validation.ts';
interface Dependencies {
  readonly state: GameState;
  readonly current: () => Room;
  readonly roomTrees: (room?: Room | undefined) => Tree[];
  readonly roomNpcs: () => Npc[];
  readonly roomSavePoints: (room?: Room | undefined, index?: number | undefined) => PlacedObject[];
  readonly roomSpikes: (room?: Room | undefined) => PlacedObject[];
  readonly toast: (text: string) => void;
  readonly remember: () => void;
  readonly removeSavePoint: (x: number, y: number) => void;
  readonly updateNpcUI: () => void;
  readonly cellOpen: (room: Room, x: number, y: number, avoidFlowey?: boolean | undefined) => boolean;
  readonly openObjectEditor: (x: number, y: number) => void;
  readonly editNpcCell: (x: number, y: number) => void;
  readonly npcAt: (x: number, y: number) => Npc | undefined;
}
/** A pointer stroke records one undo snapshot before its first mutation. */
export function createEditorOperations(dependencies: Dependencies) {
  const state = dependencies.state;
  function newPlacedObject<T extends Point>(object: T) {
    return state.placementLayer === 'normal' ? object : { ...object, renderLayer: state.placementLayer };
  }
  function roomObjectGroups(): ObjectGroup[] {
    const r = dependencies.current();
    return [
      ['glitchPoints', r.glitchPoints || [], 'Glitch particles'],
      ['particlePoints', r.particlePoints || [], 'Particles'],
      ['trees', dependencies.roomTrees(), 'Tree'],
      ['npcs', dependencies.roomNpcs(), 'NPC'],
      ['savePoints', dependencies.roomSavePoints(), 'Save point'],
      ['spikes', dependencies.roomSpikes(), 'Spike'],
      ['jumpPads', r.jumpPads || [], 'Jump pad'],
    ];
  }
  function objectsAt(x: number, y: number) {
    return roomObjectGroups().flatMap(([field, objects, label]) =>
      objects.flatMap((object, index) =>
        object.x === x && object.y === y
          ? [{ field, index, object, label: object.shape === 'pillar' ? 'Glitch pillar' : label }]
          : [],
      ),
    );
  }
  function writeObject(
    target: {
      field: ObjectField;
      index: number;
    },
    update: Partial<EditorObject>,
  ) {
    const objects = present(roomObjectGroups().find(([field]) => field === target.field))[1];
    Object.assign(dependencies.current(), {
      [target.field]: objects.map((object, index) =>
        index === target.index ? { ...object, ...update } : { ...object },
      ),
    });
  }
  function changeObjectLayer(x: number, y: number, layer: Layer) {
    const target = objectsAt(x, y)[0];
    if (!target) {
      dependencies.toast('Click the base tile of a placed object.');
      return;
    }
    present(state.stroke).layerCells ??= new Set();
    const key = x + ',' + y;
    if (present(present(state.stroke).layerCells).has(key)) return;
    present(present(state.stroke).layerCells).add(key);
    if (!present(state.stroke).changed) {
      dependencies.remember();
      present(state.stroke).changed = true;
    }
    const next = objectLayer(target.object) === layer ? 'normal' : layer;
    writeObject(target, { renderLayer: next });
    dependencies.toast(
      target.label +
        ': ' +
        { normal: 'normal layer', back: 'behind objects', ground: 'behind ground' }[next] +
        '.',
    );
  }
  function deleteAt(x: number, y: number) {
    const r = dependencies.current(),
      key = x + ',' + y;
    present(state.stroke).deletedCells ??= new Set();
    if (present(present(state.stroke).deletedCells).has(key)) return;
    present(present(state.stroke).deletedCells).add(key);
    const collections: [ObjectField, EditorObject[]][] = [
      ['npcs', dependencies.roomNpcs()],
      ['trees', dependencies.roomTrees()],
      ['savePoints', dependencies.roomSavePoints()],
      ['spikes', dependencies.roomSpikes()],
      ['jumpPads', r.jumpPads || []],
      ['particlePoints', r.particlePoints || []],
      ['glitchPoints', r.glitchPoints || []],
    ];
    for (const [field, objects] of collections) {
      const index = objects.findIndex((object) => object.x === x && object.y === y);
      if (index < 0) continue;
      if (field === 'savePoints') {
        dependencies.removeSavePoint(x, y);
        return;
      }
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      Object.assign(r, { [field]: objects.filter((_, i) => i !== index).map((object) => ({ ...object })) });
      if (field === 'npcs') dependencies.updateNpcUI();
      return;
    }
    if (r.scene === 'darkGoldenHall' && !r.hideGoldenDoor && x >= 8 && x <= 15 && y <= 8) {
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r.hideGoldenDoor = true;
      return;
    }
    if (r.scene === 'darkGlowPassage' && !r.hideHole && x === 10 && y === 3) {
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r.hideHole = true;
      return;
    }
    if (
      (r.spawn.x === x && r.spawn.y === y) ||
      (state.roomIndex === 1 && r.flowey.x === x && r.flowey.y === y)
    ) {
      dependencies.toast('Move the starting spot or Flowey before deleting this tile.');
      return;
    }
    if (r.map[y][x] === 10 && !r.tileColors?.[key]) return;
    if (!present(state.stroke).changed) {
      dependencies.remember();
      present(state.stroke).changed = true;
    }
    r.map[y][x] = 10;
    if (r.tileColors) delete r.tileColors[key];
    if (r.doorLinks) delete r.doorLinks[key];
    // Remove pads that would otherwise land on the erased floor.
    if (r.jumpPads)
      r.jumpPads = r.jumpPads.filter(
        (pad) =>
          (pad.targetRoom !== undefined && pad.targetRoom !== state.roomIndex) ||
          pad.targetX !== x ||
          pad.targetY !== y,
      );
  }
  function paint(cell: Point) {
    const { x, y } = cell,
      r = dependencies.current();
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (state.layerApplyMode && objectsAt(x, y).length) {
      changeObjectLayer(x, y, state.placementLayer);
      return;
    }
    if (state.tool === 'delete') {
      deleteAt(x, y);
      return;
    }
    if (state.tool === 'jumpPad') {
      const pads = r.jumpPads || [],
        existing = pads.findIndex((pad) => pad.x === x && pad.y === y);
      if (!state.pendingPad && existing >= 0) {
        dependencies.remember();
        r.jumpPads = pads.filter((_, i) => i !== existing);
        present(state.stroke).changed = true;
        dependencies.toast('Jump pad removed.');
        return;
      }
      if (
        !dependencies.cellOpen(r, x, y) ||
        dependencies.roomSavePoints().some((point) => point.x === x && point.y === y)
      ) {
        dependencies.toast('Choose a clear floor tile.');
        return;
      }
      if (!state.pendingPad) {
        state.pendingPad = { x, y, roomIndex: state.roomIndex };
        dependencies.toast('Now click the landing spot.');
        return;
      }
      if (state.pendingPad.roomIndex !== state.roomIndex) {
        state.pendingPad = null;
        dependencies.toast('Place the pad and landing in the same room.');
        return;
      }
      if (state.pendingPad.x === x && state.pendingPad.y === y) {
        dependencies.toast('Choose a different landing tile.');
        return;
      }
      dependencies.remember();
      r.jumpPads = [
        ...pads,
        newPlacedObject({ x: state.pendingPad.x, y: state.pendingPad.y, targetX: x, targetY: y }),
      ];
      state.pendingPad = null;
      present(state.stroke).changed = true;
      dependencies.toast('Jump pad ready!');
      return;
    }
    if (state.tool === 'spike') {
      const spikes = dependencies.roomSpikes(),
        existing = spikes.findIndex((point) => point.x === x && point.y === y);
      if (
        existing < 0 &&
        (!dependencies.cellOpen(r, x, y) ||
          (r.spawn.x === x && r.spawn.y === y) ||
          dependencies.roomSavePoints().some((point) => point.x === x && point.y === y))
      ) {
        dependencies.toast('Choose a clear floor tile away from the starting spot and save points.');
        return;
      }
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r.spikes = spikes.map((point) => ({ ...point }));
      if (existing >= 0) {
        r.spikes.splice(existing, 1);
        dependencies.toast('Spike removed.');
      } else {
        r.spikes.push(newPlacedObject({ x, y }));
        dependencies.toast('Spike placed.');
      }
      return;
    }
    if (state.tool === 'edit') {
      dependencies.openObjectEditor(x, y);
      return;
    }
    if (state.tool === 'tree') {
      const trees = dependencies.roomTrees(),
        existing = trees.findIndex((tree) => tree.x === x && tree.y === y);
      if (existing < 0) {
        if (trees.length >= 48) {
          dependencies.toast('This room already has 48 trees.');
          return;
        }
        if (
          !dependencies.cellOpen(r, x, y) ||
          (r.spawn.x === x && r.spawn.y === y) ||
          dependencies.roomSavePoints().some((point) => point.x === x && point.y === y)
        ) {
          dependencies.toast('Choose a clear floor tile away from the starting spot and save points.');
          return;
        }
      }
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r.trees = trees.map((tree) => ({ ...tree }));
      if (existing >= 0) {
        r.trees.splice(existing, 1);
        dependencies.toast('Tree removed.');
      } else {
        r.trees.push(newPlacedObject({ x, y }));
        dependencies.toast('Tree planted.');
      }
      return;
    }
    if (state.tool === 'glitchParticles' || state.tool === 'glitchPillar') {
      const points = r.glitchPoints || [],
        existing = points.findIndex((point) => point.x === x && point.y === y);
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r.glitchPoints = points.map((point) => ({ ...point }));
      if (existing >= 0) {
        r.glitchPoints.splice(existing, 1);
        dependencies.toast('Glitch removed.');
      } else {
        r.glitchPoints.push(
          newPlacedObject({
            x,
            y,
            ...(state.tool === 'glitchPillar' ? { shape: 'pillar', height: 8, width: 1 } : {}),
          }),
        );
        dependencies.toast('Glitch placed. Save build to keep your edits.');
      }
      return;
    }
    if (state.tool === 'particles') {
      const points = r.particlePoints || [],
        existing = points.findIndex((point) => point.x === x && point.y === y);
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r.particlePoints = points.map((point) => ({ ...point }));
      if (existing >= 0) {
        r.particlePoints.splice(existing, 1);
        dependencies.toast('Particles removed.');
      } else {
        r.particlePoints.push(newPlacedObject({ x, y }));
        dependencies.toast('Particles placed.');
      }
      return;
    }
    if (state.tool === 'savePoint') {
      const points = dependencies.roomSavePoints(),
        existing = points.findIndex((point) => point.x === x && point.y === y);
      if (existing >= 0) {
        dependencies.removeSavePoint(x, y);
        return;
      }
      if (!dependencies.cellOpen(r, x, y)) {
        dependencies.toast('Choose a clear floor tile for a save point.');
        return;
      }
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r.savePoints = points.map((point) => ({ ...point }));
      r.savePoints.push(newPlacedObject({ x, y }));
      dependencies.toast('Save point placed.');
      return;
    }
    if (['npc', 'npcMove', 'npcSelect'].includes(String(state.tool))) {
      dependencies.editNpcCell(x, y);
      return;
    }
    if (state.tool === 'spawn' || state.tool === 'flowey') {
      if (dependencies.roomSpikes(r).some((point) => point.x === x && point.y === y)) {
        dependencies.toast('Remove the spike before placing a character here.');
        return;
      }
      if (dependencies.roomTrees(r).some((tree) => tree.x === x && tree.y === y)) {
        dependencies.toast('Remove the tree before placing a character here.');
        return;
      }
      if (dependencies.npcAt(x, y)) {
        dependencies.toast('Move the NPC before placing another character here.');
        return;
      }
      if (tiles[r.map[y][x]].solid || r.map[y][x] === 6) {
        dependencies.toast('Choose a floor tile, rug, path, or flowers.');
        return;
      }
      const other = state.tool === 'flowey' ? r.spawn : r.flowey;
      if ((state.tool === 'flowey' || state.roomIndex === 1) && other.x === x && other.y === y) {
        dependencies.toast('Give Flowey and Kris their own space.');
        return;
      }
      const key = state.tool === 'flowey' ? 'flowey' : 'spawn';
      if (r[key].x === x && r[key].y === y) return;
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r[key] = { x, y };
    } else {
      if (typeof state.tool !== 'number') return;
      if (r.map[y][x] === state.tool) return;
      if (
        (tiles[state.tool].solid || state.tool === 6) &&
        dependencies.roomSpikes(r).some((point) => point.x === x && point.y === y)
      ) {
        dependencies.toast('Remove the spike before covering its tile.');
        return;
      }
      if (
        (tiles[state.tool].solid || state.tool === 6) &&
        dependencies.roomTrees(r).some((tree) => tree.x === x && tree.y === y)
      ) {
        dependencies.toast('Remove the tree before covering its tile.');
        return;
      }
      if (
        (tiles[state.tool].solid || state.tool === 6) &&
        dependencies.roomSavePoints().some((point) => point.x === x && point.y === y)
      ) {
        dependencies.toast('Remove the save point before covering its tile.');
        return;
      }
      if ((tiles[state.tool].solid || state.tool === 6) && dependencies.npcAt(x, y)) {
        dependencies.toast('Move or remove the NPC before covering its tile.');
        return;
      }
      if (
        (tiles[state.tool].solid || state.tool === 6) &&
        ((r.spawn.x === x && r.spawn.y === y) ||
          (state.roomIndex === 1 && r.flowey.x === x && r.flowey.y === y))
      ) {
        if (!present(state.stroke).warned) {
          dependencies.toast('Move Flowey or the starting spot before covering that tile.');
          present(state.stroke).warned = true;
        }
        return;
      }
      if (!present(state.stroke).changed) {
        dependencies.remember();
        present(state.stroke).changed = true;
      }
      r.map[y][x] = state.tool;
    }
  }
  return { newPlacedObject, roomObjectGroups, objectsAt, writeObject, paint };
}
