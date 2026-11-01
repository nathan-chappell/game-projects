import { afterBattleConversation, healAfterSnowgrave } from '../battle/noelle/aftermath.ts';
import { battlePartyNames } from '../battle/shared/availability.ts';
import { syncPartyStatus } from '../battle/shared/party-status.ts';
import { skipFallenTurns } from '../battle/shared/rules.ts';
import type { Point, Room } from '../world/types.ts';
import { partyNames } from './config.ts';
import type { Elements } from './dom.ts';
import type { GameState } from './types.ts';

interface Dependencies {
  readonly state: GameState;
  readonly battleControls: { sync: () => void };
  readonly openDialogue: (lines: string[], kind?: string, customSpeaker?: string | null) => void;
  readonly storyUI: () => void;
  readonly canvas: HTMLCanvasElement;
  readonly choiceDialogOpen: () => boolean;
  readonly $: Elements;
  readonly announce: (t: string) => void;
  readonly current: () => Room;
  readonly changeRoom: (
    index: number,
    throughDoor?: boolean,
    preferred?: Point | undefined,
    bossConfirmed?: boolean,
  ) => boolean;
  readonly positionPlayer: (r: Room, preferred?: Point | undefined) => boolean;
  readonly resetFollower: () => void;
  readonly memberInParty: (name: string) => boolean;
  readonly closeDialogue: () => void;
}

/** Synchronization also handles an absent encounter while changing rooms or closing a fight. */
export function createEncounters(dependencies: Dependencies) {
  const state = dependencies.state;

  function syncBossUI() {
    healAfterSnowgrave(state.bossEncounter, state.partyHP);
    syncPartyStatus(state.bossEncounter, state.partyHP);
    if (state.bossEncounter && !state.death) skipFallenTurns(state.bossEncounter, state.partyHP);
    dependencies.battleControls.sync();
  }

  function resetBossEncounter() {
    state.bossEncounter = null;
    syncBossUI();
  }

  function finishNoelleConfrontation() {
    state.story.noelleGone = true;
    state.story.noelleEscaped = true;
    resetBossEncounter();
    state.player.facing = 'right';
    state.doorCooldown = 0.8;
    dependencies.openDialogue(
      afterBattleConversation.map((line) => `[${line.speaker}] * ${line.text}`),
      'noelleAftermath',
    );
    dependencies.storyUI();
    dependencies.canvas.focus({ preventScroll: true });
  }

  function offerBossEntry(index: number) {
    if (state.mode !== 'play' || state.dialogue || dependencies.choiceDialogOpen() || state.bossEncounter)
      return;
    state.pendingBossRoom = index;
    state.keys.clear();
    state.player.moving = false;
    dependencies.$('bossChoiceDialog').showModal();
    dependencies.announce('Proceed to the boss fight? Choose Proceed or Not yet.');
  }

  function declineBossEntry() {
    state.pendingBossRoom = null;
    dependencies.$('bossChoiceDialog').close();
    state.keys.clear();
    const walkway = state.project.rooms.findIndex((room) => room.scene === 'glitchWorld');
    if (dependencies.current().scene === 'glitchBoss' && walkway >= 0)
      dependencies.changeRoom(walkway, true, { x: 14, y: 6 });
    else {
      dependencies.positionPlayer(dependencies.current(), { x: 14, y: 6 });
      if (state.story.joined) dependencies.resetFollower();
    }
    state.doorCooldown = 0.8;
    dependencies.canvas.focus({ preventScroll: true });
  }

  function partyHasFallen() {
    if (state.bossEncounter)
      return battlePartyNames(state.bossEncounter).every((name) => state.partyHP[name] <= 0);
    return partyNames.filter(dependencies.memberInParty).every((name) => state.partyHP[name] <= 0);
  }

  function beginDeath() {
    if (state.death || state.holeFall || state.padJump || dependencies.choiceDialogOpen()) return;
    state.death = { age: 0, menuShown: false };
    state.keys.clear();
    state.player.moving = false;
    state.cameraShakeTime = 0;
    dependencies.closeDialogue();
    dependencies.$('toast').hidden = true;
    dependencies.announce('Your party has fallen.');
  }

  return {
    syncBossUI,
    resetBossEncounter,
    finishNoelleConfrontation,
    offerBossEntry,
    declineBossEntry,
    partyHasFallen,
    beginDeath,
  };
}
