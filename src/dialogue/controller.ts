import physicalChallengeURL from '../../assets/physical-challenge.png?inline';
import { createDarkEncounter } from '../battle/dark/dark-battle.ts';
import { isRescueImportant } from '../battle/noelle/aftermath.ts';
import { isPelletCast } from '../battle/noelle/pellets.ts';
import { isProceedScene } from '../battle/noelle/proceed.ts';
import { completeDarkShine, completeTennaCue, startKrisTurn } from '../battle/shared/rules.ts';
import type { Elements } from '../game/dom.ts';
import { present } from '../game/invariants.ts';
import type { GameState } from '../game/types.ts';
import { createTennaEncounter } from '../rooms/backstage/tenna-finale.ts';
import { giveJackCandy } from '../rooms/monochrome-chamber/jack-story.ts';
import { createQueenPuzzle, queenDemoActive, startQueenDemo } from '../rooms/queen-terminal/queen-puzzle.ts';
import { giveTennaElixirs } from '../rooms/storage/tenna-storage.ts';
import type { Npc, Point, Room } from '../world/types.ts';
interface Dependencies {
  readonly state: GameState;
  readonly announce: (t: string) => void;
  readonly $: Elements;
  readonly choiceDialogOpen: () => boolean;
  readonly inspectJackLever: () => boolean;
  readonly interactTrafficStop: () => boolean;
  readonly inspectGoldenDoor: () => boolean;
  readonly nearHole: (distance?: number) => boolean;
  readonly offerHoleJump: () => void;
  readonly nearSavePoint: () => boolean;
  readonly openProgressMenu: (action: string) => void;
  readonly takeTreeCandy: () => boolean;
  readonly interactFountain: () => boolean;
  readonly nearbyNpc: () => Npc | null;
  readonly speakToNpc: (npc: Npc) => void;
  readonly nearFountainFriend: () => {
    name: string;
    x: number;
    y: number;
  };
  readonly friendsWaiting: () => boolean;
  readonly current: () => Room;
  readonly openFountainScene: () => void;
  readonly nearFlowey: () => boolean | null;
  readonly toast: (t: string) => void;
  readonly tennaPortrait: HTMLCanvasElement;
  readonly jackPortrait: HTMLCanvasElement;
  readonly queenPortrait: HTMLCanvasElement;
  readonly importantKinds: Set<string>;
  readonly beginTennaArrival: () => void;
  readonly storyUI: () => void;
  readonly syncBossUI: () => void;
  readonly canvas: HTMLCanvasElement;
  readonly changeRoom: (
    index: number,
    throughDoor?: boolean,
    preferred?: Point | undefined,
    bossConfirmed?: boolean,
  ) => boolean;
  readonly openGoldenDoorChoice: () => void;
  readonly startFountainDive: () => void;
  readonly recruitFlowey: () => void;
  readonly openBusterAfter: () => void;
  readonly recruitFriends: () => void;
  readonly finishGlitchComfort: () => void;
}
/** Confirming dialogue owns story completion; the frame loop advances text and animations. */
export function createDialogue(dependencies: Dependencies) {
  const state = dependencies.state;
  function dialoguePages(lines: string[], customSpeaker: string | null = null) {
    const pages = [];
    for (const line of lines) {
      const match = customSpeaker
        ? null
        : line.match(/^\[(Kris|Flowey|Ralsey|Susie|Tenna|Queen|Jackenstein|Narrator|\?\?\?)\]\s*/i);
      const speaker =
        customSpeaker || (match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : 'Flowey');
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
    const page = present(state.dialogue).lines[present(state.dialogue).index];
    dependencies.announce((page.speaker === 'Narrator' ? '' : page.speaker + ': ') + page.text);
  }
  function openDialogue(lines: string[], kind = 'chat', customSpeaker: string | null = null) {
    state.keys.clear();
    state.player.moving = false;
    state.dialogue = { lines: dialoguePages(lines, customSpeaker), index: 0, shown: 0, kind };
    dependencies.$('dialogue').hidden = false;
    announcePage();
    renderDialogue();
  }
  function talk() {
    if ((state.tennaEntrance || state.collisionBlackout) && !state.dialogue) return;
    if (state.death || state.holeFall || state.padJump || dependencies.choiceDialogOpen()) return;
    if (state.bossEncounter && !state.dialogue) return;
    if (state.mode !== 'play' || state.buster || (state.dive && state.dive.phase !== 'hesitate')) return;
    if (state.dialogue) {
      advanceDialogue();
      return;
    }
    if (state.story.emerging >= 0 || state.story.discussion >= 0) return;
    if (dependencies.inspectJackLever()) return;
    if (dependencies.interactTrafficStop()) return;
    if (dependencies.inspectGoldenDoor()) return;
    if (dependencies.nearHole()) {
      dependencies.offerHoleJump();
      return;
    }
    if (dependencies.nearSavePoint() && !state.dive) {
      dependencies.openProgressMenu('save');
      return;
    }
    if (dependencies.takeTreeCandy()) return;
    if (dependencies.interactFountain()) return;
    const npc = dependencies.nearbyNpc();
    if (npc) {
      dependencies.speakToNpc(npc);
      return;
    }
    if (dependencies.nearFountainFriend()) {
      const friend = dependencies.nearFountainFriend();
      if (dependencies.friendsWaiting() && dependencies.current().scene === 'glitchWorld') {
        openDialogue(
          friend.name === 'Susie'
            ? [
                "[Susie] * It's okay, Ralsey. I'm staying right here with you.",
                '[Ralsey] * Thank you, Susie...',
              ]
            : ['[Ralsey] * I just need a moment...', "[Susie] * Take your time. I've got you."],
          'waitingFriends',
        );
        return;
      }
      if (!state.story.teamJoined && state.story.joined) dependencies.openFountainScene();
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
    if (!dependencies.nearFlowey()) {
      dependencies.toast(
        state.story.joined
          ? 'Walk closer to Flowey, then press Z.'
          : 'Explore the castle. Someone is waiting in the second room.',
      );
      return;
    }
    if (!state.story.met) openDialogue(state.project.rooms[1].dialogue, 'intro');
    else if (dependencies.current().scene === 'fountain' && !state.story.teamJoined)
      dependencies.openFountainScene();
    else if (dependencies.friendsWaiting()) openDialogue(["[Flowey] * Come on, Kris. Let's keep moving."]);
    else if (state.story.teamJoined)
      openDialogue([
        '* At least there are four of us now.',
        '* Next time someone wants to blast the fountain, I am voting no.',
      ]);
    else if (dependencies.current().scene === 'worlds')
      openDialogue(dependencies.current().dialogue, 'worlds');
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
    if (state.dialogue.kind === 'queenIntro' && text.includes('Watch What Happens')) {
      state.queenPuzzle ??= createQueenPuzzle();
      startQueenDemo(state.queenPuzzle);
    }
    if (state.dialogue.kind === 'collisionIntro' && page.speaker === 'Susie') state.player.facing = 'right';
    const portraits: Record<string, string[]> = {
      Narrator: ['◇', '#d1ccdc'],
      Kris: ['◆', '#91bbeb'],
      Flowey: ['✿', '#efcb84'],
      Ralsey: ['♧', '#99dfb5'],
      Susie: ['★', '#d19de0'],
      Tenna: ['▣', '#d6c9ff'],
      Queen: ['♛', '#a1bbff'],
      Jackenstein: ['◆', '#ee9a45'],
      '???': ['••', '#c44500'],
    };
    const portrait = state.dialogue.kind === 'npc' ? ['♧', '#eeeadd'] : portraits[page.speaker];
    dependencies.$('speakerName').textContent =
      state.dialogue.kind !== 'npc' && page.speaker === 'Narrator' ? 'Examine' : page.speaker;
    if (page.speaker === 'Tenna')
      dependencies.$('speakerPortrait').replaceChildren(dependencies.tennaPortrait);
    else if (page.speaker === 'Jackenstein')
      dependencies.$('speakerPortrait').replaceChildren(dependencies.jackPortrait);
    else if (page.speaker === 'Queen')
      dependencies.$('speakerPortrait').replaceChildren(dependencies.queenPortrait);
    else dependencies.$('speakerPortrait').textContent = portrait[0];
    dependencies.$('speakerPortrait').style.color = portrait[1];
    dependencies.$('dialogueText').textContent = text.slice(0, Math.floor(state.dialogue.shown));
    if (
      page.speaker === 'Tenna' &&
      ['queenSuccess', 'jackReveal', 'jackReward', 'tennaFinale'].includes(state.dialogue.kind ?? '')
    ) {
      const shown = text.slice(0, Math.floor(state.dialogue.shown)),
        parts = shown.split(/(Physical challenge)/gi);
      dependencies.$('dialogueText').replaceChildren(
        ...parts.map((part) => {
          if (!/^Physical challenge$/i.test(part)) return document.createTextNode(part);
          const img = document.createElement('img');
          img.src = physicalChallengeURL;
          img.alt = part;
          img.className = 'physical-challenge-word';
          return img;
        }),
      );
    }
    const buttons = 'C / Z / Enter';
    const prompt =
      state.dialogue.shown < text.length
        ? buttons + ' to show all'
        : state.dialogue.index === state.dialogue.lines.length - 1
          ? buttons + ' to finish ▾'
          : buttons + ' to continue ▾';
    dependencies.$('dialogueNext').textContent =
      prompt +
      (dependencies.importantKinds.has(state.dialogue.kind) ? ' · I. C. · cannot skip' : ' · L to skip');
  }
  function isImportantCutscene() {
    return (
      !!state.dive ||
      !!state.buster ||
      !!state.tennaEntrance ||
      !!state.collisionBlackout ||
      isRescueImportant(state.bossEncounter) ||
      isProceedScene(state.bossEncounter) ||
      isPelletCast(state.bossEncounter) ||
      !!(state.dialogue && dependencies.importantKinds.has(state.dialogue.kind)) ||
      (state.story.discussion >= 0 && dependencies.current().scene === 'fountain')
    );
  }
  function skipDialogue() {
    if (
      state.mode !== 'play' ||
      dependencies.choiceDialogOpen() ||
      dependencies.$('helpDialog').open ||
      dependencies.$('saveDialog').open ||
      dependencies.$('inventoryDialog').open
    )
      return;
    if (isImportantCutscene()) {
      dependencies.toast('I. C. — this important cutscene cannot be skipped.');
      return;
    }
    if (state.story.emerging >= 0) {
      state.story.emerging = -1;
      state.story.reveal = 1;
      openDialogue(state.project.rooms[1].dialogue, 'intro');
    } else if (state.story.discussion >= 0) {
      state.story.discussion = -1;
      openDialogue(dependencies.current().dialogue, 'worlds');
    }
    if (!state.dialogue) return;
    // Complete only this conversation, keeping its story consequences intact.
    state.dialogue.index = state.dialogue.lines.length - 1;
    state.dialogue.shown = state.dialogue.lines[state.dialogue.index].text.length;
    advanceDialogue();
  }
  function advanceDialogue() {
    if (!state.dialogue) return;
    if (state.dialogue.kind === 'queenIntro' && queenDemoActive(present(state.queenPuzzle))) return;
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
      if (kind === 'studioIntro') {
        state.story.studioExplained = true;
        dependencies.beginTennaArrival();
        dependencies.storyUI();
      }
      if (kind === 'tennaArrival') {
        state.story.tennaInvited = true;
        state.tennaEntrance = { stage: 'depart', age: 0 };
        state.keys.clear();
        dependencies.storyUI();
      }
      if (kind === 'tennaBackstage') {
        state.story.tennaStorageInvited = true;
        state.keys.clear();
        dependencies.storyUI();
      }
      if (kind === 'tennaStorageGift') {
        const received = giveTennaElixirs(state.story, state.inventory);
        dependencies.storyUI();
        if (received) dependencies.toast('Received 3 TP Elixirs!');
      }
      if (kind === 'jackReveal' || kind === 'jackReward') {
        const received = giveJackCandy(state.story, state.inventory);
        dependencies.storyUI();
        if (received) dependencies.toast('Received Jack.Candy! Restores a teammate to MAX HP.');
      }
      if (kind === 'collisionIntro') {
        state.story.collisionSeen = true;
        state.collisionBlackout = { age: 0, spoken: false };
        dependencies.storyUI();
      }
      if (kind === 'darkShine') {
        completeDarkShine(present(state.bossEncounter));
        dependencies.syncBossUI();
      }
      if (kind === 'tennaHelpers') {
        completeTennaCue(present(state.bossEncounter));
        dependencies.syncBossUI();
        dependencies.canvas.focus({ preventScroll: true });
      }
      if (kind === 'tennaFinale') {
        state.story.tennaFinaleExplained = true;
        state.bossEncounter = createTennaEncounter();
        dependencies.syncBossUI();
        dependencies.storyUI();
        dependencies.canvas.focus({ preventScroll: true });
      }
      if (kind === 'darkIntro') {
        state.collisionBlackout = null;
        state.story.darkBattleSeen = true;
        state.bossEncounter = createDarkEncounter();
        dependencies.syncBossUI();
        dependencies.canvas.focus({ preventScroll: true });
      }
      if (kind === 'queenSuccess') {
        state.story.queenSolved = true;
        state.queenDeparture = 0;
        dependencies.storyUI();
      }
      if (kind === 'queenIntro') {
        state.story.queenBriefed = true;
        state.story.queenDemoSeen = true;
        state.keys.clear();
        dependencies.storyUI();
      }
      if (kind === 'noelleAftermath') {
        const studio = state.project.rooms.findIndex((room) => room.scene === 'glitchStudio');
        if (studio >= 0) dependencies.changeRoom(studio, true);
      }
      if (npcId === 'core-warning-froggit') state.story.coreFroggitWarned = true;
      if (kind === 'coreGlitch') state.story.coreGlitchNoticed = true;
      if (kind === 'coreIntro') {
        state.story.coreExplained = true;
        dependencies.storyUI();
      }
      if (kind === 'goldenDoors') {
        state.story.goldenDoorExplained = true;
        dependencies.storyUI();
        dependencies.openGoldenDoorChoice();
      }
      if (kind === 'fountainDive') dependencies.startFountainDive();
      if (kind === 'floweyHesitate' && state.dive) {
        state.dive.phase = 'flowey';
        state.dive.age = 0;
        dependencies.announce('Flowey jumps in last.');
      }
      if (kind === 'intro') dependencies.recruitFlowey();
      if (kind === 'fountain') {
        state.story.foundFountain = true;
        dependencies.storyUI();
        dependencies.openFountainScene();
      }
      if (kind === 'busterWindup') {
        if (state.story.fountainWorse) dependencies.openBusterAfter();
        else {
          state.buster = { age: 0 };
          state.keys.clear();
          dependencies.announce('Susie casts Rude Buster at the fountain.');
        }
      }
      if (kind === 'busterAfter') dependencies.recruitFriends();
      if (kind === 'worlds') {
        const first = !state.story.explained;
        state.story.explained = true;
        dependencies.storyUI();
        if (first) dependencies.toast('A new clue: the fountain and the barrier.');
      }
    }
    renderDialogue();
  }
  function closeDialogue() {
    if (state.dialogue?.kind === 'bossIntro' && state.bossEncounter) {
      startKrisTurn(state.bossEncounter);
      dependencies.syncBossUI();
    }
    if (state.dialogue?.kind === 'glitchArrival') dependencies.finishGlitchComfort();
    state.dialogue = null;
    dependencies.$('dialogue').hidden = true;
    dependencies.$('dialogueText').textContent = '';
    state.keys.clear();
  }
  return {
    openDialogue,
    talk,
    renderDialogue,
    isImportantCutscene,
    skipDialogue,
    advanceDialogue,
    closeDialogue,
  };
}
