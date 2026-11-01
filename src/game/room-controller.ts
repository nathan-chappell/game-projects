import { createTraffic } from '../rooms/crossing/traffic.ts';
import { createHallway, hallwayCamera, hallwaySettings } from '../rooms/storage/storage-travel.ts';
import type { Point, Room } from '../world/types.ts';
import type { Elements } from './dom.ts';
import type { GameState } from './types.ts';
interface Dependencies {
  readonly state: GameState;
  readonly current: () => Room;
  readonly findStart: (
    r: Room,
    preferred?: Point,
  ) => {
    x: number;
    y: number;
  };
  readonly toast: (t: string) => void;
  readonly offerBossEntry: (index: number) => void;
  readonly resetBossEncounter: () => void;
  readonly preparePartyForRoom: () => void;
  readonly positionPlayer: (r: Room, preferred?: Point | undefined) => boolean;
  readonly closeDialogue: () => void;
  readonly resetFollower: () => void;
  readonly scheduleEncounter: () => void;
  readonly $: Elements;
  readonly selectTool: (value: string | number) => void;
  readonly updateNpcUI: () => void;
  readonly storyUI: () => void;
  readonly choiceDialogOpen: () => boolean;
  readonly endStroke: () => void;
  readonly save: () => boolean;
  readonly canvas: HTMLCanvasElement;
}
export function createRoomController(dependencies: Dependencies) {
  const state = dependencies.state;
  function changeRoom(
    index: number,
    throughDoor = false,
    preferred: Point | undefined = undefined,
    bossConfirmed = false,
  ) {
    const next = state.project.rooms[index];
    const previousScene = dependencies.current().scene;
    if (!next || !dependencies.findStart(next)) {
      dependencies.toast('That room needs an open floor tile and a starting spot.');
      return false;
    }
    if (next.scene === 'glitchBackstage' && state.mode === 'play' && !state.story.tennaInvited) {
      dependencies.toast('Wait for Tenna’s backstage invitation.');
      return false;
    }
    if (next.scene === 'tennaStorage' && state.mode === 'play' && !state.story.tennaStorageInvited) {
      dependencies.toast('Listen to Tenna’s storage invitation first.');
      return false;
    }
    if (!preferred && next.scene === 'glitchBackstage' && previousScene === 'tennaStorage')
      preferred = { x: 14, y: 8 };
    if (!preferred && next.scene === 'glitchStudio' && previousScene === 'glitchBackstage')
      preferred = { x: 14, y: 8 };
    if (!preferred && next.scene === 'tennaStorage' && previousScene === 'storageHallway')
      preferred = { x: 14, y: 8 };
    if (!preferred && next.scene === 'trafficCrossing' && previousScene === 'neonRooftop')
      preferred = { x: 14, y: 7 };
    if (!preferred && next.scene === 'glitchBackstage' && previousScene === 'collisionChamber')
      preferred = { x: 1, y: 8 };
    if (!preferred && next.scene === 'neonRooftop' && previousScene === 'queenPasscode')
      preferred = { x: 14, y: 9 };
    if (
      next.scene === 'glitchBoss' &&
      state.mode === 'play' &&
      !bossConfirmed &&
      !state.story.noelleEscaped &&
      !state.story.noelleGone
    ) {
      dependencies.offerBossEntry(index);
      return false;
    }
    dependencies.resetBossEncounter();
    state.tennaEntrance = null;
    state.roomIndex = index;
    dependencies.preparePartyForRoom();
    state.lastPadContact = null;
    state.pendingPad = null;
    state.lastSpikeContact = null;
    state.cameraShakeTime = 0;
    dependencies.positionPlayer(next, preferred);
    state.storageHallway =
      next.scene === 'storageHallway'
        ? createHallway(
            previousScene === 'trafficCrossing'
              ? hallwaySettings.length - hallwaySettings.start
              : hallwaySettings.start,
          )
        : null;
    state.traffic =
      next.scene === 'trafficCrossing'
        ? createTraffic(previousScene === 'neonRooftop' ? 'right' : 'left')
        : null;
    if (state.storageHallway) {
      state.storageHallway.direction = previousScene === 'trafficCrossing' ? -1 : 1;
      state.player.x = state.storageHallway.x - hallwayCamera(state.storageHallway.x);
      state.player.y = state.storageHallway.y;
      state.player.facing = previousScene === 'trafficCrossing' ? 'left' : 'right';
    }
    if (next.scene === 'glitchBackstage' && previousScene === 'glitchStudio') state.player.facing = 'down';
    state.doorCooldown = 0.8;
    state.fade = throughDoor ? 0.32 : 0;
    dependencies.closeDialogue();
    state.buster = null;
    if (state.story.joined) dependencies.resetFollower();
    dependencies.scheduleEncounter();
    updateRoomUI();
    return true;
  }
  function defaultRoomBackground(room = dependencies.current()) {
    if (room.scene === 'glitchStudio') return '#090914';
    if (room.scene === 'glitchBackstage') return '#170e08';
    if (room.scene === 'tennaStorage') return '#05080d';
    if (['storageHallway', 'trafficCrossing'].includes(room.scene ?? '')) return '#050a16';
    if (room.scene === 'neonRooftop') return '#171427';
    if (room.scene === 'queenPasscode') return '#000000';
    if (room.scene === 'collisionChamber') return '#292724';
    if (['glitchWorld', 'glitchBoss'].includes(room.scene ?? '')) return '#ffffff';
    return ['darkGoldenHall', 'darkFurnace', 'coreEntrance', 'coreLower', 'coreDepths'].includes(
      room.scene ?? '',
    )
      ? '#000000'
      : room.theme === 'dark'
        ? '#a349a4'
        : room.theme === 'garden'
          ? '#253c35'
          : room.theme === 'castle'
            ? '#24232e'
            : '#30223d';
  }
  function roomBackground(room = dependencies.current()) {
    return room.backgroundColor || defaultRoomBackground(room);
  }
  function updateRoomUI() {
    dependencies.$('roomBackgroundColor').value = roomBackground();
    dependencies.$('roomName').textContent = dependencies.current().name;
    dependencies.$('locationHint').textContent =
      'ROOM ' +
      String(state.roomIndex + 1).padStart(2, '0') +
      ' / ' +
      String(state.project.rooms.length).padStart(2, '0');
    dependencies.$('roomSelect').replaceChildren();
    dependencies.$('doorTarget').replaceChildren();
    const none = document.createElement('option');
    none.value = '-1';
    none.textContent = 'No destination yet';
    dependencies.$('doorTarget').append(none);
    state.project.rooms.forEach((r, i) => {
      for (const select of [dependencies.$('roomSelect'), dependencies.$('doorTarget')]) {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = r.name;
        select.append(option);
      }
    });
    dependencies.$('roomSelect').value = String(state.roomIndex);
    dependencies.$('doorTarget').value = String(dependencies.current().target);
    dependencies.$('roomTitle').value = dependencies.current().name;
    dependencies.$('floweyWords').value = dependencies.current().dialogue.join('\n');
    dependencies.$('addRoom').disabled = state.project.rooms.length >= 20;
    dependencies.$('floweyTool').disabled = state.roomIndex !== 1;
    dependencies.$('floweyWords').disabled =
      state.roomIndex !== 1 && !['worlds', 'fountain'].includes(dependencies.current().scene ?? '');
    dependencies.$('dialogueLabel').textContent =
      dependencies.current().scene === 'fountain'
        ? 'The fountain encounter'
        : dependencies.current().scene === 'worlds'
          ? 'Kris & Flowey’s conversation'
          : 'Flowey’s opening speech';
    dependencies.$('doorNote').textContent = Object.entries(dependencies.current().doorLinks || {})
      .map(([tile, target]) => 'Door at ' + tile + ' → ' + state.project.rooms[target].name + '.')
      .join(' ');
    if (state.roomIndex !== 1 && state.tool === 'flowey') dependencies.selectTool(0);
    dependencies.updateNpcUI();
    dependencies.storyUI();
  }
  function setMode(next: 'play' | 'build') {
    if (state.tennaEntrance) {
      dependencies.toast('Finish Tenna’s entrance before opening Build.');
      return;
    }
    if (state.holeFall || state.padJump || dependencies.choiceDialogOpen()) return;
    if (state.death) {
      dependencies.toast('Use Try again to continue after your party falls.');
      return;
    }
    if (state.dive) {
      dependencies.toast('Finish this I. C. before opening Build.');
      return;
    }
    dependencies.endStroke();
    clearTimeout(state.saveTimer);
    dependencies.save();
    if (next === 'play' && !dependencies.positionPlayer(dependencies.current())) {
      dependencies.toast('Paint an open floor tile before you explore.');
      return;
    }
    if (next === 'build') dependencies.resetBossEncounter();
    state.mode = next;
    state.keys.clear();
    dependencies.closeDialogue();
    state.hover = null;
    state.buster = null;
    state.story.emerging = -1;
    state.story.discussion = -1;
    if (state.mode === 'play') {
      dependencies.preparePartyForRoom();
      if (state.story.joined) dependencies.resetFollower();
      dependencies.scheduleEncounter();
    }
    dependencies.$('playMode').setAttribute('aria-pressed', String(state.mode === 'play'));
    dependencies.$('buildMode').setAttribute('aria-pressed', String(state.mode === 'build'));
    dependencies.$('explorePanel').hidden = state.mode !== 'play';
    dependencies.$('buildPanel').hidden = state.mode !== 'build';
    dependencies.$('playControls').hidden = state.mode !== 'play';
    dependencies.$('editorCaption').hidden = state.mode !== 'build';
    dependencies.$('pageHeading').textContent =
      state.mode === 'build' ? 'What will your world look like?' : 'Two worlds. One strange awakening.';
    dependencies.$('pageSubtitle').textContent =
      state.mode === 'build'
        ? 'Paint a room. Write a conversation. Then step inside.'
        : 'You are Kris. An old castle waits beyond the dark.';
    dependencies.$('stageMode').textContent = state.mode === 'build' ? 'ROOM WORKSHOP' : 'YOUR ADVENTURE';
    dependencies.canvas.setAttribute(
      'aria-label',
      state.mode === 'build'
        ? 'Room map editor. Choose a tile from the palette, then click or drag on the map to paint.'
        : 'Two Worlds game. Use arrow keys or W A S D to walk. Press Z or Enter to talk. Press C to inspect nearby objects.',
    );
    updateRoomUI();
    dependencies.canvas.focus({ preventScroll: true });
  }
  function roomNpcs() {
    const npcs = (dependencies.current().npcs || [])
      .filter((n) => !(state.mode === 'play' && n.id === 'jackenstein' && !state.story.jackRevealed))
      .filter(
        (n) =>
          !(
            state.mode === 'play' &&
            n.id === 'queen-terminal' &&
            (state.story.queenSolved || state.queenDeparture != null)
          ),
      );
    return state.mode === 'play' &&
      dependencies.current().scene === 'glitchBackstage' &&
      state.story.tennaStorageInvited &&
      !state.story.jackCandyReceived
      ? npcs.filter((npc) => npc.id !== 'tenna-backstage')
      : npcs;
  }
  return { changeRoom, roomBackground, updateRoomUI, setMode, roomNpcs };
}
