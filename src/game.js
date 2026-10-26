import { createRenderer } from './renderer.js';

import { setupEditor } from './editor.js';
import { downloadGame } from './export-game.js';
import {
  keyName,
  freshPartyHP,
  freshInventory,
  buildKey,
  T,
  progressKey,
  itemDefinitions,
  partyNames,
  maxHP,
  W,
  H,
  progressFlags,
  tiles,
  followSpeed,
  movementSpeed,
} from './config.js';
import { validProject, defaults, readSavedBuild, upgradeProject, clone, validBuild, validColor } from './world.js';

// The game loop connects the rooms, player, story, saving, and drawing.
export function startGame() {
  // This plain object holds the changing game values, shared with the editor and drawings.
  const state = {};
  // state is the game's notebook. Its values change while you play.

  const $ = (id) => document.getElementById(id);
  const canvas = $('game'),
    ctx = canvas.getContext('2d');

  state.project = undefined;
  try {
    state.project = JSON.parse($('projectData').textContent);
  } catch (e) {
    state.project = null;
  }
  if (!validProject(state.project)) state.project = defaults();
  try {
    const stored = JSON.parse(localStorage.getItem(keyName));
    if (validProject(stored) && stored.updatedAt > state.project.updatedAt) state.project = stored;
  } catch (e) {
    /* File URLs may not provide browser storage. Downloads still work. */
  }
  const savedBuild = readSavedBuild();
  if (savedBuild) state.project = savedBuild.project;
  state.project = upgradeProject(state.project);
  state.mode = 'play';
  state.roomIndex = 0;
  state.tool = 0;
  state.hover = null;
  state.stroke = null;
  state.dialogue = null;
  state.selectedNpcId = null;
  state.npcSequence = 0;
  state.placementLayer = 'normal';
  state.layerApplyMode = false;
  state.glitchComfort = null;
  state.glitchWaiting = null;
  state.bossEncounter = null;
  state.pendingBossRoom = null;
  function choiceDialogOpen() {
    return ['holeChoiceDialog', 'goldenDoorChoiceDialog', 'bossChoiceDialog'].some((id) => $(id).open);
  }
  state.story = {
    met: false,
    joined: false,
    emerging: -1,
    reveal: 0,
    discussion: -1,
    explained: false,
    foundFountain: false,
    fountainWorse: false,
    teamJoined: false,
    dived: false,
    goldenDoorExplained: false,
    coreExplained: false,
    coreFroggitWarned: false,
    coreGlitchNoticed: false,
    glitchArrivalSeen: false,
  };

  state.partyHP = freshPartyHP();
  state.candyTarget = 'Kris';
  state.selectedItem = '';
  state.inventory = freshInventory();
  state.treeHarvests = {};
  state.companions = [];
  state.buster = null;
  state.dive = null;
  state.follower = { x: 0, y: 0, trail: [] };
  state.player = { x: 300, y: 380, facing: 'down', moving: false, step: 0 };
  state.keys = new Set();
  state.undoStack = [];
  state.lastSpikeContact = null;
  state.cameraShakeTime = 0;
  state.death = null;
  state.holeFall = null;
  state.padJump = null;
  state.pendingPad = null;
  state.lastPadContact = null;
  state.lastTime = 0;
  state.fade = 0;
  state.doorCooldown = 0;
  state.toastTimer = undefined;
  state.saveTimer = undefined;
  const current = () => state.project.rooms[state.roomIndex];
  const announce = (t) => {
    $('announcement').textContent = t;
  };
  function toast(t) {
    $('toast').textContent = t;
    $('toast').hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => ($('toast').hidden = true), 3500);
  }

  function buildSnapshot() {
    return { format: 'little-lantern-build', version: 1, savedAt: Date.now(), project: clone(state.project) };
  }
  // localStorage keeps a browser copy after refresh. Build saves and adventure slots stay separate.
  function save() {
    state.project.updatedAt = Date.now();
    try {
      // Keep the edited world separate from snapshots stored in adventure slots.
      if (state.mode === 'build') localStorage.setItem(buildKey, JSON.stringify(buildSnapshot()));
      localStorage.setItem(keyName, JSON.stringify(state.project));
      $('saveStatus').textContent =
        'Build saved in this browser · ' + new Date(state.project.updatedAt).toLocaleTimeString();
      return true;
    } catch {
      $('saveStatus').textContent = 'Could not save in this browser. Download a backup to keep your edits.';
      return false;
    }
  }
  function finishBuildEdits() {
    document.activeElement?.blur();
    endStroke();
    clearTimeout(state.saveTimer);
  }
  $('saveBuildButton').onclick = () => {
    if (state.mode !== 'build') return;
    finishBuildEdits();
    if (save()) {
      toast('Build saved! Your room edits will be kept when you load an adventure.');
      announce('Build saved in this browser.');
    } else toast('Your build could not be saved. Use Download backup to keep it.');
  };
  $('downloadBuildButton').onclick = () => {
    if (state.mode !== 'build') return;
    finishBuildEdits();
    save();
    const blob = new Blob([JSON.stringify(buildSnapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'LittleLantern-Build.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Build backup downloaded. Use Restore backup to bring it back.');
  };
  $('restoreBuildButton').onclick = () => {
    if (state.mode === 'build') $('buildFileInput').click();
  };
  $('buildFileInput').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || state.mode !== 'build') return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Backup too large');
      const build = JSON.parse(await file.text());
      if (!validBuild(build)) throw new Error('Invalid build backup');
      if (state.mode !== 'build') return;
      const restored = upgradeProject(clone(build.project));
      if (!validProject(restored)) throw new Error('Invalid updated build');
      finishBuildEdits();
      const scene = current().scene,
        previousIndex = state.roomIndex;
      remember();
      state.project = restored;
      const matchingRoom = scene ? state.project.rooms.findIndex((room) => room.scene === scene) : previousIndex;
      state.roomIndex = matchingRoom >= 0 && matchingRoom < state.project.rooms.length ? matchingRoom : 0;
      state.pendingPad = null;
      state.selectedNpcId = null;
      state.keys.clear();
      const kept = save();
      updateRoomUI();
      canvas.focus({ preventScroll: true });
      toast(
        kept
          ? 'Build backup restored. Your adventure slots were kept. Undo can bring back the previous build.'
          : 'Build restored for this session. Browser storage is unavailable; keep your backup file.',
      );
    } catch {
      toast('This file is not a valid Little Lantern build backup. Your build and adventure saves were kept.');
    }
  };

  function roomSavePoints(r = current(), index = state.roomIndex) {
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
  function closestSavePoint(room, index, position) {
    return roomSavePoints(room, index).reduce(
      (closest, point) =>
        !closest ||
        Math.hypot(position.x - (point.x * T + 20), position.y - (point.y * T + 20)) <
          Math.hypot(position.x - (closest.x * T + 20), position.y - (closest.y * T + 20))
          ? point
          : closest,
      null,
    );
  }
  function savedAtPoint(slot, index, point) {
    if (!validProgress(slot) || slot.roomIndex !== index) return false;
    const source = slot.savePoint || closestSavePoint(slot.project.rooms[index], index, slot.player);
    return source && source.x === point.x && source.y === point.y;
  }
  function removeSavePoint(x, y) {
    const removed = [];
    try {
      const slots = readProgressSlots();
      slots.forEach((slot, index) => {
        if (savedAtPoint(slot, state.roomIndex, { x, y })) {
          removed.push({ index, slot });
          slots[index] = null;
        }
      });
      if (removed.length) localStorage.setItem(progressKey, JSON.stringify(slots));
    } catch {
      toast('Could not delete linked saves. The save point was kept.');
      return;
    }
    if (!state.stroke.changed) {
      remember();
      state.stroke.changed = true;
    }
    if (removed.length) {
      const undo = state.undoStack[state.undoStack.length - 1];
      undo.removedSaves = [...(undo.removedSaves || []), ...removed];
    }
    current().savePoints = roomSavePoints()
      .filter((point) => point.x !== x || point.y !== y)
      .map((point) => ({ ...point }));
    toast(
      removed.length
        ? 'Save point and ' + removed.length + ' linked save' + (removed.length === 1 ? '' : 's') + ' deleted.'
        : 'Save point removed.',
    );
  }
  function normalizeInventory(saved) {
    // Older saves store a party-wide total, including candy carried by teammates.
    return saved?.items ? { items: clone(saved.items) } : { items: { gCandy: saved?.gCandy ?? 0 } };
  }
  function validInventory(items) {
    if (!items || typeof items !== 'object') return false;
    if (items.items !== undefined)
      return (
        items.items &&
        typeof items.items === 'object' &&
        !Array.isArray(items.items) &&
        Object.entries(items.items).every(
          ([id, count]) =>
            Object.hasOwn(itemDefinitions, id) && Number.isInteger(count) && count >= 0 && count <= 23040,
        )
      );
    return (
      Number.isInteger(items.gCandy) &&
      items.gCandy >= 0 &&
      items.gCandy <= 23040 &&
      (items.heldCandy === undefined ||
        (items.heldCandy &&
          partyNames.every((name) => Number.isInteger(items.heldCandy[name]) && items.heldCandy[name] >= 0) &&
          partyNames.reduce((sum, name) => sum + items.heldCandy[name], 0) === items.gCandy))
    );
  }
  function validCandyProgress(slot) {
    return (
      (slot.partyHP === undefined ||
        (slot.partyHP &&
          partyNames.every(
            (name) => Number.isInteger(slot.partyHP[name]) && slot.partyHP[name] >= 0 && slot.partyHP[name] <= maxHP,
          ))) &&
      (slot.hp === undefined || (Number.isInteger(slot.hp) && slot.hp >= 0 && slot.hp <= maxHP)) &&
      (slot.inventory === undefined || validInventory(slot.inventory)) &&
      (slot.treeHarvests === undefined ||
        (slot.treeHarvests &&
          typeof slot.treeHarvests === 'object' &&
          !Array.isArray(slot.treeHarvests) &&
          Object.keys(slot.treeHarvests).length <= 3840 &&
          Object.entries(slot.treeHarvests).every(
            ([key, count]) =>
              /^\d{1,2}:\d{1,2},\d{1,2}$/.test(key) && Number.isInteger(count) && count >= 0 && count <= 6,
          )))
    );
  }
  function validGlitchWaiting(waiting) {
    return (
      waiting === undefined ||
      waiting === null ||
      (typeof waiting === 'object' &&
        ['Ralsey', 'Susie'].every(
          (name) =>
            waiting[name] &&
            Number.isFinite(waiting[name].x) &&
            waiting[name].x >= 0 &&
            waiting[name].x < 640 &&
            Number.isFinite(waiting[name].y) &&
            waiting[name].y >= 0 &&
            waiting[name].y < 480,
        ))
    );
  }
  function validProgress(slot) {
    return (
      slot &&
      validGlitchWaiting(slot.glitchWaiting) &&
      (slot.savePoint === undefined ||
        (slot.savePoint &&
          Number.isInteger(slot.savePoint.x) &&
          slot.savePoint.x >= 0 &&
          slot.savePoint.x < W &&
          Number.isInteger(slot.savePoint.y) &&
          slot.savePoint.y >= 0 &&
          slot.savePoint.y < H)) &&
      validCandyProgress(slot) &&
      slot.version === 1 &&
      Number.isFinite(slot.savedAt) &&
      validProject(slot.project) &&
      Number.isInteger(slot.roomIndex) &&
      slot.roomIndex >= 0 &&
      slot.roomIndex < slot.project.rooms.length &&
      slot.player &&
      Number.isFinite(slot.player.x) &&
      slot.player.x >= 0 &&
      slot.player.x < 640 &&
      Number.isFinite(slot.player.y) &&
      slot.player.y >= 0 &&
      slot.player.y < 480 &&
      ['up', 'down', 'left', 'right'].includes(slot.player.facing) &&
      slot.story &&
      (slot.story.glitchArrivalSeen === undefined || typeof slot.story.glitchArrivalSeen === 'boolean') &&
      (slot.story.coreGlitchNoticed === undefined || typeof slot.story.coreGlitchNoticed === 'boolean') &&
      (slot.story.coreFroggitWarned === undefined || typeof slot.story.coreFroggitWarned === 'boolean') &&
      (slot.story.coreExplained === undefined || typeof slot.story.coreExplained === 'boolean') &&
      (slot.story.goldenDoorExplained === undefined || typeof slot.story.goldenDoorExplained === 'boolean') &&
      progressFlags.every((key) => typeof slot.story[key] === 'boolean') &&
      (!slot.story.teamJoined || slot.story.joined)
    );
  }
  function readProgressSlots() {
    const raw = localStorage.getItem(progressKey);
    if (raw === null) return [null, null, null];
    const slots = JSON.parse(raw);
    if (!Array.isArray(slots) || slots.length !== 3) throw new Error('Invalid save data');
    return slots;
  }
  function openProgressMenu(action) {
    if (state.holeFall || state.padJump || choiceDialogOpen()) return;
    if (state.death) {
      toast('Use Try again to continue after your party falls.');
      return;
    }
    if (state.mode !== 'play' || isImportantCutscene()) {
      toast('Finish this cutscene before loading a game.');
      return;
    }
    state.keys.clear();
    state.player.moving = false;
    $('saveDialogTitle').textContent = action === 'save' ? 'Save your game' : 'Load your game';
    $('saveDialogNote').textContent =
      action === 'save'
        ? 'Choose a slot. Saves stay in this browser after refreshing.'
        : 'Choose a saved adventure to continue. Unsaved progress will be replaced.';
    $('saveFeedback').textContent = '';
    $('saveSlots').replaceChildren();
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
        button.textContent = action === 'save' ? (slot === null ? 'Save here' : 'Replace save') : 'Load this save';
        button.disabled = action === 'load' && !valid;
        button.onclick = () => {
          if (action === 'load') {
            restoreProgress(slot);
            return;
          }
          if (slot !== null && !window.confirm('Replace the saved game in slot ' + (index + 1) + '?')) return;
          try {
            const point = closestSavePoint(current(), state.roomIndex, state.player);
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
              player: { x: state.player.x, y: state.player.y, facing: state.player.facing },
              story: {
                ...Object.fromEntries(progressFlags.map((key) => [key, state.story[key]])),
                goldenDoorExplained: state.story.goldenDoorExplained,
                coreExplained: state.story.coreExplained,
                coreFroggitWarned: state.story.coreFroggitWarned,
                coreGlitchNoticed: state.story.coreGlitchNoticed,
                glitchArrivalSeen: state.story.glitchArrivalSeen,
              },
            };
            const latest = readProgressSlots();
            latest[index] = snapshot;
            localStorage.setItem(progressKey, JSON.stringify(latest));
            state.partyHP = clone(snapshot.partyHP);
            openProgressMenu('save');
            $('saveFeedback').textContent = 'Saved to slot ' + (index + 1) + '. Everyone’s HP is fully restored.';
            announce('Game saved to slot ' + (index + 1) + '. Kris, Susie, Ralsey and Flowey have full HP.');
          } catch {
            $('saveFeedback').textContent =
              'Could not save. Browser storage may be full or unavailable. Your previous saves were kept.';
          }
        };
        row.append(title, detail, button);
        $('saveSlots').append(row);
      });
    } catch {
      $('saveFeedback').textContent = 'Save storage is unavailable or damaged. Existing saves have not been changed.';
    }
    if (!$('saveDialog').open) $('saveDialog').showModal();
  }
  function restoreProgress(slot) {
    if (!validProgress(slot)) {
      $('saveFeedback').textContent = 'This save cannot be loaded.';
      return;
    }
    const build = readSavedBuild();
    const world = upgradeProject(
      clone(build ? build.project : state.project.updatedAt > slot.project.updatedAt ? state.project : slot.project),
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
      $('saveFeedback').textContent =
        'This adventure needs a room missing from your build. Restore its build backup first.';
      toast($('saveFeedback').textContent);
      return;
    }
    resetBossEncounter();
    $('bossChoiceDialog').close();
    state.pendingBossRoom = null;
    state.death = null;
    state.holeFall = null;
    state.padJump = null;
    state.pendingPad = null;
    state.lastPadContact = null;
    $('goldenDoorChoiceDialog').close();
    $('holeChoiceDialog').close();
    $('gameOverDialog').close();
    clearTimeout(state.saveTimer);
    endStroke();
    closeDialogue();
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
      emerging: -1,
      discussion: -1,
      reveal: slot.story.met ? 1 : 0,
    });
    state.glitchWaiting = slot.glitchWaiting ? clone(slot.glitchWaiting) : null;
    Object.assign(state.player, slot.player, { moving: false, step: 0 });
    state.buster = null;
    state.dive = null;
    state.companions = [];
    state.follower = { x: state.player.x, y: state.player.y, trail: [] };
    state.keys.clear();
    state.lastSpikeContact = null;
    state.cameraShakeTime = 0;
    state.undoStack = [];
    $('undoButton').disabled = true;
    state.fade = 0.32;
    state.doorCooldown = 0.5;
    preparePartyForRoom();
    if (collides(state.player.x, state.player.y))
      positionPlayer(current(), { x: Math.floor(state.player.x / T), y: Math.floor(state.player.y / T) });
    if (state.story.joined) resetFollower();
    updateRoomUI();
    storyUI();
    save();
    $('saveDialog').close();
    canvas.focus({ preventScroll: true });
    toast('Saved game loaded.');
  }
  function memberInParty(name) {
    return name === 'Kris' || (name === 'Flowey' ? state.story.joined : state.story.teamJoined && !friendsWaiting());
  }
  function friendsWaiting() {
    return state.story.glitchArrivalSeen;
  }
  function ensureGlitchWaiting() {
    if (!friendsWaiting()) return;
    const room = state.project.rooms.find((room) => room.scene === 'glitchWorld');
    if (!room) return;
    const used = new Set();
    const pick = (preferred) => {
      const spots = [];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (cellOpen(room, x, y, false) && !used.has(x + ',' + y)) spots.push({ x: x * T + 20, y: y * T + 20 });
      spots.sort(
        (a, b) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y),
      );
      const point = spots[0] || preferred;
      used.add(Math.floor(point.x / T) + ',' + Math.floor(point.y / T));
      return point;
    };
    const ralsey = pick(
      state.glitchWaiting?.Ralsey || { x: Math.max(20, room.spawn.x * T - 60), y: room.spawn.y * T + 20 },
    );
    const susie = pick(state.glitchWaiting?.Susie || { x: Math.max(20, ralsey.x - 40), y: ralsey.y });
    state.glitchWaiting = { Ralsey: ralsey, Susie: susie };
  }
  function roomWaitingFriends() {
    if (!friendsWaiting() || !state.glitchWaiting || current().scene !== 'glitchWorld') return [];
    return ['Ralsey', 'Susie'].map((name) => ({
      name,
      ...state.glitchWaiting[name],
      worried: name === 'Ralsey',
      comforting: name === 'Susie',
    }));
  }
  function awayDescription(name) {
    return friendsWaiting() && ['Ralsey', 'Susie'].includes(name) ? 'Waiting in Glitch World' : 'Not in party yet';
  }
  function isLateStoryRoom(room) {
    return (
      typeof room.scene === 'string' &&
      (room.scene.startsWith('dark') ||
        ['coreEntrance', 'coreLower', 'coreDepths', 'glitchWorld', 'glitchBoss'].includes(room.scene))
    );
  }
  function partyStageForRoom(room, index) {
    if (isLateStoryRoom(room) || (index >= 2 && !room.scene)) return 2;
    if (room.scene === 'worlds' || room.scene === 'fountain') return 1;
    return 0;
  }
  function preparePartyForRoom() {
    // Jumping ahead in Build or loading an older save can bypass recruitment.
    // Repair membership without changing anyone's HP, items or completed dialogue.
    const stage = partyStageForRoom(current(), state.roomIndex);
    if (stage === 2) state.story.teamJoined = true;
    if (stage >= 1 || state.story.teamJoined) {
      state.story.met = true;
      state.story.joined = true;
      state.story.reveal = 1;
      state.story.emerging = -1;
    }
    if (current().scene === 'fountain' && stage >= 1) state.story.explained = true;
    if (isLateStoryRoom(current())) {
      state.story.explained = true;
      state.story.foundFountain = true;
      state.story.fountainWorse = true;
      state.story.dived = true;
    }
  }
  function updateInventoryMenu() {
    const carried = Object.keys(itemDefinitions).filter((id) => (state.inventory.items[id] || 0) > 0);
    if (!carried.includes(state.selectedItem)) state.selectedItem = '';
    $('inventoryItem').replaceChildren();
    for (const id of carried) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.item = id;
      button.textContent = itemDefinitions[id].name + ' × ' + state.inventory.items[id];
      button.setAttribute('aria-pressed', String(state.selectedItem === id));
      if (state.selectedItem === id) button.className = 'primary';
      button.onclick = () => {
        state.selectedItem = id;
        updateInventoryMenu();
        $('inventoryFeedback').textContent = '';
        $('candyTarget').focus();
      };
      $('inventoryItem').append(button);
    }
    if (!carried.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No healing items yet.';
      $('inventoryItem').append(empty);
    }
    $('healingItemControls').hidden = !state.selectedItem;
    if (!memberInParty(state.candyTarget)) state.candyTarget = 'Kris';
    $('partyHPList').replaceChildren();
    $('candyTarget').replaceChildren();
    for (const name of partyNames) {
      const row = document.createElement('p');
      row.className = 'helptext';
      row.textContent =
        name +
        ' · HP: ' +
        state.partyHP[name] +
        ' / ' +
        maxHP +
        (memberInParty(name) ? '' : ' · ' + awayDescription(name));
      const bar = document.createElement('progress');
      bar.value = state.partyHP[name];
      bar.max = maxHP;
      bar.setAttribute('aria-label', name + ' HP');
      row.append(document.createElement('br'), bar);
      $('partyHPList').append(row);
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name + (memberInParty(name) ? '' : ' (' + awayDescription(name) + ')');
      option.disabled = !memberInParty(name);
      $('candyTarget').append(option);
    }
    $('candyTarget').value = state.candyTarget;
    const hp = state.partyHP[state.candyTarget],
      item = itemDefinitions[state.selectedItem];
    $('inventoryHP').textContent = state.candyTarget + ' HP: ' + hp + ' / ' + maxHP;
    $('inventoryHPBar').value = hp;
    $('inventoryHPBar').max = maxHP;
    $('inventoryHPBar').setAttribute('aria-label', state.candyTarget + ' HP');
    $('inventoryContents').textContent = carried.length
      ? 'Kris carries ' +
        carried.map((id) => itemDefinitions[id].name + ' × ' + state.inventory.items[id]).join(', ') +
        '.'
      : 'Kris has no items.';
    $('inventoryItemDescription').textContent = item
      ? item.name + ' · ' + item.description
      : carried.length
        ? 'Select an item to see what it does.'
        : 'Collect healing items to use them here.';
    $('useCandyButton').disabled = !item || hp >= maxHP;
    $('useCandyButton').textContent =
      hp >= maxHP
        ? state.candyTarget + ' has full HP'
        : item
          ? 'Use ' + item.name + ' on ' + state.candyTarget
          : 'Use item';
  }
  $('candyTarget').onchange = (e) => {
    state.candyTarget = e.target.value;
    updateInventoryMenu();
    $('inventoryFeedback').textContent = '';
  };
  function toggleInventory() {
    if (state.death || state.holeFall || state.padJump || choiceDialogOpen()) return;
    if ($('inventoryDialog').open) {
      $('inventoryDialog').close();
      return;
    }
    if ($('helpDialog').open || $('saveDialog').open || $('objectEditDialog').open) {
      toast('Close the current menu, then press O for inventory.');
      return;
    }
    state.keys.clear();
    state.player.moving = false;
    state.selectedItem = '';
    updateInventoryMenu();
    $('inventoryFeedback').textContent = '';
    $('inventoryDialog').showModal();
  }
  $('inventoryButton').onclick = toggleInventory;
  $('closeInventoryButton').onclick = () => $('inventoryDialog').close();
  $('inventoryDialog').addEventListener('close', () => {
    state.keys.clear();
    canvas.focus({ preventScroll: true });
  });
  $('useCandyButton').onclick = () => {
    const hp = state.partyHP[state.candyTarget],
      item = itemDefinitions[state.selectedItem];
    if (
      !$('inventoryDialog').open ||
      !item ||
      !(state.inventory.items[state.selectedItem] > 0) ||
      hp >= maxHP ||
      !memberInParty(state.candyTarget)
    )
      return;
    const rolledHealing = item.minHeal + Math.floor(Math.random() * (item.maxHeal - item.minHeal + 1));
    const restored = Math.min(rolledHealing, maxHP - hp);
    state.partyHP[state.candyTarget] += restored;
    state.inventory.items[state.selectedItem]--;
    storyUI();
    updateInventoryMenu();
    $('inventoryFeedback').textContent =
      state.candyTarget + ' used ' + item.name + ' and recovered ' + restored + ' HP.';
    announce(
      state.candyTarget +
        ' recovered ' +
        restored +
        ' HP. HP: ' +
        state.partyHP[state.candyTarget] +
        ' of ' +
        maxHP +
        '.',
    );
  };
  document.addEventListener(
    'keydown',
    (e) => {
      if (
        (e.key.toLowerCase() !== 'o' && e.code !== 'KeyO') ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.isComposing ||
        e.repeat
      )
        return;
      const typing = (node) => node && (/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName) || node.isContentEditable);
      if (!$('inventoryDialog').open && (typing(e.target) || typing(document.activeElement))) return;
      e.preventDefault();
      toggleInventory();
    },
    true,
  );
  $('loadGameButton').onclick = () => openProgressMenu('load');
  $('closeSaveDialog').onclick = () => $('saveDialog').close();
  $('saveDialog').addEventListener('close', () => {
    state.keys.clear();
    canvas.focus({ preventScroll: true });
  });

  function remember() {
    state.undoStack.push({ project: clone(state.project), roomIndex: state.roomIndex });
    if (state.undoStack.length > 25) state.undoStack.shift();
    $('undoButton').disabled = false;
  }
  function fountainFriends(r = current()) {
    return r.scene === 'fountain' && (!state.story.teamJoined || state.mode === 'build')
      ? [
          { name: 'Ralsey', x: 260, y: 260 },
          { name: 'Susie', x: 420, y: 260 },
        ]
      : [];
  }
  function partyFriends() {
    return state.story.teamJoined && state.mode === 'play'
      ? [...state.companions, ...roomWaitingFriends()]
      : fountainFriends();
  }
  function nearFountainFriend() {
    return partyFriends()
      .filter((n) => Math.hypot(state.player.x - n.x, state.player.y - n.y) < 74)
      .sort(
        (a, b) =>
          Math.hypot(state.player.x - a.x, state.player.y - a.y) -
          Math.hypot(state.player.x - b.x, state.player.y - b.y),
      )[0];
  }
  function cellOpen(r, x, y, avoidFlowey = true) {
    if (roomSpikes(r).some((point) => point.x === x && point.y === y)) return false;
    if (roomTrees(r).some((tree) => tree.x === x && tree.y === y)) return false;
    return (
      !(r.npcs || []).some((n) => n.x === x && n.y === y) &&
      !fountainFriends(r).some((n) => Math.floor(n.x / T) === x && Math.floor(n.y / T) === y) &&
      x >= 0 &&
      y >= 0 &&
      x < W &&
      y < H &&
      !tiles[r.map[y][x]].solid &&
      r.map[y][x] !== 6 &&
      (!avoidFlowey || r !== state.project.rooms[1] || state.story.joined || x !== r.flowey.x || y !== r.flowey.y)
    );
  }
  function findStart(r, preferred = r.spawn) {
    const choices = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cellOpen(r, x, y)) choices.push({ x, y });
    choices.sort(
      (a, b) =>
        Math.abs(a.x - preferred.x) +
        Math.abs(a.y - preferred.y) -
        Math.abs(b.x - preferred.x) -
        Math.abs(b.y - preferred.y),
    );
    return choices[0] || null;
  }
  function positionPlayer(r, preferred) {
    const start = findStart(r, preferred);
    if (!start) return false;
    state.player.x = start.x * T + T / 2;
    state.player.y = start.y * T + T / 2;
    state.player.moving = false;
    state.keys.clear();
    return true;
  }
  function scheduleEncounter() {
    state.story.emerging = -1;
    state.story.discussion = -1;
    if (state.mode === 'play' && current().scene === 'fountain' && state.story.joined && !state.story.teamJoined) {
      state.story.discussion = 0.75;
      state.keys.clear();
    }
    if (state.mode === 'play' && current().scene === 'worlds' && state.story.joined && !state.story.explained) {
      state.story.discussion = 0.65;
      state.keys.clear();
    }
    if (state.mode === 'play' && state.roomIndex === 1 && !state.story.met && !state.story.joined) {
      state.story.emerging = 0.85;
      state.story.reveal = 0;
      state.keys.clear();
    }
  }
  function storyUI() {
    $('inventorySummary').textContent =
      'Items: ' +
      (Object.entries(state.inventory.items)
        .filter(([id, count]) => count > 0)
        .map(([id, count]) => itemDefinitions[id].name + ' × ' + count)
        .join(', ') || 'none');
    $('partyChip').textContent =
      state.story.teamJoined && !friendsWaiting()
        ? 'PARTY · KRIS + FLOWEY + RALSEY + SUSIE'
        : state.story.joined
          ? 'PARTY · KRIS + FLOWEY'
          : 'PARTY · KRIS';
    $('taskIcon').textContent = state.story.joined ? '✿' : '◇';
    $('taskTitle').textContent = state.story.joined
      ? 'Flowey joined you'
      : state.roomIndex === 1
        ? 'A flower in the ruins'
        : 'Explore the old castle';
    $('taskDescription').textContent = state.story.joined
      ? 'He follows your footsteps, even between rooms.'
      : state.roomIndex === 1
        ? 'Listen to what Flowey has to say.'
        : 'Walk through the doorway on the right.';
    $('storySummary').textContent = state.story.joined
      ? 'The UNDERGROUND and the legend of DELTARUNE have collided. Neither of you knows why.'
      : state.roomIndex === 1
        ? 'Something stirs between the old stones. A golden flower pushes through.'
        : 'You wake among cracked stone and faded banners. Somewhere beyond the doorway, something is waiting.';
    chapterUI();
  }
  function chapterUI() {
    if (current().scene === 'glitchBoss') {
      $('taskTitle').textContent = 'A silent figure';
      $('taskDescription').textContent = 'Kris and Flowey face the figure ahead.';
      $('storySummary').textContent = 'The gray road leads to a familiar face in the white silence.';
      return;
    }
    if (current().scene === 'glitchWorld') {
      $('taskTitle').textContent = 'Glitch World';
      $('taskDescription').textContent = friendsWaiting()
        ? 'Continue right with Flowey. Susie is staying here to comfort Ralsey.'
        : 'Follow the gray walkway through the white silence. Everyone made it through the fall.';
      $('storySummary').textContent =
        'The endless fall is over. The CORE has vanished, leaving a white world and a single gray road.';
      return;
    }
    if (current().scene === 'coreDepths') {
      $('taskTitle').textContent = 'Deeper into the CORE';
      $('taskDescription').textContent =
        'The floor near this spike looks unstable too. Save at the golden star before exploring.';
      $('storySummary').textContent = 'Another floor collapsed. The party has fallen farther beneath the CORE.';
      return;
    }
    if (current().scene === 'coreLower') {
      $('taskTitle').textContent = 'Below the CORE';
      $('taskDescription').textContent =
        'Explore the lower chamber. Its spike is surrounded by unstable flooring. The golden star lets you save your progress.';
      $('storySummary').textContent = 'The floor gave way beneath the party. The entrance above is out of reach.';
      return;
    }
    if (current().scene === 'coreEntrance') {
      $('taskTitle').textContent = 'Inside the CORE';
      $('taskDescription').textContent = 'Explore the metal walkway. The floor near the spike looks unstable.';
      $('storySummary').textContent =
        'The bounce pad carried everyone into the CORE. Warning lights flicker along the pipes.';
      return;
    }
    if (current().scene === 'darkFurnace') {
      $('taskTitle').textContent = state.story.coreExplained ? 'Enter the CORE' : 'Explore the furnace chamber';
      $('taskDescription').textContent =
        'Pass Froggit and step onto the glowing bounce pad on the right to launch into the CORE. Head left to return to the doors.';
      $('storySummary').textContent =
        'Beyond the golden doors, cold darkness gives way to red furnace light and bubbling lava.';
      return;
    }
    if (current().scene === 'darkGoldenHall') {
      $('taskTitle').textContent = 'Approach the golden door';
      $('taskDescription').textContent = 'Follow the outlined walkway toward the towering golden door.';
      $('storySummary').textContent =
        'The purple gives way to black. Golden vines curl around a towering, silent doorway.';
      return;
    }
    if (current().scene === 'darkWindingPassage') {
      $('taskTitle').textContent = 'Follow the winding path';
      $('taskDescription').textContent =
        'Go up, cross the bridge above the gap, then follow the right-hand passage down.';
      $('storySummary').textContent = 'The path folds around a purple chasm. A soft glow marks the way ahead.';
      return;
    }
    if (current().scene === 'darkJumpIslands') {
      $('taskTitle').textContent = 'Cross the leaping isles';
      $('taskDescription').textContent = 'Step onto the glowing red arrows to jump between the platforms.';
      $('storySummary').textContent = 'Three round islands float in the purple dark. Jump pads point the way across.';
      return;
    }
    if (current().scene === 'darkGlowPassage') {
      $('taskTitle').textContent = 'Explore the glowing passage';
      $('taskDescription').textContent =
        state.player.y > 300
          ? 'You reached the lower platform. The way back is out of reach.'
          : 'Approach the gray hole. Flowey has a warning before you jump.';
      $('storySummary').textContent =
        'Violet light traces the edges of the passage, and soft motes drift through the darkness.';
      return;
    }
    if (current().scene === 'darkDescent') {
      $('taskTitle').textContent = 'Follow the passage down';
      $('taskDescription').textContent = 'Explore the wider ledge below, or head back up to the junction.';
      $('storySummary').textContent =
        'A narrow black passage descends through the purple silence of D.G.W, opening into a broad ledge at its base.';
      return;
    }
    if (current().scene === 'darkJunction') {
      $('taskTitle').textContent = 'Explore the junction';
      $('taskDescription').textContent = 'The black passage branches downward. Where does it lead?';
      $('storySummary').textContent =
        'Golden stars are far behind. Purple motes drift across a wide, silent crossroads in D.G.W.';
      return;
    }
    if (current().scene === 'darkArrival') {
      $('taskTitle').textContent = 'Explore D.G.W';
      $('taskDescription').textContent = 'Follow the black passage to the right. Your friends are with you.';
      $('storySummary').textContent =
        'You emerge into a purple world. A black passage stretches ahead. Kris, Flowey, Ralsey and Susie made it through together.';
      return;
    }
    if (!state.story.joined) return;
    if (state.story.teamJoined || state.story.fountainWorse) {
      $('taskTitle').textContent = state.story.teamJoined ? 'Four friends, one mystery' : 'Rude Buster made it worse';
      $('taskDescription').textContent = state.story.teamJoined
        ? 'Face the Dark Fountain and press C or Z to investigate it together.'
        : 'The fountain absorbed the attack. Everyone needs to pull back.';
      $('storySummary').textContent =
        'Susie’s Rude Buster fed the fountain instead of stopping it. The darkness is stronger. The four of you must find another way together.';
      return;
    }
    if (current().scene === 'fountain' || state.story.foundFountain) {
      $('taskTitle').textContent = state.story.foundFountain
        ? 'The fountain is still growing'
        : 'Friends at the fountain';
      $('taskDescription').textContent = state.story.foundFountain
        ? 'Ralsey and Susie are holding it steady. Talk to them with Z.'
        : 'Ralsey and Susie need your help. Listen to what happened.';
      $('storySummary').textContent =
        'The cracks lead to a Dark Fountain. Ralsey’s spell slows its magic while Susie guards the edge. Two worlds are pulling it open.';
      return;
    }
    $('taskTitle').textContent = state.story.explained
      ? 'Follow the glowing cracks'
      : current().scene === 'worlds'
        ? 'Two worlds, one clue'
        : 'Continue to the Echo Chamber';
    $('taskDescription').textContent = state.story.explained
      ? 'Follow the light through the Echo Chamber’s right-hand doorway.'
      : current().scene === 'worlds'
        ? 'Kris and Flowey compare what they remember.'
        : 'Take the right-hand doorway in the Silent Hall.';
    $('storySummary').textContent = state.story.explained
      ? 'Could a Dark Fountain have touched the Underground’s barrier? You have a theory, but still need to find the source.'
      : current().scene === 'worlds'
        ? 'An old altar hums with two different kinds of magic. The crack above it glows.'
        : 'Flowey is with you. A strange light shines from the next chamber.';
  }
  function changeRoom(index, throughDoor = false, preferred, bossConfirmed = false) {
    const next = state.project.rooms[index];
    if (!next || !findStart(next)) {
      toast('That room needs an open floor tile and a starting spot.');
      return false;
    }
    if (next.scene === 'glitchBoss' && state.mode === 'play' && !bossConfirmed) {
      offerBossEntry(index);
      return false;
    }
    resetBossEncounter();
    state.roomIndex = index;
    preparePartyForRoom();
    state.lastPadContact = null;
    state.pendingPad = null;
    state.lastSpikeContact = null;
    state.cameraShakeTime = 0;
    positionPlayer(next, preferred);
    state.doorCooldown = 0.8;
    state.fade = throughDoor ? 0.32 : 0;
    closeDialogue();
    state.buster = null;
    if (state.story.joined) resetFollower();
    scheduleEncounter();
    updateRoomUI();
    return true;
  }
  function defaultRoomBackground(room = current()) {
    if (['glitchWorld', 'glitchBoss'].includes(room.scene)) return '#ffffff';
    return ['darkGoldenHall', 'darkFurnace', 'coreEntrance', 'coreLower', 'coreDepths'].includes(room.scene)
      ? '#000000'
      : room.theme === 'dark'
        ? '#a349a4'
        : room.theme === 'garden'
          ? '#253c35'
          : room.theme === 'castle'
            ? '#24232e'
            : '#30223d';
  }
  function roomBackground(room = current()) {
    return room.backgroundColor || defaultRoomBackground(room);
  }
  $('roomBackgroundColor').onchange = (e) => {
    if (!validColor(e.target.value) || e.target.value === roomBackground()) return;
    remember();
    current().backgroundColor = e.target.value;
    save();
  };
  $('resetRoomBackground').onclick = () => {
    if (current().backgroundColor === undefined) return;
    remember();
    delete current().backgroundColor;
    save();
    updateRoomUI();
  };
  function updateRoomUI() {
    $('roomBackgroundColor').value = roomBackground();
    $('roomName').textContent = current().name;
    $('locationHint').textContent =
      'ROOM ' +
      String(state.roomIndex + 1).padStart(2, '0') +
      ' / ' +
      String(state.project.rooms.length).padStart(2, '0');
    $('roomSelect').replaceChildren();
    $('doorTarget').replaceChildren();
    const none = document.createElement('option');
    none.value = '-1';
    none.textContent = 'No destination yet';
    $('doorTarget').append(none);
    state.project.rooms.forEach((r, i) => {
      for (const select of [$('roomSelect'), $('doorTarget')]) {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = r.name;
        select.append(option);
      }
    });
    $('roomSelect').value = String(state.roomIndex);
    $('doorTarget').value = String(current().target);
    $('roomTitle').value = current().name;
    $('floweyWords').value = current().dialogue.join('\n');
    $('addRoom').disabled = state.project.rooms.length >= 20;
    $('floweyTool').disabled = state.roomIndex !== 1;
    $('floweyWords').disabled = state.roomIndex !== 1 && !['worlds', 'fountain'].includes(current().scene);
    $('dialogueLabel').textContent =
      current().scene === 'fountain'
        ? 'The fountain encounter'
        : current().scene === 'worlds'
          ? 'Kris & Flowey’s conversation'
          : 'Flowey’s opening speech';
    $('doorNote').textContent = Object.entries(current().doorLinks || {})
      .map(([tile, target]) => 'Door at ' + tile + ' → ' + state.project.rooms[target].name + '.')
      .join(' ');
    if (state.roomIndex !== 1 && state.tool === 'flowey') selectTool(0);
    updateNpcUI();
    storyUI();
  }
  function setMode(next) {
    if (state.holeFall || state.padJump || choiceDialogOpen()) return;
    if (state.death) {
      toast('Use Try again to continue after your party falls.');
      return;
    }
    if (state.dive) {
      toast('Finish this I. C. before opening Build.');
      return;
    }
    endStroke();
    clearTimeout(state.saveTimer);
    save();
    if (next === 'play' && !positionPlayer(current())) {
      toast('Paint an open floor tile before you explore.');
      return;
    }
    if (next === 'build') resetBossEncounter();
    state.mode = next;
    state.keys.clear();
    closeDialogue();
    state.hover = null;
    state.buster = null;
    state.story.emerging = -1;
    state.story.discussion = -1;
    if (state.mode === 'play') {
      preparePartyForRoom();
      if (state.story.joined) resetFollower();
      scheduleEncounter();
    }
    $('playMode').setAttribute('aria-pressed', String(state.mode === 'play'));
    $('buildMode').setAttribute('aria-pressed', String(state.mode === 'build'));
    $('explorePanel').hidden = state.mode !== 'play';
    $('buildPanel').hidden = state.mode !== 'build';
    $('playControls').hidden = state.mode !== 'play';
    $('editorCaption').hidden = state.mode !== 'build';
    $('pageHeading').textContent =
      state.mode === 'build' ? 'What will your world look like?' : 'Two worlds. One strange awakening.';
    $('pageSubtitle').textContent =
      state.mode === 'build'
        ? 'Paint a room. Write a conversation. Then step inside.'
        : 'You are Kris. An old castle waits beyond the dark.';
    $('stageMode').textContent = state.mode === 'build' ? 'ROOM WORKSHOP' : 'YOUR ADVENTURE';
    canvas.setAttribute(
      'aria-label',
      state.mode === 'build'
        ? 'Room map editor. Choose a tile from the palette, then click or drag on the map to paint.'
        : 'Two Worlds game. Use arrow keys or W A S D to walk. Press Z or Enter to talk. Press C to inspect nearby objects.',
    );
    updateRoomUI();
    canvas.focus({ preventScroll: true });
  }
  function roomNpcs() {
    return current().npcs || [];
  }
  const { selectTool, updateNpcUI, roomObjectGroups, endStroke, npcAt } = setupEditor(state, {
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
  });

  const dirKeys = {
    ArrowUp: 'up',
    w: 'up',
    W: 'up',
    ArrowDown: 'down',
    s: 'down',
    S: 'down',
    ArrowLeft: 'left',
    a: 'left',
    A: 'left',
    ArrowRight: 'right',
    d: 'right',
    D: 'right',
  };
  canvas.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (state.mode === 'build' && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        $('undoButton').click();
      }
      return;
    }
    if (
      state.death ||
      state.holeFall ||
      state.padJump ||
      choiceDialogOpen() ||
      state.mode !== 'play' ||
      $('saveDialog').open ||
      $('inventoryDialog').open
    )
      return;
    if (dirKeys[e.key]) {
      e.preventDefault();
      state.keys.add(dirKeys[e.key]);
    }
    if (['z', 'Z', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      if (!e.repeat) talk();
    }
    if (['x', 'X', 'Escape'].includes(e.key)) {
      e.preventDefault();
      if (
        state.dialogue &&
        (importantKinds.has(state.dialogue.kind) || ['intro', 'worlds'].includes(state.dialogue.kind))
      )
        advanceDialogue();
      else closeDialogue();
    }
  });
  // Game shortcuts work even when the canvas has not been clicked yet.
  document.addEventListener('keydown', (e) => {
    if (
      !['c', 'C', 'l', 'L'].includes(e.key) ||
      e.defaultPrevented ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.isComposing
    )
      return;
    const typing = (node) =>
      node &&
      (/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName) ||
        node.isContentEditable ||
        node.closest?.('[contenteditable="true"],[contenteditable=""]'));
    if (
      state.death ||
      state.holeFall ||
      state.padJump ||
      choiceDialogOpen() ||
      state.mode !== 'play' ||
      $('helpDialog').open ||
      $('saveDialog').open ||
      $('inventoryDialog').open ||
      typing(e.target) ||
      typing(document.activeElement)
    )
      return;
    e.preventDefault();
    if (e.repeat) return;
    canvas.focus({ preventScroll: true });
    if (e.key.toLowerCase() === 'l') skipDialogue();
    else inspectObject();
  });
  window.addEventListener('keyup', (e) => {
    if (dirKeys[e.key]) state.keys.delete(dirKeys[e.key]);
  });
  window.addEventListener('blur', () => {
    state.keys.clear();
    endStroke();
  });
  canvas.addEventListener('blur', () => state.keys.clear());
  document.addEventListener('visibilitychange', () => state.keys.clear());
  document.querySelectorAll('[data-dir]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      if (state.mode !== 'play') return;
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      b.setPointerCapture(e.pointerId);
      state.keys.add(b.dataset.dir);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      b.addEventListener(event, () => state.keys.delete(b.dataset.dir));
    b.addEventListener('keydown', (e) => {
      if (['Enter', ' '].includes(e.key)) {
        e.preventDefault();
        state.keys.add(b.dataset.dir);
      }
    });
    b.addEventListener('keyup', () => state.keys.delete(b.dataset.dir));
    b.addEventListener('blur', () => state.keys.delete(b.dataset.dir));
  });
  function floweyPosition() {
    if (state.mode === 'build')
      return state.roomIndex === 1 ? { x: current().flowey.x * T + 20, y: current().flowey.y * T + 24 } : null;
    if (state.story.joined) return state.follower;
    if (state.roomIndex === 1 && (state.mode === 'build' || state.story.reveal > 0))
      return { x: current().flowey.x * T + 20, y: current().flowey.y * T + 24 };
    return null;
  }
  function nearFlowey() {
    const f = floweyPosition();
    return f && Math.hypot(state.player.x - f.x, state.player.y - f.y) < 82;
  }
  function nearbyNpc() {
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.player.facing];
    for (let distance = 8; distance <= 64; distance += 4) {
      const x = Math.floor((state.player.x + dx * distance) / T),
        y = Math.floor((state.player.y + dy * distance) / T);
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      const npc = npcAt(x, y);
      if (npc) return npc;
      if (tiles[current().map[y][x]].solid) return null;
    }
    return null;
  }
  function speakToNpc(npc) {
    openDialogue(npc.speech, 'npc', npc.name);
    state.dialogue.npcId = npc.id;
  }
  function nearbyObject() {
    const direction = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.player.facing];
    const descriptions = {
      1: 'a stone wall',
      3: 'some flowers',
      4: current().scene === 'fountain' ? 'a Dark Fountain' : 'a pool of water',
      6: 'a doorway',
      7: 'a table',
      8: 'a pillar',
      9: 'some broken stones',
    };
    // Look forward, stopping at the first object instead of reaching through it.
    for (let distance = 12; distance <= 52; distance += 4) {
      const x = Math.floor((state.player.x + direction[0] * distance) / T),
        y = Math.floor((state.player.y + direction[1] * distance) / T);
      if (x < 0 || y < 0 || x >= W || y >= H) break;
      if (x === Math.floor(state.player.x / T) && y === Math.floor(state.player.y / T)) continue;
      const tile = current().map[y][x];
      if (descriptions[tile]) return descriptions[tile];
    }
    return null;
  }
  function facingFountain() {
    if (current().scene !== 'fountain') return false;
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.player.facing];
    for (let distance = 8; distance <= 64; distance += 4) {
      const x = Math.floor((state.player.x + dx * distance) / T),
        y = Math.floor((state.player.y + dy * distance) / T);
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      if (npcAt(x, y)) return false;
      if (x >= 7 && x <= 8 && y >= 3 && y <= 4) return true;
      if (tiles[current().map[y][x]].solid) return false;
    }
    return false;
  }
  function interactFountain() {
    if (!facingFountain() || !state.story.teamJoined || state.story.dived) return false;
    openDialogue(
      [
        '[Kris] * There is something beyond the darkness. A way through.',
        '[Ralsey] * Then this fountain might be a passage between the worlds.',
        '[Susie] * Beats standing around waiting for it to swallow the castle. Come on!',
        '[Kris] * Together.',
        '[Flowey] * Wait. You mean... INTO it?',
      ],
      'fountainDive',
    );
    return true;
  }
  function startFountainDive() {
    state.keys.clear();
    state.player.moving = false;
    state.dive = {
      phase: 'trio',
      age: 0,
      starts: {
        Kris: { x: state.player.x, y: state.player.y },
        Flowey: { x: state.follower.x, y: state.follower.y },
        ...Object.fromEntries(state.companions.map((n) => [n.name, { x: n.x, y: n.y }])),
      },
    };
    announce('Ralsey, Susie and Kris jump into the Dark Fountain.');
  }
  function updateDive(dt) {
    state.dive.age += dt;
    state.player.moving = false;
    if (state.dive.phase === 'trio' && state.dive.age >= 3.4) {
      state.dive.phase = 'hesitate';
      state.dive.age = 0;
      openDialogue(
        [
          '[Flowey] * (This is a bad idea. This is a REALLY bad idea.)',
          '[Flowey] * ...But I am not staying here alone.',
          '[Flowey] * Wait for me!',
        ],
        'floweyHesitate',
      );
    } else if (state.dive.phase === 'flowey' && state.dive.age >= 2.3) {
      state.dive = null;
      state.keys.clear();
      const destination = state.project.rooms.findIndex((r) => r.scene === 'darkArrival');
      if (!changeRoom(destination, true)) {
        toast('The arrival area needs an open floor tile. You can fix it in Build.');
        return;
      }
      state.story.dived = true;
      storyUI();
      openDialogue(
        ['[Narrator] * You arrive in D.G.W.', '[Flowey] * ...Everybody here?', '[Ralsey] * We made it. Stay together.'],
        'fountainArrival',
      );
    }
  }
  function divePose(name) {
    const start = state.dive.starts[name];
    if (!start) return null;
    const order = ['Ralsey', 'Susie', 'Kris'];
    if (name !== 'Flowey' && state.dive.phase !== 'trio') return null;
    if (name === 'Flowey' && state.dive.phase !== 'flowey') return { ...start, scale: 1 };
    const delay = name === 'Flowey' ? 0.1 : 0.15 + order.indexOf(name) * 1.05;
    const t = (state.dive.age - delay) / 0.95;
    if (t <= 0) return { ...start, scale: 1 };
    if (t >= 1) return null;
    return {
      x: start.x + (320 - start.x) * t,
      y: start.y + (172 - start.y) * t - Math.sin(t * Math.PI) * 83,
      scale: 1 - (Math.max(0, t - 0.65) / 0.35) * 0.8,
    };
  }
  function nearbyCandyTree() {
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.player.facing];
    return roomTrees().find((tree) => {
      const vx = tree.x * T + 20 - state.player.x,
        vy = tree.y * T + 20 - state.player.y;
      const forward = vx * dx + vy * dy,
        sideways = Math.abs(vx * dy - vy * dx);
      if (forward < 0 || forward > 64 || sideways > 28) return false;
      for (let t = 0.1; t < 1; t += 0.1) {
        const x = Math.floor((state.player.x + vx * t) / T),
          y = Math.floor((state.player.y + vy * t) / T);
        if (tiles[current().map[y][x]].solid) return false;
      }
      return true;
    });
  }
  function takeTreeCandy() {
    const tree = nearbyCandyTree();
    if (!tree) return false;
    const key = state.roomIndex + ':' + tree.x + ',' + tree.y,
      taken = state.treeHarvests[key] || 0;
    if (taken >= (tree.candy ?? 2)) openDialogue(['[Narrator] * There are no more candys.'], 'treeCandy');
    else {
      state.treeHarvests[key] = taken + 1;
      state.inventory.items.gCandy = (state.inventory.items.gCandy || 0) + 1;
      storyUI();
      openDialogue(['[Narrator] * You got G. Candy!'], 'treeCandy');
    }
    return true;
  }
  function inspectObject() {
    if (state.death || state.holeFall || state.padJump || choiceDialogOpen()) return;
    if (state.bossEncounter?.phase === 'waiting') return;
    if (
      state.mode !== 'play' ||
      state.buster ||
      (state.dive && state.dive.phase !== 'hesitate') ||
      $('helpDialog').open ||
      state.story.emerging >= 0 ||
      state.story.discussion >= 0
    )
      return;
    if (state.dialogue) {
      advanceDialogue();
      return;
    }
    if (inspectGoldenDoor()) return;
    if (nearHole()) {
      offerHoleJump();
      return;
    }
    if (nearSavePoint() && !state.dive) {
      openProgressMenu('save');
      return;
    }
    if (takeTreeCandy()) return;
    if (interactFountain()) return;
    const npc = nearbyNpc();
    if (npc) {
      speakToNpc(npc);
      return;
    }
    if (state.story.joined) {
      openDialogue(['[Flowey] * lets not waste time.'], 'inspect');
      return;
    }
    const object = nearbyObject();
    if (object) openDialogue(['[Narrator] * ' + object], 'inspect');
    else
      openDialogue(['[Narrator] * nothing to inspect here. Face a nearby pillar or table, then press C.'], 'inspect');
  }
  function dialoguePages(lines, customSpeaker = null) {
    const pages = [];
    for (const line of lines) {
      const match = customSpeaker ? null : line.match(/^\[(Kris|Flowey|Ralsey|Susie|Narrator)\]\s*/i);
      const speaker = customSpeaker || (match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : 'Flowey');
      let text = match ? line.slice(match[0].length) : line;
      while (text.length > 140) {
        let cut = text.lastIndexOf(' ', 140);
        if (cut < 40) cut = 140;
        pages.push({ speaker, text: text.slice(0, cut) });
        text = text.slice(cut).trimStart();
      }
      if (text) pages.push({ speaker, text });
    }
    return pages.length ? pages : [{ speaker: 'Flowey', text: '* You need to help me.' }];
  }
  function announcePage() {
    const page = state.dialogue.lines[state.dialogue.index];
    announce((page.speaker === 'Narrator' ? '' : page.speaker + ': ') + page.text);
  }
  function openDialogue(lines, kind = 'chat', customSpeaker = null) {
    state.keys.clear();
    state.player.moving = false;
    state.dialogue = { lines: dialoguePages(lines, customSpeaker), index: 0, shown: 0, kind };
    $('dialogue').hidden = false;
    announcePage();
    renderDialogue();
  }
  function talk() {
    if (state.death || state.holeFall || state.padJump || choiceDialogOpen()) return;
    if (state.bossEncounter?.phase === 'waiting') return;
    if (state.mode !== 'play' || state.buster || (state.dive && state.dive.phase !== 'hesitate')) return;
    if (state.dialogue) {
      advanceDialogue();
      return;
    }
    if (state.story.emerging >= 0 || state.story.discussion >= 0) return;
    if (inspectGoldenDoor()) return;
    if (nearHole()) {
      offerHoleJump();
      return;
    }
    if (nearSavePoint() && !state.dive) {
      openProgressMenu('save');
      return;
    }
    if (takeTreeCandy()) return;
    if (interactFountain()) return;
    const npc = nearbyNpc();
    if (npc) {
      speakToNpc(npc);
      return;
    }
    if (nearFountainFriend()) {
      const friend = nearFountainFriend();
      if (friendsWaiting() && current().scene === 'glitchWorld') {
        openDialogue(
          friend.name === 'Susie'
            ? ["[Susie] * It's okay, Ralsey. I'm staying right here with you.", '[Ralsey] * Thank you, Susie...']
            : ['[Ralsey] * I just need a moment...', "[Susie] * Take your time. I've got you."],
          'waitingFriends',
        );
        return;
      }
      if (!state.story.teamJoined && state.story.joined) openFountainScene();
      else
        openDialogue(
          friend.name === 'Ralsey'
            ? [
                state.story.teamJoined
                  ? '[Ralsey] * I am right behind you, Kris. We will find a gentler way to separate the magic.'
                  : '[Ralsey] * I can only slow it down. Please stay away from the dark water.',
                '[Ralsey] * The pulses are coming from both worlds. We need to understand them before we seal anything.',
              ]
            : [
                state.story.teamJoined
                  ? '[Susie] * Yeah, yeah. No more blasting mysterious fountains. I get it.'
                  : '[Susie] * Hey, Kris. There has to be a way to stop this thing.',
                '[Susie] * And, uh... glad you made it. All of you. Even the flower.',
              ],
        );
      return;
    }
    if (!nearFlowey()) {
      toast(
        state.story.joined
          ? 'Walk closer to Flowey, then press Z.'
          : 'Explore the castle. Someone is waiting in the second room.',
      );
      return;
    }
    if (!state.story.met) openDialogue(state.project.rooms[1].dialogue, 'intro');
    else if (current().scene === 'fountain' && !state.story.teamJoined) openFountainScene();
    else if (friendsWaiting()) openDialogue(["[Flowey] * Come on, Kris. Let's keep moving."]);
    else if (state.story.teamJoined)
      openDialogue([
        '* At least there are four of us now.',
        '* Next time someone wants to blast the fountain, I am voting no.',
      ]);
    else if (current().scene === 'worlds') openDialogue(current().dialogue, 'worlds');
    else if (state.story.explained)
      openDialogue([
        '* If a fountain touched the barrier, the cracks might lead us to it.',
        '* Stay close, Kris. We still do not know who opened the way.',
      ]);
    else
      openDialogue([
        '* There is a strange light coming from the next room.',
        '* Take the doorway on the right. I am coming with you, Kris.',
      ]);
  }
  function renderDialogue() {
    if (!state.dialogue) return;
    const page = state.dialogue.lines[state.dialogue.index],
      text = page.text;
    const portraits = {
      Narrator: ['◇', '#d1ccdc'],
      Kris: ['◆', '#91bbeb'],
      Flowey: ['✿', '#efcb84'],
      Ralsey: ['♧', '#99dfb5'],
      Susie: ['★', '#d19de0'],
    };
    const portrait = state.dialogue.kind === 'npc' ? ['♧', '#eeeadd'] : portraits[page.speaker];
    $('speakerName').textContent =
      state.dialogue.kind !== 'npc' && page.speaker === 'Narrator' ? 'Examine' : page.speaker;
    $('speakerPortrait').textContent = portrait[0];
    $('speakerPortrait').style.color = portrait[1];
    $('dialogueText').textContent = text.slice(0, Math.floor(state.dialogue.shown));
    const buttons = 'C / Z / Enter';
    const prompt =
      state.dialogue.shown < text.length
        ? buttons + ' to show all'
        : state.dialogue.index === state.dialogue.lines.length - 1
          ? buttons + ' to finish ▾'
          : buttons + ' to continue ▾';
    $('dialogueNext').textContent =
      prompt + (importantKinds.has(state.dialogue.kind) ? ' · I. C. · cannot skip' : ' · L to skip');
  }
  const importantKinds = new Set([
    'fountain',
    'busterWindup',
    'busterAfter',
    'fountainDive',
    'floweyHesitate',
    'fountainArrival',
    'coreIntro',
  ]);
  function isImportantCutscene() {
    return (
      !!state.dive ||
      !!state.buster ||
      !!(state.dialogue && importantKinds.has(state.dialogue.kind)) ||
      (state.story.discussion >= 0 && current().scene === 'fountain')
    );
  }
  function skipDialogue() {
    if (
      state.mode !== 'play' ||
      choiceDialogOpen() ||
      $('helpDialog').open ||
      $('saveDialog').open ||
      $('inventoryDialog').open
    )
      return;
    if (isImportantCutscene()) {
      toast('I. C. — this important cutscene cannot be skipped.');
      return;
    }
    if (state.story.emerging >= 0) {
      state.story.emerging = -1;
      state.story.reveal = 1;
      openDialogue(state.project.rooms[1].dialogue, 'intro');
    } else if (state.story.discussion >= 0) {
      state.story.discussion = -1;
      openDialogue(current().dialogue, 'worlds');
    }
    if (!state.dialogue) return;
    // Complete only this conversation, keeping its story consequences intact.
    state.dialogue.index = state.dialogue.lines.length - 1;
    state.dialogue.shown = state.dialogue.lines[state.dialogue.index].text.length;
    advanceDialogue();
  }
  function advanceDialogue() {
    if (!state.dialogue) return;
    const text = state.dialogue.lines[state.dialogue.index].text;
    if (state.dialogue.shown < text.length) state.dialogue.shown = text.length;
    else if (state.dialogue.index < state.dialogue.lines.length - 1) {
      state.dialogue.index++;
      state.dialogue.shown = 0;
      announcePage();
    } else {
      const kind = state.dialogue.kind,
        npcId = state.dialogue.npcId;
      closeDialogue();
      if (npcId === 'core-warning-froggit') state.story.coreFroggitWarned = true;
      if (kind === 'coreGlitch') state.story.coreGlitchNoticed = true;
      if (kind === 'coreIntro') {
        state.story.coreExplained = true;
        storyUI();
      }
      if (kind === 'goldenDoors') {
        state.story.goldenDoorExplained = true;
        storyUI();
        openGoldenDoorChoice();
      }
      if (kind === 'fountainDive') startFountainDive();
      if (kind === 'floweyHesitate' && state.dive) {
        state.dive.phase = 'flowey';
        state.dive.age = 0;
        announce('Flowey jumps in last.');
      }
      if (kind === 'intro') recruitFlowey();
      if (kind === 'fountain') {
        state.story.foundFountain = true;
        storyUI();
        openFountainScene();
      }
      if (kind === 'busterWindup') {
        if (state.story.fountainWorse) openBusterAfter();
        else {
          state.buster = { age: 0 };
          state.keys.clear();
          announce('Susie casts Rude Buster at the fountain.');
        }
      }
      if (kind === 'busterAfter') recruitFriends();
      if (kind === 'worlds') {
        const first = !state.story.explained;
        state.story.explained = true;
        storyUI();
        if (first) toast('A new clue: the fountain and the barrier.');
      }
    }
    renderDialogue();
  }
  function openFountainScene() {
    if (!state.story.foundFountain) {
      openDialogue(current().dialogue, 'fountain');
      return;
    }
    if (state.story.fountainWorse) {
      openBusterAfter();
      return;
    }
    openDialogue(
      [
        '[Susie] * Wait. We are not giving up yet. Let me try something stronger.',
        '[Ralsey] * Susie, wait! We do not know how the fountain will react to attack magic!',
        '[Flowey] * That sounds like a very good reason NOT to—',
        '[Susie] * RUDE BUSTER!',
      ],
      'busterWindup',
    );
  }
  function openBusterAfter() {
    openDialogue(
      [
        '[Susie] * ...Uh. That was supposed to make it SMALLER.',
        '[Ralsey] * It absorbed your spell! The fountain is turning the attack into more darkness!',
        '[Flowey] * Great. We just FED it.',
        '[Kris] * Everyone, get back. We need another way.',
        '[Susie] * ...Yeah. My bad. No more blasting it.',
        '[Ralsey] * I cannot hold it here anymore. I am coming with you, Kris. We will find a way together.',
        '[Susie] * Count me in. I helped make this mess bigger. I am helping fix it.',
        '[Flowey] * Four of us against two mixed-up worlds. Okay. Stay close.',
      ],
      'busterAfter',
    );
  }
  function recruitFriends() {
    if (state.story.teamJoined) return;
    const friends = fountainFriends().map((n) => ({ ...n }));
    state.story.teamJoined = true;
    let leader = state.follower;
    state.companions = friends.map((n) => {
      const member = { ...n, trail: routeToPlayer(n, leader) };
      leader = member;
      return member;
    });
    storyUI();
    toast('Ralsey and Susie joined your party!');
    announce('Ralsey and Susie now follow Kris and Flowey.');
  }
  function closeDialogue() {
    if (state.dialogue?.kind === 'bossIntro' && state.bossEncounter) {
      state.bossEncounter.phase = 'waiting';
      syncBossUI();
    }
    if (state.dialogue?.kind === 'glitchArrival') finishGlitchComfort();
    state.dialogue = null;
    $('dialogue').hidden = true;
    $('dialogueText').textContent = '';
    state.keys.clear();
  }
  // A short path connects Flowey to Kris initially. After that he follows the
  // actual movement trail, so he takes the same turns around the castle walls.
  function routeToPlayer(start, target = state.player) {
    const r = current(),
      sx = Math.floor(start.x / T),
      sy = Math.floor(start.y / T),
      tx = Math.floor(target.x / T),
      ty = Math.floor(target.y / T);
    const key = (x, y) => y * W + x,
      queue = [{ x: sx, y: sy }],
      parents = new Map([[key(sx, sy), null]]);
    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head];
      if (cell.x === tx && cell.y === ty) break;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = cell.x + dx,
          y = cell.y + dy,
          k = key(x, y);
        if (!parents.has(k) && cellOpen(r, x, y, false)) {
          parents.set(k, cell);
          queue.push({ x, y });
        }
      }
    }
    if (!parents.has(key(tx, ty))) return [];
    const route = [];
    let cell = { x: tx, y: ty };
    while (cell) {
      route.unshift({ x: cell.x * T + 20, y: cell.y * T + 20 });
      cell = parents.get(key(cell.x, cell.y));
    }
    route.push({ x: target.x, y: target.y });
    return route;
  }
  function recruitFlowey() {
    const f = floweyPosition() || { x: current().flowey.x * T + 20, y: current().flowey.y * T + 24 };
    state.follower = { x: f.x, y: f.y, trail: routeToPlayer(f) };
    state.story.met = true;
    state.story.joined = true;
    state.story.emerging = -1;
    state.story.reveal = 1;
    storyUI();
    toast('Flowey joined you. He will follow your footsteps.');
    announce('Flowey joined your party.');
  }
  function resetFollower() {
    const r = current(),
      cx = Math.floor(state.player.x / T),
      cy = Math.floor(state.player.y / T);
    const tile = [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ]
      .map(([dx, dy]) => ({ x: cx + dx, y: cy + dy }))
      .find((p) => cellOpen(r, p.x, p.y, false));
    const point = tile ? { x: tile.x * T + 20, y: tile.y * T + 20 } : { x: state.player.x, y: state.player.y };
    state.follower = { x: point.x, y: point.y, trail: routeToPlayer(point) };
    if (state.story.teamJoined && !friendsWaiting()) resetCompanions();
    else {
      state.companions = [];
      ensureGlitchWaiting();
    }
  }
  function resetCompanions() {
    const used = new Set([
      Math.floor(state.player.x / T) + ',' + Math.floor(state.player.y / T),
      Math.floor(state.follower.x / T) + ',' + Math.floor(state.follower.y / T),
    ]);
    let leader = state.follower;
    state.companions = ['Ralsey', 'Susie'].map((name) => {
      const cx = Math.floor(leader.x / T),
        cy = Math.floor(leader.y / T);
      const tile = [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
      ]
        .map(([dx, dy]) => ({ x: cx + dx, y: cy + dy }))
        .find((p) => cellOpen(current(), p.x, p.y, false) && !used.has(p.x + ',' + p.y));
      const start = tile ? { x: tile.x * T + 20, y: tile.y * T + 20 } : { x: leader.x, y: leader.y };
      if (tile) used.add(tile.x + ',' + tile.y);
      const member = { name, ...start, trail: routeToPlayer(start, leader) };
      leader = member;
      return member;
    });
  }
  function followTrail(member, target, dt, gap) {
    const last = member.trail.length ? member.trail[member.trail.length - 1] : member;
    if (Math.hypot(last.x - target.x, last.y - target.y) > 1) member.trail.push({ x: target.x, y: target.y });
    let distance = 0,
      previous = member;
    for (const point of member.trail) {
      distance += Math.hypot(point.x - previous.x, point.y - previous.y);
      previous = point;
    }
    let budget = Math.min(followSpeed * dt, Math.max(0, distance - gap));
    while (member.trail.length && budget > 0) {
      const point = member.trail[0],
        dx = point.x - member.x,
        dy = point.y - member.y,
        len = Math.hypot(dx, dy);
      if (len < 0.01) {
        member.trail.shift();
        continue;
      }
      const move = Math.min(len, budget);
      member.x += (dx / len) * move;
      member.y += (dy / len) * move;
      budget -= move;
      if (move >= len - 0.001) member.trail.shift();
    }
  }
  function updateFollower(dt) {
    if (!state.story.joined) return;
    followTrail(state.follower, state.player, dt, 48);
    if (friendsWaiting()) return;
    let leader = state.follower;
    for (const member of state.companions) {
      followTrail(member, leader, dt, 48);
      leader = member;
    }
  }
  $('inspectButton').onclick = () => {
    inspectObject();
    canvas.focus({ preventScroll: true });
  };
  $('talkButton').onclick = () => {
    talk();
    canvas.focus({ preventScroll: true });
  };
  $('restartButton').onclick = () => {
    resetBossEncounter();
    $('bossChoiceDialog').close();
    state.pendingBossRoom = null;
    state.glitchComfort = null;
    state.glitchWaiting = null;
    state.padJump = null;
    state.pendingPad = null;
    state.lastPadContact = null;
    state.holeFall = null;
    $('holeChoiceDialog').close();
    state.death = null;
    $('gameOverDialog').close();
    state.partyHP = freshPartyHP();
    state.candyTarget = 'Kris';
    state.selectedItem = '';
    state.inventory = freshInventory();
    state.treeHarvests = {};
    state.story.met = false;
    state.story.joined = false;
    state.story.emerging = -1;
    state.story.reveal = 0;
    state.story.discussion = -1;
    state.story.explained = false;
    state.story.foundFountain = false;
    state.story.fountainWorse = false;
    state.story.teamJoined = false;
    state.story.dived = false;
    state.story.goldenDoorExplained = false;
    state.story.coreExplained = false;
    state.story.coreFroggitWarned = false;
    state.story.coreGlitchNoticed = false;
    state.story.glitchArrivalSeen = false;
    state.companions = [];
    state.buster = null;
    state.dive = null;
    state.follower = { x: 0, y: 0, trail: [] };
    changeRoom(0);
    canvas.focus({ preventScroll: true });
    toast('Kris wakes in the old castle once more.');
  };
  $('helpButton').onclick = () => {
    state.keys.clear();
    $('helpDialog').showModal();
  };
  $('closeHelp').onclick = () => {
    $('helpDialog').close();
    canvas.focus({ preventScroll: true });
  };
  $('helpDialog').addEventListener('click', (e) => {
    if (e.target === $('helpDialog')) {
      const r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
    }
  });
  $('downloadButton').onclick = async () => {
    document.activeElement?.blur();
    endStroke();
    save();
    try {
      await downloadGame(state.project);
      toast('Your game copy is downloading. Keep it somewhere you can find it.');
    } catch (error) {
      console.error(error);
      toast('Could not create the download. Your game and saved edits are still here. Please try again.');
    }
  };
  function collides(x, y) {
    const r = current(),
      left = x - 10,
      right = x + 10,
      top = y - 7,
      bottom = y + 6;
    if (left < 0 || top < 0 || right >= 640 || bottom >= 480) return true;
    for (let ty = Math.floor(top / T); ty <= Math.floor(bottom / T); ty++)
      for (let tx = Math.floor(left / T); tx <= Math.floor(right / T); tx++)
        if (tiles[r.map[ty][tx]].solid) return true;
    if (
      roomTrees(r).some((tree) => {
        const cx = tree.x * T + 20,
          cy = tree.y * T + 20;
        return left < cx + 12 && right > cx - 12 && top < cy + 5 && bottom > cy - 12;
      })
    )
      return true;
    if (
      (r.npcs || []).some(
        (n) => left < n.x * T + 33 && right > n.x * T + 7 && top < n.y * T + 30 && bottom > n.y * T + 15,
      )
    )
      return true;
    if (fountainFriends(r).some((n) => left < n.x + 13 && right > n.x - 13 && top < n.y + 6 && bottom > n.y - 9))
      return true;
    if (state.story.joined || state.roomIndex !== 1 || state.story.reveal <= 0) return false;
    const dx = r.flowey.x * T + 20,
      dy = r.flowey.y * T + 24;
    return left < dx + 14 && right > dx - 14 && top < dy + 5 && bottom > dy - 8;
  }
  function tryJumpPad(x, y) {
    const pad = (current().jumpPads || []).find((pad) => pad.x === x && pad.y === y);
    if (!pad) {
      state.lastPadContact = null;
      return false;
    }
    const contact = state.roomIndex + ':' + x + ',' + y;
    if (state.lastPadContact === contact) return false;
    state.lastPadContact = contact;
    const targetRoom = pad.targetRoom ?? state.roomIndex,
      destination = state.project.rooms[targetRoom];
    if (!destination || !cellOpen(destination, pad.targetX, pad.targetY)) {
      toast('This jump pad needs a clear landing spot. Fix it in Build.');
      return false;
    }
    state.padJump = {
      age: 0,
      targetRoom,
      targetX: pad.targetX,
      targetY: pad.targetY,
      launchX: pad.launchX ?? pad.targetX,
      launchY: pad.launchY ?? pad.targetY,
      actors: [
        { name: 'Kris', x: state.player.x, y: state.player.y },
        ...(state.story.joined ? [{ name: 'Flowey', x: state.follower.x, y: state.follower.y }] : []),
        ...(state.story.teamJoined
          ? state.companions.map((member) => ({ name: member.name, x: member.x, y: member.y }))
          : []),
      ],
    };
    state.keys.clear();
    state.player.moving = false;
    announce(
      targetRoom !== state.roomIndex
        ? 'The bounce pad launches your party into the CORE!'
        : 'Your party leaps from the jump pad.',
    );
    return true;
  }
  function updatePadJump(dt) {
    state.padJump.age += dt;
    if (state.padJump.age < 1.5) return;
    const destination = { x: state.padJump.targetX, y: state.padJump.targetY },
      targetRoom = state.padJump.targetRoom;
    state.padJump = null;
    if (targetRoom !== state.roomIndex) {
      changeRoom(targetRoom, true, destination);
      toast('Everyone landed inside the CORE.');
    } else {
      positionPlayer(current(), destination);
      if (state.story.joined) resetFollower();
    }
    state.lastPadContact = state.roomIndex + ':' + destination.x + ',' + destination.y;
    state.keys.clear();
  }

  function nearGoldenDoor() {
    return (
      current().scene === 'darkGoldenHall' &&
      !current().hideGoldenDoor &&
      Math.hypot(state.player.x - 472, state.player.y - 375) < 85
    );
  }
  function openCoreGlitchConversation() {
    openDialogue(
      ['[Ralsey] * What is that?', "[Susie] * Maybe that's what the Froggit was talking about."],
      'coreGlitch',
    );
  }
  function openCoreConversation() {
    openDialogue(
      [
        '[Susie] * What is that?',
        "[Flowey] * That's the CORE.",
        '[Susie] * The what? Some kind of giant furnace?',
        "[Flowey] * It's a huge power plant from the Underground. It turns the heat down here into electricity.",
        '[Flowey] * It supplies power to the whole Underground. Or... it did, before everything got mixed up.',
        '[Ralsey] * So the Underground really is crossing into the Dark World...',
        '[Flowey] * Yeah. But the CORE should be in Hotland. Not behind your fancy doors.',
        "[Susie] * Great. Let's try not to blow this thing up.",
        '[Flowey] * For once, we agree.',
      ],
      'coreIntro',
    );
  }
  function openGoldenDoorConversation() {
    openDialogue(
      [
        '[Ralsey] * How did these doors come from???',
        '[Flowey] * You recognize them? What are they?',
        "[Ralsey] * They're the Great Doors. Their magic connects different places in the Dark World.",
        '[Flowey] * Then why is a giant pair of doors sitting out here?',
        '[Ralsey] * They should be near Castle Town. Maybe they were pulled here when our worlds combined.',
        '[Ralsey] * A path behind them might lead somewhere far away. We should be careful before opening them.',
        "[Flowey] * Great. Even the doors are lost. Let's stick together.",
        '[Ralsey] * Whatever is on the other side, we will face it together.',
      ],
      'goldenDoors',
    );
  }

  function syncBossUI() {
    const waiting = state.mode === 'play' && state.bossEncounter?.phase === 'waiting';
    $('bossControls').hidden = !waiting;
    $('talkButton').disabled = $('inspectButton').disabled = !!waiting;
  }
  function resetBossEncounter() {
    state.bossEncounter = null;
    syncBossUI();
  }
  function offerBossEntry(index) {
    if (state.mode !== 'play' || state.dialogue || choiceDialogOpen() || state.bossEncounter) return;
    state.pendingBossRoom = index;
    state.keys.clear();
    state.player.moving = false;
    $('bossChoiceDialog').showModal();
    announce('Proceed to the boss fight? Choose Proceed or Not yet.');
  }
  function declineBossEntry() {
    state.pendingBossRoom = null;
    $('bossChoiceDialog').close();
    state.keys.clear();
    const walkway = state.project.rooms.findIndex((room) => room.scene === 'glitchWorld');
    if (current().scene === 'glitchBoss' && walkway >= 0) changeRoom(walkway, true, { x: 14, y: 6 });
    else {
      positionPlayer(current(), { x: 14, y: 6 });
      if (state.story.joined) resetFollower();
    }
    state.doorCooldown = 0.8;
    canvas.focus({ preventScroll: true });
  }
  $('declineBossButton').onclick = declineBossEntry;
  $('bossChoiceDialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    declineBossEntry();
  });
  $('proceedBossButton').onclick = () => {
    const destination = state.pendingBossRoom;
    state.pendingBossRoom = null;
    $('bossChoiceDialog').close();
    if (!Number.isInteger(destination) || !changeRoom(destination, true, undefined, true)) return;
    // Direct workshop starts also respect Susie and Ralsey's story departure.
    state.story.glitchArrivalSeen = true;
    ensureGlitchWaiting();
    state.companions = [];
    state.bossEncounter = { phase: 'intro' };
    syncBossUI();
    storyUI();
    openDialogue(['[Kris] * Noelle, is that you?', "[Narrator] * She doesn't respond."], 'bossIntro');
    canvas.focus({ preventScroll: true });
  };
  $('leaveBossButton').onclick = () => {
    const walkway = state.project.rooms.findIndex((room) => room.scene === 'glitchWorld');
    if (walkway >= 0) changeRoom(walkway, true, { x: 14, y: 6 });
    canvas.focus({ preventScroll: true });
  };

  function openGoldenDoorChoice() {
    if (state.death || state.mode !== 'play' || !nearGoldenDoor() || $('goldenDoorChoiceDialog').open) return;
    state.keys.clear();
    state.player.moving = false;
    $('goldenDoorChoiceDialog').showModal();
    announce('Enter the golden doors? Choose Enter or Stay here.');
  }
  function stayAtGoldenDoors() {
    $('goldenDoorChoiceDialog').close();
    state.keys.clear();
    canvas.focus({ preventScroll: true });
  }
  $('stayAtGoldenDoorButton').onclick = stayAtGoldenDoors;
  $('goldenDoorChoiceDialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    stayAtGoldenDoors();
  });
  $('enterGoldenDoorButton').onclick = () => {
    const destination = state.project.rooms.findIndex((room) => room.scene === 'darkFurnace');
    if (destination < 0) {
      toast('The furnace room could not be added because this game has reached its room limit.');
      return;
    }
    $('goldenDoorChoiceDialog').close();
    state.keys.clear();
    changeRoom(destination, true);
    announce('Your party enters the furnace chamber.');
  };
  function inspectGoldenDoor() {
    if (!nearGoldenDoor() || nearSavePoint()) return false;
    if (state.story.teamJoined && state.story.joined && !state.story.goldenDoorExplained) {
      openGoldenDoorConversation();
      return true;
    }
    openGoldenDoorChoice();
    return true;
  }

  function nearHole(distance = 80) {
    return (
      current().scene === 'darkGlowPassage' &&
      !current().hideHole &&
      Math.hypot(state.player.x - 420, state.player.y - 140) < distance
    );
  }
  function offerHoleJump() {
    if (state.mode !== 'play' || state.death || state.dialogue || state.holeFall || choiceDialogOpen()) return;
    state.keys.clear();
    state.player.moving = false;
    $('holeChoiceDialog').showModal();
    announce('Flowey: If we fall, we cant go back! Choose Jump or Go back.');
  }
  function backFromHole() {
    $('holeChoiceDialog').close();
    state.keys.clear();
    positionPlayer(current(), { x: 8, y: 3 });
    canvas.focus({ preventScroll: true });
  }
  $('backFromHoleButton').onclick = backFromHole;
  $('holeChoiceDialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    backFromHole();
  });
  $('jumpHoleButton').onclick = () => {
    const actors = [
      { name: 'Kris', x: state.player.x, y: state.player.y },
      ...(state.story.joined ? [{ name: 'Flowey', x: state.follower.x, y: state.follower.y }] : []),
      ...(state.story.teamJoined
        ? state.companions.map((member) => ({ name: member.name, x: member.x, y: member.y }))
        : []),
    ];
    state.holeFall = { age: 0, actors };
    $('holeChoiceDialog').close();
    state.keys.clear();
    closeDialogue();
    announce('The party jumps into the hole.');
  };
  function updateHoleFall(dt) {
    state.holeFall.age += dt;
    state.player.moving = false;
    if (state.holeFall.age >= (state.holeFall.kind === 'glitch' ? 10 : 1.8)) {
      if (state.holeFall.kind === 'core' || state.holeFall.kind === 'glitch') {
        const destination = state.holeFall.targetRoom,
          glitch = state.holeFall.kind === 'glitch';
        state.holeFall = null;
        if (changeRoom(destination, true)) {
          if (glitch) state.fade = 0;
          canvas.focus({ preventScroll: true });
          toast('Everyone landed in ' + current().name + '.');
          announce('The whole party landed in ' + current().name + '.');
        }
        return;
      }
      state.holeFall = null;
      positionPlayer(current(), { x: 11, y: 9 });
      if (state.story.joined) resetFollower();
      storyUI();
      state.fade = 0.32;
      canvas.focus({ preventScroll: true });
      openDialogue(['[Flowey] * Well now we need a ladder... lets continue.'], 'holeLanding');
    }
  }
  function openGlitchArrival() {
    if (state.glitchComfort || state.story.glitchArrivalSeen) return;
    const starts = {
      Kris: { x: state.player.x, y: state.player.y },
      Flowey: { x: state.follower.x, y: state.follower.y },
      ...Object.fromEntries(state.companions.map((member) => [member.name, { x: member.x, y: member.y }])),
    };
    const used = new Set([Math.floor(state.player.x / T) + ',' + Math.floor(state.player.y / T)]);
    const pickSpot = (x, y, fallback) => {
      const spots = [];
      for (let ty = 0; ty < H; ty++)
        for (let tx = 0; tx < W; tx++)
          if (cellOpen(current(), tx, ty, false) && !used.has(tx + ',' + ty))
            spots.push({ x: tx * T + 20, y: ty * T + 20, tx, ty });
      spots.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
      const spot = spots[0];
      if (!spot) return fallback;
      used.add(spot.tx + ',' + spot.ty);
      return { x: spot.x, y: spot.y };
    };
    const ralsey = pickSpot(state.player.x - 80, state.player.y, starts.Ralsey || state.player);
    const susie = pickSpot(ralsey.x - 40, ralsey.y, starts.Susie || ralsey);
    const flowey = pickSpot(state.player.x + 40, state.player.y, starts.Flowey);
    state.glitchComfort = {
      roomIndex: state.roomIndex,
      age: 0,
      reach: 0,
      aside: 0,
      starts,
      targets: { Kris: starts.Kris, Ralsey: ralsey, Susie: susie, Flowey: flowey },
    };
    openDialogue(
      [
        "[Ralsey] * Susie... I'm worried we're not going to make it.",
        "[Susie] * Hey, don't say that. We've made it this far together.",
        "[Susie] * We'll find a way out. I've got you, okay?",
        "[Flowey] * Kris... let's continue without them.",
      ],
      'glitchArrival',
    );
  }
  function updateGlitchComfort(dt) {
    state.glitchComfort.age += dt;
    if (state.dialogue?.index >= 1) state.glitchComfort.reach = Math.min(1, state.glitchComfort.reach + dt / 0.65);
    if (state.dialogue?.index >= 3) state.glitchComfort.aside = Math.min(1, state.glitchComfort.aside + dt / 0.7);
  }
  function glitchComfortPose(name) {
    const start = state.glitchComfort.starts[name] || state.glitchComfort.targets[name],
      target = state.glitchComfort.targets[name];
    const progress = name === 'Flowey' ? state.glitchComfort.aside : Math.min(1, state.glitchComfort.age / 0.65);
    const t = reducedParticleMotion.matches && progress > 0 ? 1 : progress * progress * (3 - 2 * progress);
    return { x: start.x + (target.x - start.x) * t, y: start.y + (target.y - start.y) * t };
  }
  function finishGlitchComfort() {
    if (!state.glitchComfort) return;
    state.story.glitchArrivalSeen = true;
    state.glitchWaiting = {
      Ralsey: { ...state.glitchComfort.targets.Ralsey },
      Susie: { ...state.glitchComfort.targets.Susie },
    };
    if (state.glitchComfort.roomIndex === state.roomIndex && state.mode === 'play') {
      Object.assign(state.follower, glitchComfortPose('Flowey'));
      state.follower.trail = routeToPlayer(state.follower);
    }
    state.companions = [];
    state.glitchComfort = null;
    storyUI();
  }

  function tryCoreSpikeFall() {
    const destination = { coreEntrance: 'coreLower', coreLower: 'coreDepths', coreDepths: 'glitchWorld' }[
      current().scene
    ];
    if (!destination) return false;
    const spike = roomSpikes().find(
      (point) => Math.hypot(state.player.x - (point.x * T + 20), state.player.y - (point.y * T + 20)) < 58,
    );
    if (!spike) return false;
    const targetRoom = state.project.rooms.findIndex((room) => room.scene === destination);
    if (targetRoom < 0 || !findStart(state.project.rooms[targetRoom])) return false;
    state.holeFall = {
      kind: destination === 'glitchWorld' ? 'glitch' : 'core',
      age: 0,
      targetRoom,
      x: state.player.x,
      y: state.player.y,
      actors: [
        { name: 'Kris', x: state.player.x, y: state.player.y },
        ...(state.story.joined ? [{ name: 'Flowey', x: state.follower.x, y: state.follower.y }] : []),
        ...(state.story.teamJoined
          ? state.companions.map((member) => ({ name: member.name, x: member.x, y: member.y }))
          : []),
      ],
    };
    if (state.holeFall.kind === 'glitch') {
      const frame = document.createElement('canvas');
      frame.width = 640;
      frame.height = 480;
      frame.getContext('2d').drawImage(canvas, 0, 0);
      state.holeFall.worldFrame = frame;
    }
    closeDialogue();
    state.player.moving = false;
    state.cameraShakeTime = 0.22;
    announce('The floor near the spike breaks! The whole party falls.');
    return true;
  }

  function partyHasFallen() {
    return partyNames.filter(memberInParty).every((name) => state.partyHP[name] <= 0);
  }
  function beginDeath() {
    if (state.death || state.holeFall || state.padJump || choiceDialogOpen()) return;
    state.death = { age: 0, menuShown: false };
    state.keys.clear();
    state.player.moving = false;
    state.cameraShakeTime = 0;
    closeDialogue();
    $('toast').hidden = true;
    announce('Your party has fallen.');
  }
  function savedPartyAlive(slot) {
    const stage = partyStageForRoom(slot.project.rooms[slot.roomIndex], slot.roomIndex);
    const fullParty = slot.story.teamJoined || stage === 2;
    const names = [
      'Kris',
      ...(slot.story.joined || fullParty || stage >= 1 ? ['Flowey'] : []),
      ...(fullParty ? ['Susie', 'Ralsey'] : []),
    ];
    return names.some((name) => (slot.partyHP?.[name] ?? (name === 'Kris' ? (slot.hp ?? maxHP) : maxHP)) > 0);
  }
  $('gameOverDialog').addEventListener('cancel', (e) => e.preventDefault());
  $('retryGameButton').onclick = () => {
    try {
      const latest = readProgressSlots()
        .filter((slot) => validProgress(slot) && savedPartyAlive(slot))
        .reduce((newest, slot) => (!newest || slot.savedAt > newest.savedAt ? slot : newest), null);
      if (latest) restoreProgress(latest);
      else $('restartButton').click();
    } catch {
      $('retryFeedback').textContent = 'Could not read save storage. Your saves have not been changed.';
    }
  };

  // dt means elapsed seconds. Multiplying speed by dt keeps walking steady on different screens.
  function update(dt) {
    if (state.mode === 'play' && !state.death && partyHasFallen()) beginDeath();
    if (state.death) {
      state.keys.clear();
      state.death.age += dt;
      if (state.death.age >= 2.5 && !state.death.menuShown) {
        state.death.menuShown = true;
        $('retryFeedback').textContent = 'Try again from your latest save, or restart if you have no save.';
        $('helpDialog').close();
        $('inventoryDialog').close();
        $('saveDialog').close();
        $('gameOverDialog').showModal();
      }
      return;
    }
    state.cameraShakeTime = Math.max(0, state.cameraShakeTime - dt);
    state.fade = Math.max(0, state.fade - dt);
    state.doorCooldown = Math.max(0, state.doorCooldown - dt);
    if (
      state.mode !== 'play' ||
      choiceDialogOpen() ||
      $('helpDialog').open ||
      $('saveDialog').open ||
      $('inventoryDialog').open
    )
      return;
    if (state.padJump) {
      updatePadJump(dt);
      return;
    }
    if (state.holeFall) {
      updateHoleFall(dt);
      return;
    }
    if (state.dive && state.dive.phase !== 'hesitate') {
      updateDive(dt);
      return;
    }
    if (state.buster) {
      state.buster.age += dt;
      state.player.moving = false;
      if (state.buster.age >= 1.15 && !state.story.fountainWorse) {
        state.story.fountainWorse = true;
        storyUI();
        announce('The attack hits. The Dark Fountain grows stronger!');
      }
      if (state.buster.age >= 2.8) {
        state.buster = null;
        openBusterAfter();
      }
      return;
    }
    if (state.story.emerging >= 0) {
      state.story.emerging -= dt;
      state.story.reveal = Math.min(1, state.story.reveal + dt * 2);
      state.player.moving = false;
      if (state.story.emerging <= 0) {
        state.story.emerging = -1;
        state.story.reveal = 1;
        openDialogue(state.project.rooms[1].dialogue, 'intro');
      }
      return;
    }
    if (state.story.discussion >= 0) {
      state.story.discussion -= dt;
      state.player.moving = false;
      if (state.story.discussion <= 0) {
        state.story.discussion = -1;
        if (current().scene === 'fountain') openFountainScene();
        else openDialogue(current().dialogue, 'worlds');
      }
      return;
    }
    if (state.bossEncounter && !state.dialogue) {
      state.keys.clear();
      state.player.moving = false;
      return;
    }
    if (state.glitchComfort) updateGlitchComfort(dt);
    if (state.dialogue) {
      state.dialogue.shown += dt * 45;
      renderDialogue();
      state.player.moving = false;
      return;
    }
    if (current().scene === 'glitchBoss' && !state.bossEncounter) {
      offerBossEntry(state.roomIndex);
      return;
    }
    if (current().scene === 'glitchWorld' && state.story.teamJoined && !state.story.glitchArrivalSeen) {
      openGlitchArrival();
      return;
    }
    if (current().scene === 'coreEntrance' && state.story.teamJoined && !state.story.coreGlitchNoticed) {
      openCoreGlitchConversation();
      return;
    }
    if (
      current().scene === 'darkFurnace' &&
      state.story.teamJoined &&
      state.story.joined &&
      !state.story.coreExplained
    ) {
      openCoreConversation();
      return;
    }
    if (current().scene === 'darkFurnace' && !state.story.coreFroggitWarned) {
      const froggit = roomNpcs().find((npc) => npc.id === 'core-warning-froggit');
      if (froggit && Math.hypot(state.player.x - (froggit.x * T + 20), state.player.y - (froggit.y * T + 20)) < 80) {
        speakToNpc(froggit);
        return;
      }
    }
    if (nearGoldenDoor() && state.story.teamJoined && state.story.joined && !state.story.goldenDoorExplained) {
      openGoldenDoorConversation();
      return;
    }
    let dx = (state.keys.has('right') ? 1 : 0) - (state.keys.has('left') ? 1 : 0),
      dy = (state.keys.has('down') ? 1 : 0) - (state.keys.has('up') ? 1 : 0);
    state.player.moving = !!(dx || dy);
    if (state.player.moving) {
      if (dx) state.player.facing = dx > 0 ? 'right' : 'left';
      else state.player.facing = dy > 0 ? 'down' : 'up';
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * movementSpeed * dt;
      dy = (dy / len) * movementSpeed * dt;
      if (!collides(state.player.x + dx, state.player.y)) state.player.x += dx;
      if (!collides(state.player.x, state.player.y + dy)) state.player.y += dy;
      state.player.step += dt * 10;
    }
    updateFollower(dt);
    const tx = Math.floor(state.player.x / T),
      ty = Math.floor(state.player.y / T);
    if (tryCoreSpikeFall()) return;
    if (tryJumpPad(tx, ty)) return;
    if (nearHole(58)) {
      offerHoleJump();
      return;
    }
    updateSpikeContact(tx, ty);
    if (partyHasFallen()) {
      beginDeath();
      return;
    }
    if (!state.doorCooldown && current().map[ty][tx] === 6) {
      state.doorCooldown = 1;
      const target = current().doorLinks?.[tx + ',' + ty] ?? current().target;
      if (target < 0) toast('This doorway needs a destination. Choose one in Build.');
      else
        changeRoom(
          target,
          true,
          current().scene === 'darkFurnace' && state.project.rooms[target]?.scene === 'darkGoldenHall'
            ? { x: 11, y: 10 }
            : current().scene === 'darkGoldenHall' && state.project.rooms[target]?.scene === 'darkWindingPassage'
              ? { x: 14, y: 10 }
              : current().scene === 'darkWindingPassage' && state.project.rooms[target]?.scene === 'darkJumpIslands'
                ? { x: 14, y: 8 }
                : current().scene === 'darkJumpIslands' && state.project.rooms[target]?.scene === 'darkGlowPassage'
                  ? { x: 14, y: 9 }
                  : state.project.rooms[target]?.scene === 'darkJunction'
                    ? current().scene === 'darkDescent'
                      ? { x: 8, y: 10 }
                      : current().scene === 'darkGlowPassage'
                        ? { x: 14, y: 4 }
                        : undefined
                    : undefined,
        );
    }
  }

  function roomSpikes(r = current()) {
    return r.spikes === undefined ? (r.scene === 'darkDescent' ? [{ x: 9, y: 7 }] : []) : r.spikes;
  }
  function updateSpikeContact(x, y) {
    const onSpike = roomSpikes().some((point) => point.x === x && point.y === y);
    const contact = onSpike ? state.roomIndex + ':' + x + ',' + y : null;
    if (contact && contact !== state.lastSpikeContact) {
      const eligible = partyNames.filter((name) => memberInParty(name) && state.partyHP[name] > 0);
      if (eligible.length) {
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        const damage = Math.min(10, state.partyHP[target]);
        state.partyHP[target] -= damage;
        state.cameraShakeTime = 0.22;
        toast('Spike! ' + target + ' lost ' + damage + ' HP. (' + state.partyHP[target] + ' / ' + maxHP + ')');
        announce(target + ' was hurt by a spike and lost ' + damage + ' HP.');
      }
    }
    state.lastSpikeContact = contact;
  }

  function roomTrees(r = current()) {
    return r.trees === undefined ? (r.scene === 'darkDescent' ? [{ x: 5, y: 9 }] : []) : r.trees;
  }

  // Each frame updates the rules, draws the result, then asks the browser for another frame.
  function frame(now) {
    const dt = Math.min((now - state.lastTime) / 1000 || 0, 0.035);
    state.lastTime = now;
    if (!document.hidden) {
      update(dt);
      render(now / 1000);
    }
    requestAnimationFrame(frame);
  }
  const { render, reducedParticleMotion } = createRenderer(ctx, state, {
    roomBackground,
    $,
    roomSavePoints,
    glitchComfortPose,
    roomNpcs,
    roomTrees,
    roomWaitingFriends,
    roomSpikes,
    roomObjectGroups,
    divePose,
    floweyPosition,
    partyFriends,
    facingFountain,
    nearbyCandyTree,
    nearbyNpc,
    nearFountainFriend,
    nearFlowey,
    fountainFriends,
    nearSavePoint,
    importantKinds,
    friendsWaiting,
  });

  positionPlayer(current());
  updateRoomUI();
  // A downloaded copy may contain the editor's previous DOM state; always start
  // in Explore and rebuild controls from the embedded project, not that state.
  $('palette').replaceChildren(...Array.from($('palette').children).slice(-tiles.length));
  $('playMode').setAttribute('aria-pressed', 'true');
  $('buildMode').setAttribute('aria-pressed', 'false');
  $('explorePanel').hidden = false;
  $('buildPanel').hidden = true;
  $('playControls').hidden = false;
  $('editorCaption').hidden = true;
  $('dialogue').hidden = true;
  $('toast').hidden = true;
  $('pageHeading').textContent = 'Two worlds. One strange awakening.';
  $('pageSubtitle').textContent = 'You are Kris. An old castle waits beyond the dark.';
  $('stageMode').textContent = 'YOUR ADVENTURE';
  storyUI();
  $('undoButton').disabled = true;
  selectTool(0);
  resetBossEncounter();
  // Refresh resumes the most recently written slot, regardless of its slot number.
  try {
    const latest = readProgressSlots()
      .filter(validProgress)
      .reduce((newest, slot) => (!newest || slot.savedAt > newest.savedAt ? slot : newest), null);
    if (latest) restoreProgress(latest);
  } catch {
    toast('Could not read your saves. Use Load game to check save storage.');
  }
  window.addEventListener('pagehide', () => {
    endStroke();
    save();
  });
  requestAnimationFrame(frame);
}
