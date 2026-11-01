import { present } from '../game/invariants.ts';
import type { EditorObject, GameServices, ObjectField } from '../game/services.ts';
import type { GameState } from '../game/types.ts';
import type { Layer } from '../world/types.ts';
import { restoreLinkedSaves } from './history.ts';
import { createEditorOperations } from './operations.ts';
// Build tools: pick a brush, then click a grid square. The shared state remembers the selection.
import { progressKey, T, tiles } from '../game/config.ts';
import { blankMap } from '../world/grid.ts';
import { objectLayer, validGlitchStyle } from '../world/validation.ts';
export function setupEditor(
  state: GameState,
  helpers: Pick<
    GameServices,
    | 'roomNpcs'
    | '$'
    | 'roomSpikes'
    | 'roomTrees'
    | 'fountainFriends'
    | 'toast'
    | 'remember'
    | 'save'
    | 'roomSavePoints'
    | 'canvas'
    | 'setMode'
    | 'readProgressSlots'
    | 'updateRoomUI'
    | 'removeSavePoint'
    | 'cellOpen'
    | 'advanceDialogue'
  >,
) {
  const {
    roomNpcs,
    $,
    roomSpikes,
    roomTrees,
    fountainFriends,
    toast,
    remember,
    save,
    roomSavePoints,
    canvas,
    setMode,
    readProgressSlots,
    updateRoomUI,
    removeSavePoint,
    cellOpen,
    advanceDialogue,
  } = helpers;
  const current = () => state.project.rooms[state.roomIndex];
  function selectedNpc() {
    return roomNpcs().find((n) => n.id === state.selectedNpcId);
  }
  function updateNpcUI() {
    if (!selectedNpc()) state.selectedNpcId = roomNpcs()[0]?.id || null;
    $('npcSelect').replaceChildren();
    if (!roomNpcs().length) {
      const option = document.createElement('option');
      option.textContent = 'No NPCs placed yet';
      option.value = '';
      $('npcSelect').append(option);
    }
    for (const npc of roomNpcs()) {
      const option = document.createElement('option');
      option.value = npc.id;
      option.textContent = npc.name + ' (' + (npc.x + 1) + ', ' + (npc.y + 1) + ')';
      $('npcSelect').append(option);
    }
    const npc = selectedNpc();
    $('npcSelect').value = state.selectedNpcId || '';
    $('npcSelect').disabled = !npc;
    $('npcName').value = npc?.name || '';
    $('npcSpeech').value = npc ? npc.speech.join('\n') : '';
    for (const id of ['npcName', 'npcSpeech', 'npcMove', 'npcRemove'] as const) $(id).disabled = !npc;
    $('npcTool').disabled = roomNpcs().length >= 24;
    if (state.tool === 'npcMove' && !npc) selectTool('npcSelect');
  }
  function npcAt(x: number, y: number) {
    return roomNpcs().find((n) => n.x === x && n.y === y);
  }
  function npcSpaceOpen(x: number, y: number, ignoreId: string | null = null) {
    const r = current();
    return (
      !roomSpikes(r).some((point) => point.x === x && point.y === y) &&
      !roomTrees(r).some((tree) => tree.x === x && tree.y === y) &&
      !tiles[r.map[y][x]].solid &&
      r.map[y][x] !== 6 &&
      !(r.spawn.x === x && r.spawn.y === y) &&
      !(state.roomIndex === 1 && r.flowey.x === x && r.flowey.y === y) &&
      !fountainFriends(r).some((n) => Math.floor(n.x / T) === x && Math.floor(n.y / T) === y) &&
      !roomNpcs().some((n) => n.id !== ignoreId && n.x === x && n.y === y)
    );
  }
  function editNpcCell(x: number, y: number) {
    const clicked = npcAt(x, y);
    if (state.tool === 'npcSelect') {
      if (clicked) {
        state.selectedNpcId = clicked.id;
        updateNpcUI();
      }
      return;
    }
    if (state.tool === 'npcMove') {
      const npc = selectedNpc();
      if (!npc) return;
      if (npc.x === x && npc.y === y) return;
      if (!npcSpaceOpen(x, y, npc.id)) {
        toast('Choose a clear tile away from other characters and doorways.');
        return;
      }
      remember();
      npc.x = x;
      npc.y = y;
      save();
      updateNpcUI();
      selectTool('npcSelect');
      return;
    }
    if (clicked) {
      state.selectedNpcId = clicked.id;
      updateNpcUI();
      selectTool('npcSelect');
      return;
    }
    if (roomNpcs().length >= 24) {
      toast('This room already has 24 NPCs.');
      return;
    }
    if (!npcSpaceOpen(x, y)) {
      toast('Choose a clear tile away from other characters and doorways.');
      return;
    }
    remember();
    const npc = newPlacedObject({
      id: 'frog-' + Date.now().toString(36) + '-' + ++state.npcSequence,
      sprite: 'frog',
      name: 'Froggit',
      x,
      y,
      speech: ['* Ribbit.', '* Hello there.'],
    });
    (current().npcs ??= []).push(npc);
    state.selectedNpcId = npc.id;
    save();
    updateNpcUI();
    selectTool('npcSelect');
    toast('Froggit placed. Edit its speech in the NPC panel.');
  }
  function selectTool(value: string | number) {
    state.layerApplyMode = false;
    updatePlacementLayerUI();
    if (value !== 'jumpPad') state.pendingPad = null;
    state.tool = value;
    $('deleteTool').setAttribute('aria-pressed', String(value === 'delete'));
    $('jumpPadTool').setAttribute('aria-pressed', String(value === 'jumpPad'));
    $('spikeTool').setAttribute('aria-pressed', String(value === 'spike'));
    $('editTool').setAttribute('aria-pressed', String(value === 'edit'));
    $('treeTool').setAttribute('aria-pressed', String(value === 'tree'));
    $('particleTool').setAttribute('aria-pressed', String(value === 'particles'));
    $('glitchParticleTool').setAttribute('aria-pressed', String(value === 'glitchParticles'));
    $('glitchPillarTool').setAttribute('aria-pressed', String(value === 'glitchPillar'));
    $('savePointTool').setAttribute('aria-pressed', String(value === 'savePoint'));
    document
      .querySelectorAll<HTMLButtonElement>('.tile-button')
      .forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.tile) === value)));
    $('floweyTool').setAttribute('aria-pressed', String(value === 'flowey'));
    $('spawnTool').setAttribute('aria-pressed', String(value === 'spawn'));
    $('npcTool').setAttribute('aria-pressed', String(value === 'npc'));
    $('npcSelectTool').setAttribute('aria-pressed', String(value === 'npcSelect'));
    $('npcMove').setAttribute('aria-pressed', String(value === 'npcMove'));
  }
  tiles.forEach((t) => {
    const b = document.createElement('button');
    b.className = 'tile-button';
    b.dataset.tile = String(t.id);
    b.setAttribute('aria-pressed', String(t.id === 0));
    b.title = t.label + (t.solid ? ' · blocks walking' : '');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = t.color;
    swatch.setAttribute('aria-hidden', 'true');
    b.append(swatch, document.createTextNode(t.label));
    b.onclick = () => selectTool(t.id);
    $('palette').append(b);
  });
  function updatePlacementLayerUI() {
    $('objectsBehindTool').setAttribute('aria-pressed', String(state.placementLayer === 'back'));
    $('behindGroundTool').setAttribute('aria-pressed', String(state.placementLayer === 'ground'));
    $('buildLayerStatus').textContent =
      'New objects: ' +
      { normal: 'Normal', back: 'Objects behind', ground: 'Behind ground' }[state.placementLayer];
  }
  // A layer is separate from a brush: picking a tree or pillar should not cancel the layer.
  function selectPlacementLayer(layer: Layer) {
    state.placementLayer = state.placementLayer === layer ? 'normal' : layer;
    state.layerApplyMode = true;
    updatePlacementLayerUI();
    toast(
      'Layer selected: ' +
        { normal: 'Normal', back: 'Objects behind', ground: 'Behind ground' }[state.placementLayer] +
        '. Choose an object tool to place it, or click an existing object to change its layer.',
    );
  }
  const { newPlacedObject, roomObjectGroups, objectsAt, writeObject, paint } = createEditorOperations({
    get state() {
      return state;
    },
    get current() {
      return current;
    },
    get roomTrees() {
      return roomTrees;
    },
    get roomNpcs() {
      return roomNpcs;
    },
    get roomSavePoints() {
      return roomSavePoints;
    },
    get roomSpikes() {
      return roomSpikes;
    },
    get toast() {
      return toast;
    },
    get remember() {
      return remember;
    },
    get removeSavePoint() {
      return removeSavePoint;
    },
    get updateNpcUI() {
      return updateNpcUI;
    },
    get cellOpen() {
      return cellOpen;
    },
    get openObjectEditor() {
      return openObjectEditor;
    },
    get editNpcCell() {
      return editNpcCell;
    },
    get npcAt() {
      return npcAt;
    },
  });
  let editingObject: {
    x: number;
    y: number;
    target?: {
      field: ObjectField;
      index: number;
      object: EditorObject;
      label: string;
    };
    layer?: Layer;
    resetColors?: boolean;
  } | null = null;
  $('editTool').onclick = () => {
    selectTool('edit');
    toast('Click an object base or tile to edit its appearance and layer.');
  };
  function updateObjectEditor() {
    const { x, y } = present(editingObject);
    const target = objectsAt(x, y).find((entry) => entry.field === $('editObjectTarget').value);
    present(editingObject).target = target;
    present(editingObject).resetColors = false;
    const tree = target?.field === 'trees',
      pillar = target?.object.shape === 'pillar';
    $('objectEditTitle').textContent = 'Edit ' + (target?.label.toLowerCase() || 'tile');
    $('treeEditFields').hidden = !tree;
    $('tileColorFields').hidden = !!target;
    $('objectLayerFields').hidden = !target;
    $('glitchPillarFields').hidden = !pillar;
    $('resetObjectColors').hidden = !!target && !tree;
    $('editCandyCount').disabled = $('editElixirCount').disabled = !tree;
    $('editGlitchHeight').disabled = $('editGlitchWidth').disabled = !pillar;
    setEditorLayer(target ? objectLayer(target.object) : 'normal');
    if (tree) {
      const object = target.object;
      $('editCanopyColor').value = object.canopyColor || '#160d39';
      $('editAccentColor').value = object.accentColor || '#ef004b';
      $('editTrunkColor').value = object.trunkColor || '#140d38';
      $('editCandyCount').value = String(object.candy ?? 2);
      $('editElixirCount').value = String(object.tpElixirs ?? 0);
      const key = state.roomIndex + ':' + x + ',' + y,
        taken = state.treeHarvests[key] || 0,
        elixirs = state.treeHarvests[key + ':tpElixir'] || 0;
      $('editCandyNote').textContent =
        `Already picked in this adventure: ${taken} G. Candy, ${elixirs} TP Elixir.`;
    } else if (pillar) {
      $('editGlitchHeight').value = String(target.object.height ?? 8);
      $('editGlitchWidth').value = String(target.object.width ?? 1);
    } else if (!target)
      $('editTileColor').value =
        current().tileColors?.[x + ',' + y] ||
        (current().theme === 'dark'
          ? current().map[y][x] === 1
            ? '#a349a4'
            : '#000000'
          : tiles[current().map[y][x]].color);
  }
  function setEditorLayer(layer: string) {
    if (!isLayer(layer)) return;
    present(editingObject).layer = layer;
    for (const [id, value] of [
      ['editLayerNormal', 'normal'],
      ['editLayerBack', 'back'],
      ['editLayerGround', 'ground'],
    ])
      $(id).setAttribute('aria-pressed', String(layer === value));
  }
  for (const [id, value] of [
    ['editLayerNormal', 'normal'],
    ['editLayerBack', 'back'],
    ['editLayerGround', 'ground'],
  ])
    $(id).onclick = () => setEditorLayer(value);
  $('editObjectTarget').onchange = updateObjectEditor;
  function openObjectEditor(x: number, y: number) {
    editingObject = { x, y };
    $('editObjectTarget').replaceChildren();
    for (const target of [...objectsAt(x, y), { field: 'tile', label: 'Ground / tile' }]) {
      const option = document.createElement('option');
      option.value = target.field;
      option.textContent = target.label;
      $('editObjectTarget').append(option);
    }
    updateObjectEditor();
    state.keys.clear();
    $('objectEditDialog').showModal();
  }
  $('resetObjectColors').onclick = () => {
    if (!editingObject) return;
    editingObject.resetColors = true;
    $('editCanopyColor').value = '#160d39';
    $('editAccentColor').value = '#ef004b';
    $('editTrunkColor').value = '#140d38';
    $('editTileColor').value =
      current().theme === 'dark'
        ? current().map[editingObject.y][editingObject.x] === 1
          ? '#a349a4'
          : '#000000'
        : tiles[current().map[editingObject.y][editingObject.x]].color;
  };
  for (const id of ['editTileColor', 'editCanopyColor', 'editAccentColor', 'editTrunkColor'] as const)
    $(id).addEventListener('input', () => {
      if (editingObject) editingObject.resetColors = false;
    });
  $('cancelObjectEdit').onclick = () => $('objectEditDialog').close();
  $('objectEditDialog').addEventListener('close', () => {
    editingObject = null;
    state.keys.clear();
    canvas.focus({ preventScroll: true });
  });
  $('objectEditForm').onsubmit = (e) => {
    e.preventDefault();
    if (!editingObject) return;
    const { x, y, target, layer, resetColors } = editingObject;
    const tree = target?.field === 'trees',
      pillar = target?.object.shape === 'pillar';
    const candy = Number($('editCandyCount').value),
      tpElixirs = Number($('editElixirCount').value),
      height = Number($('editGlitchHeight').value),
      width = Number($('editGlitchWidth').value);
    if (tree && (!Number.isInteger(candy) || candy < 0 || candy > 6)) return;
    if (tree && (!Number.isInteger(tpElixirs) || tpElixirs < 0 || tpElixirs > 6)) return;
    if (pillar && !validGlitchStyle({ height, width })) return;
    remember();
    if (target) {
      writeObject(target, {
        renderLayer: layer,
        ...(tree ? { candy, tpElixirs } : {}),
        ...(pillar ? { height, width } : {}),
      });
      if (tree) {
        const object = present(current().trees)[target.index];
        if (resetColors)
          for (const key of ['canopyColor', 'accentColor', 'trunkColor'] as const) delete object[key];
        else {
          object.canopyColor = $('editCanopyColor').value;
          object.accentColor = $('editAccentColor').value;
          object.trunkColor = $('editTrunkColor').value;
        }
      }
    } else {
      current().tileColors = { ...present(current().tileColors) };
      if (resetColors) delete present(current().tileColors)[x + ',' + y];
      else present(current().tileColors)[x + ',' + y] = $('editTileColor').value;
    }
    save();
    $('objectEditDialog').close();
    toast('Changes applied.');
  };
  $('deleteTool').onclick = () => {
    selectTool('delete');
    toast(
      'Click or drag to delete. Objects are removed first; empty tiles erase the floor. Undo restores deletions.',
    );
  };
  $('jumpPadTool').onclick = () => {
    selectTool('jumpPad');
    toast('Click a clear tile for the pad, then click its landing spot.');
  };
  $('spikeTool').onclick = () => {
    selectTool('spike');
    toast('Click a clear tile to place a spike. Click it again to remove it.');
  };
  $('treeTool').onclick = () => {
    selectTool('tree');
    toast('Click a clear tile to plant a tree. Click a trunk tile again to remove it.');
  };
  $('glitchParticleTool').onclick = () => {
    selectTool('glitchParticles');
    toast('Click anywhere to place a glitch. Click it again to remove it.');
  };
  $('glitchPillarTool').onclick = () => {
    selectTool('glitchPillar');
    toast('Click to place a tall glitch pillar. Edit its base to change its size.');
  };
  $('objectsBehindTool').onclick = () => selectPlacementLayer('back');
  $('behindGroundTool').onclick = () => selectPlacementLayer('ground');
  $('particleTool').onclick = () => {
    selectTool('particles');
    toast('Click a tile to add particles. Click a marked tile again to remove them.');
  };
  $('savePointTool').onclick = () => {
    selectTool('savePoint');
    toast('Click a clear tile to add a save point. Click a star to remove it.');
  };
  $('npcTool').onclick = () => selectTool('npc');
  $('npcSelectTool').onclick = () => selectTool('npcSelect');
  $('npcSelect').onchange = (e) => {
    state.selectedNpcId = $('npcSelect').value;
    updateNpcUI();
    selectTool('npcSelect');
  };
  $('npcName').onchange = (e) => {
    const npc = selectedNpc();
    if (!npc) return;
    const name = $('npcName').value.trim().slice(0, 32) || 'Froggit';
    if (name === npc.name) return;
    remember();
    npc.name = name;
    save();
    updateNpcUI();
  };
  $('npcSpeech').onchange = (e) => {
    const npc = selectedNpc();
    if (!npc) return;
    const speech = $('npcSpeech')
      .value.split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100)
      .map((s) => s.slice(0, 1200));
    if (!speech.length) speech.push('* Ribbit.');
    if (JSON.stringify(speech) === JSON.stringify(npc.speech)) return;
    remember();
    npc.speech = speech;
    save();
  };
  $('npcMove').onclick = () => {
    if (selectedNpc()) {
      selectTool('npcMove');
      toast('Click a clear tile to move this NPC.');
    }
  };
  $('npcRemove').onclick = () => {
    const npc = selectedNpc();
    if (!npc) return;
    remember();
    current().npcs = roomNpcs().filter((n) => n.id !== npc.id);
    state.selectedNpcId = null;
    save();
    updateNpcUI();
    toast('NPC removed. Undo can bring it back.');
  };
  $('floweyTool').onclick = () => selectTool('flowey');
  $('spawnTool').onclick = () => selectTool('spawn');
  $('playMode').onclick = () => setMode('play');
  $('buildMode').onclick = $('startBuilding').onclick = () => setMode('build');
  $('undoButton').onclick = () => {
    endStroke();
    const old = state.undoStack[state.undoStack.length - 1];
    if (!old) return;
    if (old.removedSaves?.length) {
      try {
        const slots = readProgressSlots();
        // Keep any newer saves written after deletion instead of overwriting them.
        restoreLinkedSaves(slots, old.removedSaves);
        localStorage.setItem(progressKey, JSON.stringify(slots));
      } catch {
        toast('Could not restore linked saves. Try Undo again when storage is available.');
        return;
      }
    }
    state.undoStack.pop();
    state.project = old.project;
    state.roomIndex = old.roomIndex;
    save();
    updateRoomUI();
    $('undoButton').disabled = !state.undoStack.length;
    toast('Last change undone.');
  };
  $('roomSelect').onchange = (e) => {
    endStroke();
    state.roomIndex = Number($('roomSelect').value);
    updateRoomUI();
  };
  $('addRoom').onclick = () => {
    if (state.project.rooms.length >= 20) return;
    remember();
    state.project.rooms.push({
      name: 'New Room ' + (state.project.rooms.length + 1),
      theme: 'castle',
      map: blankMap(),
      spawn: { x: 7, y: 9 },
      flowey: { x: 8, y: 4 },
      dialogue: [],
      target: state.roomIndex,
    });
    state.roomIndex = state.project.rooms.length - 1;
    save();
    updateRoomUI();
    toast('Room added! Paint a door and choose where it leads.');
  };
  $('roomTitle').onchange = (e) => {
    const name = $('roomTitle').value.trim() || 'Unnamed Room';
    remember();
    current().name = name;
    save();
    updateRoomUI();
  };
  $('floweyWords').onchange = (e) => {
    remember();
    current().dialogue = $('floweyWords')
      .value.split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (!current().dialogue.length)
      current().dialogue = ['* Hi... you finally woke up.', '* You need to help me.'];
    save();
  };
  $('doorTarget').onchange = (e) => {
    remember();
    current().target = Number($('doorTarget').value);
    save();
  };
  function mouseCell(e: PointerEvent) {
    const b = canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - b.left) * 640) / b.width / T),
      y: Math.floor(((e.clientY - b.top) * 480) / b.height / T),
    };
  }
  function endStroke() {
    if (state.stroke && state.stroke.changed) save();
    state.stroke = null;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    canvas.focus({ preventScroll: true });
    if (state.mode === 'build') {
      e.preventDefault();
      state.stroke = { changed: false, warned: false };
      canvas.setPointerCapture(e.pointerId);
      state.hover = mouseCell(e);
      paint(state.hover);
    } else if (state.dialogue) advanceDialogue();
  });
  canvas.addEventListener('pointermove', (e) => {
    state.hover = mouseCell(e);
    if (state.mode === 'build' && state.stroke && (typeof state.tool === 'number' || state.tool === 'delete'))
      paint(state.hover);
  });
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', endStroke);
  canvas.addEventListener('pointerleave', () => {
    state.hover = null;
  });
  return { selectTool, updateNpcUI, roomObjectGroups, endStroke, npcAt };
}
function isLayer(value: string): value is Layer {
  return ['normal', 'back', 'ground'].includes(value);
}
