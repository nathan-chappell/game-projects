import type { Point, Room } from '../world/types.ts';
import type { Elements } from './dom.ts';
import { present } from './invariants.ts';
import type { GameState } from './types.ts';

interface Dependencies {
  readonly current: () => Room;
  readonly state: GameState;
  readonly cellOpen: (r: Room, x: number, y: number, avoidFlowey?: boolean) => boolean;
  readonly toast: (t: string) => void;
  readonly announce: (t: string) => void;
  readonly changeRoom: (
    index: number,
    throughDoor?: boolean,
    preferred?: Point | undefined,
    bossConfirmed?: boolean,
  ) => boolean;
  readonly positionPlayer: (r: Room, preferred?: Point | undefined) => boolean;
  readonly resetFollower: () => void;
  readonly choiceDialogOpen: () => boolean;
  readonly $: Elements;
  readonly canvas: HTMLCanvasElement;
  readonly storyUI: () => void;
  readonly openDialogue: (lines: string[], kind?: string, customSpeaker?: string | null) => void;
}

export function createTravel(dependencies: Dependencies) {
  const state = dependencies.state;

  function tryJumpPad(x: number, y: number) {
    const pad = (dependencies.current().jumpPads || []).find((pad) => pad.x === x && pad.y === y);
    if (!pad) {
      state.lastPadContact = null;
      return false;
    }
    const contact = state.roomIndex + ':' + x + ',' + y;
    if (state.lastPadContact === contact) return false;
    state.lastPadContact = contact;
    const targetRoom = pad.targetRoom ?? state.roomIndex,
      destination = state.project.rooms[targetRoom];
    if (!destination || !dependencies.cellOpen(destination, pad.targetX, pad.targetY)) {
      dependencies.toast('This jump pad needs a clear landing spot. Fix it in Build.');
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
    dependencies.announce(
      targetRoom !== state.roomIndex
        ? 'The bounce pad launches your party into the CORE!'
        : 'Your party leaps from the jump pad.',
    );
    return true;
  }

  function updatePadJump(dt: number) {
    present(state.padJump).age += dt;
    if (present(state.padJump).age < 1.5) return;
    const destination = { x: present(state.padJump).targetX, y: present(state.padJump).targetY },
      targetRoom = present(state.padJump).targetRoom;
    state.padJump = null;
    if (targetRoom !== state.roomIndex) {
      dependencies.changeRoom(targetRoom, true, destination);
      dependencies.toast('Everyone landed inside the CORE.');
    } else {
      dependencies.positionPlayer(dependencies.current(), destination);
      if (state.story.joined) dependencies.resetFollower();
    }
    state.lastPadContact = state.roomIndex + ':' + destination.x + ',' + destination.y;
    state.keys.clear();
  }

  function nearHole(distance = 80) {
    return (
      dependencies.current().scene === 'darkGlowPassage' &&
      !dependencies.current().hideHole &&
      Math.hypot(state.player.x - 420, state.player.y - 140) < distance
    );
  }

  function offerHoleJump() {
    if (
      state.mode !== 'play' ||
      state.death ||
      state.dialogue ||
      state.holeFall ||
      dependencies.choiceDialogOpen()
    )
      return;
    state.keys.clear();
    state.player.moving = false;
    dependencies.$('holeChoiceDialog').showModal();
    dependencies.announce('Flowey: If we fall, we cant go back! Choose Jump or Go back.');
  }

  function backFromHole() {
    dependencies.$('holeChoiceDialog').close();
    state.keys.clear();
    dependencies.positionPlayer(dependencies.current(), { x: 8, y: 3 });
    dependencies.canvas.focus({ preventScroll: true });
  }

  function updateHoleFall(dt: number) {
    present(state.holeFall).age += dt;
    state.player.moving = false;
    if (present(state.holeFall).age >= (present(state.holeFall).kind === 'glitch' ? 10 : 1.8)) {
      if (present(state.holeFall).kind === 'core' || present(state.holeFall).kind === 'glitch') {
        const destination = present(state.holeFall).targetRoom,
          glitch = present(state.holeFall).kind === 'glitch';
        state.holeFall = null;
        if (dependencies.changeRoom(present(destination), true)) {
          if (glitch) state.fade = 0;
          dependencies.canvas.focus({ preventScroll: true });
          dependencies.toast('Everyone landed in ' + dependencies.current().name + '.');
          dependencies.announce('The whole party landed in ' + dependencies.current().name + '.');
        }
        return;
      }
      state.holeFall = null;
      dependencies.positionPlayer(dependencies.current(), { x: 11, y: 9 });
      if (state.story.joined) dependencies.resetFollower();
      dependencies.storyUI();
      state.fade = 0.32;
      dependencies.canvas.focus({ preventScroll: true });
      dependencies.openDialogue(['[Flowey] * Well now we need a ladder... lets continue.'], 'holeLanding');
    }
  }

  return { tryJumpPad, updatePadJump, nearHole, offerHoleJump, backFromHole, updateHoleFall };
}
