// Build tools: pick a brush, then click a grid square. The shared state remembers the selection.
import { tiles, T, progressKey, W, H } from './config.js';
import { objectLayer, validGlitchStyle, blankMap } from './world.js';

export function setupEditor(state, helpers) {
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
    for (const id of ['npcName', 'npcSpeech', 'npcMove', 'npcRemove']) $(id).disabled = !npc;
    $('npcTool').disabled = roomNpcs().length >= 24;
    if (state.tool === 'npcMove' && !npc) selectTool('npcSelect');
  }

  function npcAt(x, y) {
    return roomNpcs().find((n) => n.x === x && n.y === y);
  }

  function npcSpaceOpen(x, y, ignoreId = null) {
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

  function editNpcCell(x, y) {
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

  function selectTool(value) {
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
      .querySelectorAll('.tile-button')
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
    b.dataset.tile = t.id;
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
      'New objects: ' + { normal: 'Normal', back: 'Objects behind', ground: 'Behind ground' }[state.placementLayer];
  }

  // A layer is separate from a brush: picking a tree or pillar should not cancel the layer.
  function selectPlacementLayer(layer) {
    state.placementLayer = state.placementLayer === layer ? 'normal' : layer;
    state.layerApplyMode = true;
    updatePlacementLayerUI();
    toast(
      'Layer selected: ' +
        { normal: 'Normal', back: 'Objects behind', ground: 'Behind ground' }[state.placementLayer] +
        '. Choose an object tool to place it, or click an existing object to change its layer.',
    );
  }

  function newPlacedObject(object) {
    return state.placementLayer === 'normal' ? object : { ...object, renderLayer: state.placementLayer };
  }

  function roomObjectGroups() {
    const r = current();
    return [
      ['glitchPoints', r.glitchPoints || [], 'Glitch particles'],
      ['particlePoints', r.particlePoints || [], 'Particles'],
      ['trees', roomTrees(), 'Tree'],
      ['npcs', roomNpcs(), 'NPC'],
      ['savePoints', roomSavePoints(), 'Save point'],
      ['spikes', roomSpikes(), 'Spike'],
      ['jumpPads', r.jumpPads || [], 'Jump pad'],
    ];
  }

  function objectsAt(x, y) {
    return roomObjectGroups().flatMap(([field, objects, label]) =>
      objects.flatMap((object, index) =>
        object.x === x && object.y === y
          ? [{ field, index, object, label: object.shape === 'pillar' ? 'Glitch pillar' : label }]
          : [],
      ),
    );
  }

  function writeObject(target, update) {
    const objects = roomObjectGroups().find(([field]) => field === target.field)[1];
    current()[target.field] = objects.map((object, index) =>
      index === target.index ? { ...object, ...update } : { ...object },
    );
  }

  function changeObjectLayer(x, y, layer) {
    const target = objectsAt(x, y)[0];
    if (!target) {
      toast('Click the base tile of a placed object.');
      return;
    }
    state.stroke.layerCells ??= new Set();
    const key = x + ',' + y;
    if (state.stroke.layerCells.has(key)) return;
    state.stroke.layerCells.add(key);
    if (!state.stroke.changed) {
      remember();
      state.stroke.changed = true;
    }
    const next = objectLayer(target.object) === layer ? 'normal' : layer;
    writeObject(target, { renderLayer: next });
    toast(
      target.label + ': ' + { normal: 'normal layer', back: 'behind objects', ground: 'behind ground' }[next] + '.',
    );
  }

  let editingObject = null;

  $('editTool').onclick = () => {
    selectTool('edit');
    toast('Click an object base or tile to edit its appearance and layer.');
  };

  function updateObjectEditor() {
    const { x, y } = editingObject;
    const target = objectsAt(x, y).find((entry) => entry.field === $('editObjectTarget').value);
    editingObject.target = target;
    editingObject.resetColors = false;
    const tree = target?.field === 'trees',
      pillar = target?.object.shape === 'pillar';
    $('objectEditTitle').textContent = 'Edit ' + (target?.label.toLowerCase() || 'tile');
    $('treeEditFields').hidden = !tree;
    $('tileColorFields').hidden = !!target;
    $('objectLayerFields').hidden = !target;
    $('glitchPillarFields').hidden = !pillar;
    $('resetObjectColors').hidden = !!target && !tree;
    $('editCandyCount').disabled = !tree;
    $('editGlitchHeight').disabled = $('editGlitchWidth').disabled = !pillar;
    setEditorLayer(target ? objectLayer(target.object) : 'normal');
    if (tree) {
      const object = target.object;
      $('editCanopyColor').value = object.canopyColor || '#160d39';
      $('editAccentColor').value = object.accentColor || '#ef004b';
      $('editTrunkColor').value = object.trunkColor || '#140d38';
      $('editCandyCount').value = object.candy ?? 2;
      const taken = state.treeHarvests[state.roomIndex + ':' + x + ',' + y] || 0;
      $('editCandyNote').textContent = 'Total supply for this tree. Already picked in this adventure: ' + taken + '.';
    } else if (pillar) {
      $('editGlitchHeight').value = target.object.height ?? 8;
      $('editGlitchWidth').value = target.object.width ?? 1;
    } else if (!target)
      $('editTileColor').value =
        current().tileColors?.[x + ',' + y] ||
        (current().theme === 'dark'
          ? current().map[y][x] === 1
            ? '#a349a4'
            : '#000000'
          : tiles[current().map[y][x]].color);
  }

  function setEditorLayer(layer) {
    editingObject.layer = layer;
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

  function openObjectEditor(x, y) {
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

  for (const id of ['editTileColor', 'editCanopyColor', 'editAccentColor', 'editTrunkColor'])
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
      height = Number($('editGlitchHeight').value),
      width = Number($('editGlitchWidth').value);
    if (tree && (!Number.isInteger(candy) || candy < 0 || candy > 6)) return;
    if (pillar && !validGlitchStyle({ height, width })) return;
    remember();
    if (target) {
      writeObject(target, { renderLayer: layer, ...(tree ? { candy } : {}), ...(pillar ? { height, width } : {}) });
      if (tree) {
        const object = current().trees[target.index];
        if (resetColors) for (const key of ['canopyColor', 'accentColor', 'trunkColor']) delete object[key];
        else {
          object.canopyColor = $('editCanopyColor').value;
          object.accentColor = $('editAccentColor').value;
          object.trunkColor = $('editTrunkColor').value;
        }
      }
    } else {
      current().tileColors = { ...current().tileColors };
      if (resetColors) delete current().tileColors[x + ',' + y];
      else current().tileColors[x + ',' + y] = $('editTileColor').value;
    }
    save();
    $('objectEditDialog').close();
    toast('Changes applied.');
  };

  $('deleteTool').onclick = () => {
    selectTool('delete');
    toast('Click or drag to delete. Objects are removed first; empty tiles erase the floor. Undo restores deletions.');
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
    state.selectedNpcId = e.target.value;
    updateNpcUI();
    selectTool('npcSelect');
  };

  $('npcName').onchange = (e) => {
    const npc = selectedNpc();
    if (!npc) return;
    const name = e.target.value.trim().slice(0, 32) || 'Froggit';
    if (name === npc.name) return;
    remember();
    npc.name = name;
    save();
    updateNpcUI();
  };

  $('npcSpeech').onchange = (e) => {
    const npc = selectedNpc();
    if (!npc) return;
    const speech = e.target.value
      .split(/\r?\n/)
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
        for (const saved of old.removedSaves) if (slots[saved.index] === null) slots[saved.index] = saved.slot;
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
    state.roomIndex = Number(e.target.value);
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
    const name = e.target.value.trim() || 'Unnamed Room';
    remember();
    current().name = name;
    save();
    updateRoomUI();
  };

  $('floweyWords').onchange = (e) => {
    remember();
    current().dialogue = e.target.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (!current().dialogue.length) current().dialogue = ['* Hi... you finally woke up.', '* You need to help me.'];
    save();
  };

  $('doorTarget').onchange = (e) => {
    remember();
    current().target = Number(e.target.value);
    save();
  };

  function mouseCell(e) {
    const b = canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - b.left) * 640) / b.width / T),
      y: Math.floor(((e.clientY - b.top) * 480) / b.height / T),
    };
  }

  function deleteAt(x, y) {
    const r = current(),
      key = x + ',' + y;
    state.stroke.deletedCells ??= new Set();
    if (state.stroke.deletedCells.has(key)) return;
    state.stroke.deletedCells.add(key);
    const collections = [
      ['npcs', roomNpcs()],
      ['trees', roomTrees()],
      ['savePoints', roomSavePoints()],
      ['spikes', roomSpikes()],
      ['jumpPads', r.jumpPads || []],
      ['particlePoints', r.particlePoints || []],
      ['glitchPoints', r.glitchPoints || []],
    ];
    for (const [field, objects] of collections) {
      const index = objects.findIndex((object) => object.x === x && object.y === y);
      if (index < 0) continue;
      if (field === 'savePoints') {
        removeSavePoint(x, y);
        return;
      }
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r[field] = objects.filter((_, i) => i !== index).map((object) => ({ ...object }));
      if (field === 'npcs') updateNpcUI();
      return;
    }
    if (r.scene === 'darkGoldenHall' && !r.hideGoldenDoor && x >= 8 && x <= 15 && y <= 8) {
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r.hideGoldenDoor = true;
      return;
    }
    if (r.scene === 'darkGlowPassage' && !r.hideHole && x === 10 && y === 3) {
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r.hideHole = true;
      return;
    }
    if ((r.spawn.x === x && r.spawn.y === y) || (state.roomIndex === 1 && r.flowey.x === x && r.flowey.y === y)) {
      toast('Move the starting spot or Flowey before deleting this tile.');
      return;
    }
    if (r.map[y][x] === 10 && !r.tileColors?.[key]) return;
    if (!state.stroke.changed) {
      remember();
      state.stroke.changed = true;
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

  function paint(cell) {
    const { x, y } = cell,
      r = current();
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
        remember();
        r.jumpPads = pads.filter((_, i) => i !== existing);
        state.stroke.changed = true;
        toast('Jump pad removed.');
        return;
      }
      if (!cellOpen(r, x, y) || roomSavePoints().some((point) => point.x === x && point.y === y)) {
        toast('Choose a clear floor tile.');
        return;
      }
      if (!state.pendingPad) {
        state.pendingPad = { x, y, roomIndex: state.roomIndex };
        toast('Now click the landing spot.');
        return;
      }
      if (state.pendingPad.roomIndex !== state.roomIndex) {
        state.pendingPad = null;
        toast('Place the pad and landing in the same room.');
        return;
      }
      if (state.pendingPad.x === x && state.pendingPad.y === y) {
        toast('Choose a different landing tile.');
        return;
      }
      remember();
      r.jumpPads = [...pads, newPlacedObject({ x: state.pendingPad.x, y: state.pendingPad.y, targetX: x, targetY: y })];
      state.pendingPad = null;
      state.stroke.changed = true;
      toast('Jump pad ready!');
      return;
    }
    if (state.tool === 'spike') {
      const spikes = roomSpikes(),
        existing = spikes.findIndex((point) => point.x === x && point.y === y);
      if (
        existing < 0 &&
        (!cellOpen(r, x, y) ||
          (r.spawn.x === x && r.spawn.y === y) ||
          roomSavePoints().some((point) => point.x === x && point.y === y))
      ) {
        toast('Choose a clear floor tile away from the starting spot and save points.');
        return;
      }
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r.spikes = spikes.map((point) => ({ ...point }));
      if (existing >= 0) {
        r.spikes.splice(existing, 1);
        toast('Spike removed.');
      } else {
        r.spikes.push(newPlacedObject({ x, y }));
        toast('Spike placed.');
      }
      return;
    }
    if (state.tool === 'edit') {
      openObjectEditor(x, y);
      return;
    }
    if (state.tool === 'tree') {
      const trees = roomTrees(),
        existing = trees.findIndex((tree) => tree.x === x && tree.y === y);
      if (existing < 0) {
        if (trees.length >= 48) {
          toast('This room already has 48 trees.');
          return;
        }
        if (
          !cellOpen(r, x, y) ||
          (r.spawn.x === x && r.spawn.y === y) ||
          roomSavePoints().some((point) => point.x === x && point.y === y)
        ) {
          toast('Choose a clear floor tile away from the starting spot and save points.');
          return;
        }
      }
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r.trees = trees.map((tree) => ({ ...tree }));
      if (existing >= 0) {
        r.trees.splice(existing, 1);
        toast('Tree removed.');
      } else {
        r.trees.push(newPlacedObject({ x, y }));
        toast('Tree planted.');
      }
      return;
    }
    if (state.tool === 'glitchParticles' || state.tool === 'glitchPillar') {
      const points = r.glitchPoints || [],
        existing = points.findIndex((point) => point.x === x && point.y === y);
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r.glitchPoints = points.map((point) => ({ ...point }));
      if (existing >= 0) {
        r.glitchPoints.splice(existing, 1);
        toast('Glitch removed.');
      } else {
        r.glitchPoints.push(
          newPlacedObject({ x, y, ...(state.tool === 'glitchPillar' ? { shape: 'pillar', height: 8, width: 1 } : {}) }),
        );
        toast('Glitch placed. Save build to keep your edits.');
      }
      return;
    }
    if (state.tool === 'particles') {
      const points = r.particlePoints || [],
        existing = points.findIndex((point) => point.x === x && point.y === y);
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r.particlePoints = points.map((point) => ({ ...point }));
      if (existing >= 0) {
        r.particlePoints.splice(existing, 1);
        toast('Particles removed.');
      } else {
        r.particlePoints.push(newPlacedObject({ x, y }));
        toast('Particles placed.');
      }
      return;
    }
    if (state.tool === 'savePoint') {
      const points = roomSavePoints(),
        existing = points.findIndex((point) => point.x === x && point.y === y);
      if (existing >= 0) {
        removeSavePoint(x, y);
        return;
      }
      if (!cellOpen(r, x, y)) {
        toast('Choose a clear floor tile for a save point.');
        return;
      }
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r.savePoints = points.map((point) => ({ ...point }));
      r.savePoints.push(newPlacedObject({ x, y }));
      toast('Save point placed.');
      return;
    }
    if (['npc', 'npcMove', 'npcSelect'].includes(state.tool)) {
      editNpcCell(x, y);
      return;
    }
    if (state.tool === 'spawn' || state.tool === 'flowey') {
      if (roomSpikes(r).some((point) => point.x === x && point.y === y)) {
        toast('Remove the spike before placing a character here.');
        return;
      }
      if (roomTrees(r).some((tree) => tree.x === x && tree.y === y)) {
        toast('Remove the tree before placing a character here.');
        return;
      }
      if (npcAt(x, y)) {
        toast('Move the NPC before placing another character here.');
        return;
      }
      if (tiles[r.map[y][x]].solid || r.map[y][x] === 6) {
        toast('Choose a floor tile, rug, path, or flowers.');
        return;
      }
      const other = state.tool === 'flowey' ? r.spawn : r.flowey;
      if ((state.tool === 'flowey' || state.roomIndex === 1) && other.x === x && other.y === y) {
        toast('Give Flowey and Kris their own space.');
        return;
      }
      const key = state.tool === 'flowey' ? 'flowey' : 'spawn';
      if (r[key].x === x && r[key].y === y) return;
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r[key] = { x, y };
    } else {
      if (r.map[y][x] === state.tool) return;
      if (
        (tiles[state.tool].solid || state.tool === 6) &&
        roomSpikes(r).some((point) => point.x === x && point.y === y)
      ) {
        toast('Remove the spike before covering its tile.');
        return;
      }
      if ((tiles[state.tool].solid || state.tool === 6) && roomTrees(r).some((tree) => tree.x === x && tree.y === y)) {
        toast('Remove the tree before covering its tile.');
        return;
      }
      if (
        (tiles[state.tool].solid || state.tool === 6) &&
        roomSavePoints().some((point) => point.x === x && point.y === y)
      ) {
        toast('Remove the save point before covering its tile.');
        return;
      }
      if ((tiles[state.tool].solid || state.tool === 6) && npcAt(x, y)) {
        toast('Move or remove the NPC before covering its tile.');
        return;
      }
      if (
        (tiles[state.tool].solid || state.tool === 6) &&
        ((r.spawn.x === x && r.spawn.y === y) || (state.roomIndex === 1 && r.flowey.x === x && r.flowey.y === y))
      ) {
        if (!state.stroke.warned) {
          toast('Move Flowey or the starting spot before covering that tile.');
          state.stroke.warned = true;
        }
        return;
      }
      if (!state.stroke.changed) {
        remember();
        state.stroke.changed = true;
      }
      r.map[y][x] = state.tool;
    }
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
