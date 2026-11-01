import { T } from '../../game/config.ts';
import type { Elements } from '../../game/dom.ts';
import { context2D } from '../../game/dom.ts';
import type { GameState } from '../../game/types.ts';
import type { PlacedObject, Point, Room } from '../../world/types.ts';

interface Dependencies {
  readonly current: () => Room;
  readonly state: GameState;
  readonly openDialogue: (lines: string[], kind?: string, customSpeaker?: string | null) => void;
  readonly $: Elements;
  readonly announce: (t: string) => void;
  readonly canvas: HTMLCanvasElement;
  readonly nearSavePoint: () => boolean;
  readonly roomSpikes: (r?: Room) => PlacedObject[];
  readonly findStart: (r: Room, preferred?: Point) => { x: number; y: number };
  readonly closeDialogue: () => void;
}

export function createCore(dependencies: Dependencies) {
  const state = dependencies.state;

  function nearGoldenDoor() {
    return (
      dependencies.current().scene === 'darkGoldenHall' &&
      !dependencies.current().hideGoldenDoor &&
      Math.hypot(state.player.x - 472, state.player.y - 375) < 85
    );
  }

  function openCoreGlitchConversation() {
    dependencies.openDialogue(
      ['[Ralsey] * What is that?', "[Susie] * Maybe that's what the Froggit was talking about."],
      'coreGlitch',
    );
  }

  function openCoreConversation() {
    dependencies.openDialogue(
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
    dependencies.openDialogue(
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

  function openGoldenDoorChoice() {
    if (
      state.death ||
      state.mode !== 'play' ||
      !nearGoldenDoor() ||
      dependencies.$('goldenDoorChoiceDialog').open
    )
      return;
    state.keys.clear();
    state.player.moving = false;
    dependencies.$('goldenDoorChoiceDialog').showModal();
    dependencies.announce('Enter the golden doors? Choose Enter or Stay here.');
  }

  function stayAtGoldenDoors() {
    dependencies.$('goldenDoorChoiceDialog').close();
    state.keys.clear();
    dependencies.canvas.focus({ preventScroll: true });
  }

  function inspectGoldenDoor() {
    if (!nearGoldenDoor() || dependencies.nearSavePoint()) return false;
    if (state.story.teamJoined && state.story.joined && !state.story.goldenDoorExplained) {
      openGoldenDoorConversation();
      return true;
    }
    openGoldenDoorChoice();
    return true;
  }

  function tryCoreSpikeFall() {
    const destination = { coreEntrance: 'coreLower', coreLower: 'coreDepths', coreDepths: 'glitchWorld' }[
      dependencies.current().scene ?? ''
    ];
    if (!destination) return false;
    const spike = dependencies
      .roomSpikes()
      .find(
        (point) => Math.hypot(state.player.x - (point.x * T + 20), state.player.y - (point.y * T + 20)) < 58,
      );
    if (!spike) return false;
    const targetRoom = state.project.rooms.findIndex((room) => room.scene === destination);
    if (targetRoom < 0 || !dependencies.findStart(state.project.rooms[targetRoom])) return false;
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
      context2D(frame).drawImage(dependencies.canvas, 0, 0);
      state.holeFall.worldFrame = frame;
    }
    dependencies.closeDialogue();
    state.player.moving = false;
    state.cameraShakeTime = 0.22;
    dependencies.announce('The floor near the spike breaks! The whole party falls.');
    return true;
  }

  return {
    nearGoldenDoor,
    openCoreGlitchConversation,
    openCoreConversation,
    openGoldenDoorConversation,
    openGoldenDoorChoice,
    stayAtGoldenDoors,
    inspectGoldenDoor,
    tryCoreSpikeFall,
  };
}
