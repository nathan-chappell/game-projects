import { canControlSoul } from '../battle/shared/availability.ts';
import { advanceBattleTime, advanceSnowAttack, moveSoul } from '../battle/shared/rules.ts';
import { finaleConversation } from '../rooms/backstage/tenna-finale.ts';
import {
  advanceTennaEntrance,
  tennaArrivalConversation,
  tennaBackstageConversation,
} from '../rooms/backstage/tenna-story.ts';
import { advanceTraffic, createTraffic } from '../rooms/crossing/traffic.ts';
import { studioConversation } from '../rooms/glitch-studio/glitch-studio.ts';
import { collisionConversation } from '../rooms/monochrome-chamber/collision-chamber.ts';
import { jackRevealConversation, jackRewardConversation } from '../rooms/monochrome-chamber/jack-story.ts';
import {
  advanceQueenPuzzle,
  createQueenPuzzle,
  pressQueenTile,
} from '../rooms/queen-terminal/queen-puzzle.ts';
import { queenConversation, queenLetters, queenSuccess } from '../rooms/queen-terminal/queen-room.ts';
import { advanceHallway, createHallway, hallwayCamera } from '../rooms/storage/storage-travel.ts';
import type { Npc, Point, Room } from '../world/types.ts';
import { movementSpeed, sprintMultiplier, T } from './config.ts';
import type { Elements } from './dom.ts';
import { present } from './invariants.ts';
import type { GameState } from './types.ts';
interface Dependencies {
  readonly state: GameState;
  readonly partyHasFallen: () => boolean;
  readonly beginDeath: () => void;
  readonly $: Elements;
  readonly choiceDialogOpen: () => boolean;
  readonly openDialogue: (lines: string[], kind?: string, customSpeaker?: string | null) => void;
  readonly updatePadJump: (dt: number) => void;
  readonly updateHoleFall: (dt: number) => void;
  readonly updateDive: (dt: number) => void;
  readonly storyUI: () => void;
  readonly announce: (t: string) => void;
  readonly openBusterAfter: () => void;
  readonly current: () => Room;
  readonly openFountainScene: () => void;
  readonly syncBossUI: () => void;
  readonly canvas: HTMLCanvasElement;
  readonly resetBossEncounter: () => void;
  readonly finishNoelleConfrontation: () => void;
  readonly updateGlitchComfort: (dt: number) => void;
  readonly renderDialogue: () => void;
  readonly beginTennaArrival: () => void;
  readonly offerBossEntry: (index: number) => void;
  readonly openGlitchArrival: () => void;
  readonly openCoreGlitchConversation: () => void;
  readonly openCoreConversation: () => void;
  readonly roomNpcs: () => Npc[];
  readonly speakToNpc: (npc: Npc) => void;
  readonly nearGoldenDoor: () => boolean;
  readonly openGoldenDoorConversation: () => void;
  readonly changeRoom: (
    index: number,
    throughDoor?: boolean,
    preferred?: Point | undefined,
    bossConfirmed?: boolean,
  ) => boolean;
  readonly collides: (x: number, y: number) => boolean;
  readonly updateFollower: (dt: number) => void;
  readonly resetFollower: () => void;
  readonly toast: (t: string) => void;
  readonly tryCoreSpikeFall: () => boolean;
  readonly tryJumpPad: (x: number, y: number) => boolean;
  readonly nearHole: (distance?: number) => boolean;
  readonly offerHoleJump: () => void;
  readonly updateSpikeContact: (x: number, y: number) => void;
  readonly render: (time: number) => void;
}
/** Keep update order: story gates and modal controls resolve before movement and collisions. */
export function createGameLoop(dependencies: Dependencies) {
  const state = dependencies.state;
  function update(dt: number) {
    if (state.mode === 'play' && !state.death && dependencies.partyHasFallen()) dependencies.beginDeath();
    if (state.death) {
      state.keys.clear();
      state.death.age += dt;
      if (state.death.age >= 2.5 && !state.death.menuShown) {
        state.death.menuShown = true;
        dependencies.$('retryFeedback').textContent =
          'Try again from your latest save, or restart if you have no save.';
        dependencies.$('helpDialog').close();
        dependencies.$('inventoryDialog').close();
        dependencies.$('saveDialog').close();
        dependencies.$('gameOverDialog').showModal();
      }
      return;
    }
    state.cameraShakeTime = Math.max(0, state.cameraShakeTime - dt);
    state.fade = Math.max(0, state.fade - dt);
    state.doorCooldown = Math.max(0, state.doorCooldown - dt);
    if (
      state.mode !== 'play' ||
      dependencies.choiceDialogOpen() ||
      dependencies.$('helpDialog').open ||
      dependencies.$('saveDialog').open ||
      dependencies.$('inventoryDialog').open
    )
      return;
    if (state.collisionBlackout && !state.dialogue) {
      state.keys.clear();
      state.player.moving = false;
      state.collisionBlackout.age += dt;
      if (state.collisionBlackout.age >= 0.7 && !state.collisionBlackout.spoken) {
        state.collisionBlackout.spoken = true;
        dependencies.openDialogue(['[Flowey] * Who turned the lights off?!'], 'darkIntro');
      }
      return;
    }
    if (state.padJump) {
      dependencies.updatePadJump(dt);
      return;
    }
    if (state.holeFall) {
      dependencies.updateHoleFall(dt);
      return;
    }
    if (state.dive && state.dive.phase !== 'hesitate') {
      dependencies.updateDive(dt);
      return;
    }
    if (state.buster) {
      state.buster.age += dt;
      state.player.moving = false;
      if (state.buster.age >= 1.15 && !state.story.fountainWorse) {
        state.story.fountainWorse = true;
        dependencies.storyUI();
        dependencies.announce('The attack hits. The Dark Fountain grows stronger!');
      }
      if (state.buster.age >= 2.8) {
        state.buster = null;
        dependencies.openBusterAfter();
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
        dependencies.openDialogue(state.project.rooms[1].dialogue, 'intro');
      }
      return;
    }
    if (state.story.discussion >= 0) {
      state.story.discussion -= dt;
      state.player.moving = false;
      if (state.story.discussion <= 0) {
        state.story.discussion = -1;
        if (dependencies.current().scene === 'fountain') dependencies.openFountainScene();
        else dependencies.openDialogue(dependencies.current().dialogue, 'worlds');
      }
      return;
    }
    if (state.bossEncounter?.phase === 'tennaCut' && !state.dialogue) {
      dependencies.openDialogue(['[Tenna] * We cant have That Violence in TV, Mike, cut!'], 'tennaCut');
      dependencies.syncBossUI();
      dependencies.canvas.focus({ preventScroll: true });
      return;
    }
    if (state.bossEncounter?.phase === 'minigameIntro' && !state.dialogue) {
      dependencies.openDialogue(
        ['[Tenna] * Oh yeah! 1500 Points and i give up! Or else you work for ME!'],
        'tennaMinigame',
      );
      dependencies.syncBossUI();
      dependencies.canvas.focus({ preventScroll: true });
      return;
    }
    if (state.bossEncounter?.phase === 'tennaCue' && !state.dialogue) {
      dependencies.openDialogue(
        ['[Tenna] * Hey Minions- i mean Helpers, attack! It will come to your paycheck...'],
        'tennaHelpers',
      );
      dependencies.syncBossUI();
      dependencies.canvas.focus({ preventScroll: true });
      return;
    }
    if (state.bossEncounter?.phase === 'jackLever' && !state.dialogue) {
      dependencies.openDialogue(["[Susie] * There's a lever!"], 'jackLeverFound');
      dependencies.syncBossUI();
      dependencies.canvas.focus({ preventScroll: true });
      return;
    }
    if (state.bossEncounter?.phase === 'jackReveal') {
      state.story.jackRevealed = true;
      state.story.darkBattleSeen = true;
      state.story.collisionSeen = true;
      state.collisionBlackout = null;
      dependencies.resetBossEncounter();
      state.keys.clear();
      Object.assign(state.player, { x: 180, y: 330, facing: 'right', moving: false });
      Object.assign(state.follower, { x: 270, y: 330, trail: [] });
      state.companions = [
        { name: 'Ralsey', x: 355, y: 330, trail: [] },
        { name: 'Susie', x: 425, y: 350, trail: [] },
      ];
      dependencies.openDialogue(
        jackRevealConversation.map((l) => `[${l.speaker}] * ${l.text}`),
        'jackReveal',
      );
      dependencies.storyUI();
      dependencies.canvas.focus({ preventScroll: true });
      return;
    }
    if (state.bossEncounter?.phase === 'shine') {
      state.bossEncounter.animationAge += dt;
      if (!state.dialogue) {
        dependencies.openDialogue(['[???] * NOT THE LAIGHT!'], 'darkShine');
        dependencies.syncBossUI();
        dependencies.canvas.focus({ preventScroll: true });
        return;
      }
    }
    if (state.bossEncounter && !state.dialogue) {
      let changed = advanceBattleTime(state.bossEncounter, dt, state.partyHP);
      if (canControlSoul(state.bossEncounter)) moveSoul(state.bossEncounter, state.keys, dt);
      changed = advanceSnowAttack(state.bossEncounter, state.partyHP, dt) || changed;
      if (state.bossEncounter.phase === 'aftermath') {
        dependencies.finishNoelleConfrontation();
        return;
      }
      if (
        state.bossEncounter.phase === 'victory' &&
        !['dark', 'tenna'].includes(state.bossEncounter.kind ?? '')
      ) {
        state.story.noelleGone = true;
        state.story.noelleEscaped = state.bossEncounter.noelleEscaped;
      }
      if (dependencies.partyHasFallen()) dependencies.beginDeath();
      if (changed || state.death) dependencies.syncBossUI();
      if (!canControlSoul(state.bossEncounter) || state.death) state.keys.clear();
      state.player.moving = false;
      return;
    }
    if (state.glitchComfort) dependencies.updateGlitchComfort(dt);
    if (dependencies.current().scene === 'queenPasscode') {
      state.queenPuzzle ??= createQueenPuzzle(state.story.queenDemoSeen, state.story.queenSolved);
      if (advanceQueenPuzzle(state.queenPuzzle, dt) === 'success')
        dependencies.openDialogue(
          queenSuccess.map((l) => `[${l.speaker}] * ${l.text}`),
          'queenSuccess',
        );
      if (state.queenDeparture !== null && state.queenDeparture !== undefined) {
        state.queenDeparture += dt;
        if (state.queenDeparture > 3) state.queenDeparture = null;
      }
    }
    if (state.dialogue) {
      state.dialogue.shown += dt * 45;
      dependencies.renderDialogue();
      state.player.moving = false;
      return;
    }
    if (state.tennaEntrance) {
      state.keys.clear();
      state.player.moving = false;
      const next = advanceTennaEntrance(state.tennaEntrance, dt);
      if (next === 'talk')
        dependencies.openDialogue(
          tennaArrivalConversation.map((line) => `[${line.speaker}] * ${line.text}`),
          'tennaArrival',
        );
      else if (next === 'done') state.tennaEntrance = null;
      return;
    }
    if (dependencies.current().scene === 'glitchStudio' && !state.story.studioExplained) {
      dependencies.openDialogue(
        studioConversation.map((line) => `[${line.speaker}] * ${line.text}`),
        'studioIntro',
      );
      return;
    }
    if (dependencies.current().scene === 'glitchStudio' && !state.story.tennaInvited) {
      dependencies.beginTennaArrival();
      return;
    }
    if (
      dependencies.current().scene === 'glitchBackstage' &&
      state.story.jackCandyReceived &&
      !state.story.tennaFinaleExplained
    ) {
      dependencies.openDialogue(
        finaleConversation.map((l) => `[${l.speaker}] * ${l.text}`),
        'tennaFinale',
      );
      return;
    }
    if (dependencies.current().scene === 'glitchBackstage' && !state.story.tennaStorageInvited) {
      dependencies.openDialogue(
        tennaBackstageConversation.map((line) => `[${line.speaker}] * ${line.text}`),
        'tennaBackstage',
      );
      return;
    }
    if (
      dependencies.current().scene === 'collisionChamber' &&
      state.story.jackRevealed &&
      !state.story.jackCandyReceived
    ) {
      dependencies.openDialogue(
        jackRewardConversation.map((l) => `[${l.speaker}] * ${l.text}`),
        'jackReward',
      );
      return;
    }
    if (
      dependencies.current().scene === 'collisionChamber' &&
      state.story.collisionSeen &&
      !state.story.darkBattleSeen &&
      !state.story.jackRevealed
    ) {
      state.collisionBlackout = { age: 0, spoken: false };
      return;
    }
    if (dependencies.current().scene === 'collisionChamber' && !state.story.collisionSeen) {
      Object.assign(state.player, { x: 180, y: 330, facing: 'up' });
      Object.assign(state.follower, { x: 270, y: 330, trail: [] });
      state.companions = [
        { name: 'Ralsey', x: 355, y: 330, trail: [] },
        { name: 'Susie', x: 460, y: 330, trail: [] },
      ];
      dependencies.openDialogue(
        collisionConversation.map((l) => `[${l.speaker}] * ${l.text}`),
        'collisionIntro',
      );
      return;
    }
    if (
      dependencies.current().scene === 'queenPasscode' &&
      (!state.story.queenBriefed || (!state.story.queenDemoSeen && !state.story.queenSolved))
    ) {
      dependencies.openDialogue(
        queenConversation.map((line) => `[${line.speaker}] * ${line.text}`),
        'queenIntro',
      );
      return;
    }
    if (
      dependencies.current().scene === 'glitchBoss' &&
      !state.bossEncounter &&
      !state.story.noelleEscaped &&
      !state.story.noelleGone
    ) {
      dependencies.offerBossEntry(state.roomIndex);
      return;
    }
    if (
      dependencies.current().scene === 'glitchWorld' &&
      state.story.teamJoined &&
      !state.story.glitchArrivalSeen
    ) {
      dependencies.openGlitchArrival();
      return;
    }
    if (
      dependencies.current().scene === 'coreEntrance' &&
      state.story.teamJoined &&
      !state.story.coreGlitchNoticed
    ) {
      dependencies.openCoreGlitchConversation();
      return;
    }
    if (
      dependencies.current().scene === 'darkFurnace' &&
      state.story.teamJoined &&
      state.story.joined &&
      !state.story.coreExplained
    ) {
      dependencies.openCoreConversation();
      return;
    }
    if (dependencies.current().scene === 'darkFurnace' && !state.story.coreFroggitWarned) {
      const froggit = dependencies.roomNpcs().find((npc) => npc.id === 'core-warning-froggit');
      if (
        froggit &&
        Math.hypot(state.player.x - (froggit.x * T + 20), state.player.y - (froggit.y * T + 20)) < 80
      ) {
        dependencies.speakToNpc(froggit);
        return;
      }
    }
    if (
      dependencies.nearGoldenDoor() &&
      state.story.teamJoined &&
      state.story.joined &&
      !state.story.goldenDoorExplained
    ) {
      dependencies.openGoldenDoorConversation();
      return;
    }
    const pace = state.keys.has('sprint') ? sprintMultiplier : 1;
    if (dependencies.current().scene === 'storageHallway') {
      if (!state.storageHallway) state.storageHallway = createHallway();
      const next = advanceHallway(state.storageHallway, state.keys, dt);
      state.player.x = state.storageHallway.x - hallwayCamera(state.storageHallway.x);
      state.player.y = state.storageHallway.y;
      state.player.moving = state.storageHallway.moving;
      if (state.player.moving) state.player.step += dt * 10 * pace;
      if (state.keys.has('right') || state.keys.has('left'))
        state.player.facing = state.storageHallway.direction > 0 ? 'right' : 'left';
      if (next && !state.doorCooldown) {
        const room = dependencies.current(),
          target = room.doorLinks?.[next === 'storage' ? '0,8' : '15,8'];
        if (Number.isInteger(target)) dependencies.changeRoom(present(target), true);
      }
      return;
    }
    let dx = (state.keys.has('right') ? 1 : 0) - (state.keys.has('left') ? 1 : 0),
      dy = (state.keys.has('down') ? 1 : 0) - (state.keys.has('up') ? 1 : 0);
    state.player.moving = !!(dx || dy);
    if (state.player.moving) {
      if (dx) state.player.facing = dx > 0 ? 'right' : 'left';
      else state.player.facing = dy > 0 ? 'down' : 'up';
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * movementSpeed * pace * dt;
      dy = (dy / len) * movementSpeed * pace * dt;
      if (!dependencies.collides(state.player.x + dx, state.player.y)) state.player.x += dx;
      if (!dependencies.collides(state.player.x, state.player.y + dy)) state.player.y += dy;
      state.player.step += dt * 10 * pace;
    }
    dependencies.updateFollower(dt);
    if (dependencies.current().scene === 'queenPasscode' && state.queenPuzzle)
      pressQueenTile(
        state.queenPuzzle,
        state.player,
        queenLetters,
        state.story.queenBriefed && !state.story.queenSolved,
      );
    if (dependencies.current().scene === 'trafficCrossing') {
      if (!state.traffic) state.traffic = createTraffic();
      if (advanceTraffic(state.traffic, state.player, dt)) {
        state.keys.clear();
        state.player.moving = false;
        dependencies.resetFollower();
        state.cameraShakeTime = 0.15;
        dependencies.toast('A car hit you! Back at the ' + state.traffic.checkpoint + ' stop sign.');
      }
    }
    const tx = Math.floor(state.player.x / T),
      ty = Math.floor(state.player.y / T);
    if (dependencies.tryCoreSpikeFall()) return;
    if (dependencies.tryJumpPad(tx, ty)) return;
    if (dependencies.nearHole(58)) {
      dependencies.offerHoleJump();
      return;
    }
    dependencies.updateSpikeContact(tx, ty);
    if (dependencies.partyHasFallen()) {
      dependencies.beginDeath();
      return;
    }
    if (!state.doorCooldown && dependencies.current().map[ty][tx] === 6) {
      state.doorCooldown = 1;
      const target = dependencies.current().doorLinks?.[tx + ',' + ty] ?? dependencies.current().target;
      if (target < 0) dependencies.toast('This doorway needs a destination. Choose one in Build.');
      else
        dependencies.changeRoom(
          target,
          true,
          dependencies.current().scene === 'darkFurnace' &&
            state.project.rooms[target]?.scene === 'darkGoldenHall'
            ? { x: 11, y: 10 }
            : dependencies.current().scene === 'darkGoldenHall' &&
                state.project.rooms[target]?.scene === 'darkWindingPassage'
              ? { x: 14, y: 10 }
              : dependencies.current().scene === 'darkWindingPassage' &&
                  state.project.rooms[target]?.scene === 'darkJumpIslands'
                ? { x: 14, y: 8 }
                : dependencies.current().scene === 'darkJumpIslands' &&
                    state.project.rooms[target]?.scene === 'darkGlowPassage'
                  ? { x: 14, y: 9 }
                  : state.project.rooms[target]?.scene === 'darkJunction'
                    ? dependencies.current().scene === 'darkDescent'
                      ? { x: 8, y: 10 }
                      : dependencies.current().scene === 'darkGlowPassage'
                        ? { x: 14, y: 4 }
                        : undefined
                    : undefined,
        );
    }
  }
  function frame(now: number) {
    const dt = Math.min((now - state.lastTime) / 1000 || 0, 0.035);
    state.lastTime = now;
    if (!document.hidden) {
      update(dt);
      dependencies.render(now / 1000);
    }
    requestAnimationFrame(frame);
  }
  return { frame };
}
