import { knightEncounterActive } from '../rooms/post-show/knight-choreography.ts';
import { harvestTree } from '../inventory/tree-items.ts';
import { finaleConversation } from '../rooms/backstage/tenna-finale.ts';
import { tennaBackstageConversation } from '../rooms/backstage/tenna-story.ts';
import { createTraffic, nearbyTrafficStop, useTrafficStop } from '../rooms/crossing/traffic.ts';
import { queenConversation, queenReminder } from '../rooms/queen-terminal/queen-room.ts';
import { storageGiftConversation, storageRepeatConversation } from '../rooms/storage/tenna-storage.ts';
import type { Npc, Room, Tree } from '../world/types.ts';
import { H, T, tiles, W } from './config.ts';
import type { Elements } from './dom.ts';
import { present } from './invariants.ts';
import type { GameState } from './types.ts';
interface Dependencies {
  readonly state: GameState;
  readonly npcAt: (x: number, y: number) => Npc | undefined;
  readonly current: () => Room;
  readonly openDialogue: (lines: string[], kind?: string, customSpeaker?: string | null) => void;
  readonly toast: (t: string) => void;
  readonly announce: (t: string) => void;
  readonly roomTrees: (r?: Room) => Tree[];
  readonly storyUI: () => void;
  readonly choiceDialogOpen: () => boolean;
  readonly $: Elements;
  readonly advanceDialogue: () => void;
  readonly inspectGoldenDoor: () => boolean;
  readonly nearHole: (distance?: number) => boolean;
  readonly offerHoleJump: () => void;
  readonly nearSavePoint: () => boolean;
  readonly openProgressMenu: (action: string) => void;
  readonly interactFountain: () => boolean;
}
export function createInteractions(dependencies: Dependencies) {
  const state = dependencies.state;
  function nearbyNpc() {
    const [dx, dy] = present(
      { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.player.facing],
    );
    for (let distance = 8; distance <= 64; distance += 4) {
      const x = Math.floor((state.player.x + dx * distance) / T),
        y = Math.floor((state.player.y + dy * distance) / T);
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      const npc = dependencies.npcAt(x, y);
      if (npc) return npc;
      if (tiles[dependencies.current().map[y][x]].solid) return null;
    }
    return null;
  }
  function speakToNpc(npc: Npc) {
    if (npc.id === 'jackenstein')
      dependencies.openDialogue(
        npc.speech.map((text) => `[Jackenstein] * ${text}`),
        'jackChat',
      );
    else if (npc.id === 'queen-terminal')
      dependencies.openDialogue(
        (state.story.queenBriefed ? queenReminder : queenConversation).map(
          (line) => `[${line.speaker}] * ${line.text}`,
        ),
        state.story.queenBriefed ? 'queenChat' : 'queenIntro',
      );
    else if (
      npc.id === 'tenna-backstage' &&
      state.story.jackCandyReceived &&
      !state.story.tennaFinaleComplete
    )
      dependencies.openDialogue(
        finaleConversation.map((line) => `[${line.speaker}] * ${line.text}`),
        'tennaFinale',
      );
    else if (npc.id === 'tenna-backstage')
      dependencies.openDialogue(
        tennaBackstageConversation.map((line) => `[${line.speaker}] * ${line.text}`),
        'tennaBackstage',
      );
    else if (npc.id === 'tenna-storage') {
      const received = state.story.tennaElixirsReceived;
      dependencies.openDialogue(
        (received ? storageRepeatConversation : storageGiftConversation).map(
          (line) => `[${line.speaker}] * ${line.text}`,
        ),
        received ? 'tennaStorageChat' : 'tennaStorageGift',
      );
    } else dependencies.openDialogue(npc.speech, 'npc', npc.name);
    present(state.dialogue).npcId = npc.id;
  }
  function interactTrafficStop() {
    if (dependencies.current().scene !== 'trafficCrossing') return false;
    const side = nearbyTrafficStop(state.player);
    if (!side) return false;
    if (!state.traffic) state.traffic = createTraffic();
    useTrafficStop(state.traffic, side);
    dependencies.toast(
      'Cars slowed for 5 seconds. ' + (side === 'left' ? 'Left' : 'Right') + ' stop-sign checkpoint set.',
    );
    dependencies.announce('Cars slowed for five seconds. Checkpoint set.');
    return true;
  }
  function nearbyObject() {
    const directions: Record<string, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    const direction = directions[state.player.facing];
    const descriptions: Record<number, string> = {
      1: 'a stone wall',
      3: 'some flowers',
      4: dependencies.current().scene === 'fountain' ? 'a Dark Fountain' : 'a pool of water',
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
      const tile = dependencies.current().map[y][x];
      if (descriptions[tile]) return descriptions[tile];
    }
    return null;
  }
  function nearbyCandyTree() {
    const [dx, dy] = present(
      { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.player.facing],
    );
    return dependencies.roomTrees().find((tree) => {
      const vx = tree.x * T + 20 - state.player.x,
        vy = tree.y * T + 20 - state.player.y;
      const forward = vx * dx + vy * dy,
        sideways = Math.abs(vx * dy - vy * dx);
      if (forward < 0 || forward > 64 || sideways > 28) return false;
      for (let t = 0.1; t < 1; t += 0.1) {
        const x = Math.floor((state.player.x + vx * t) / T),
          y = Math.floor((state.player.y + vy * t) / T);
        if (tiles[dependencies.current().map[y][x]].solid) return false;
      }
      return true;
    });
  }
  function takeTreeCandy() {
    const tree = nearbyCandyTree();
    if (!tree) return false;
    const item = harvestTree(tree, state.roomIndex, state.treeHarvests, state.inventory);
    if (!item) dependencies.openDialogue(['[Narrator] * There are no more items in this tree.'], 'treeCandy');
    else {
      dependencies.storyUI();
      dependencies.openDialogue([`[Narrator] * You got ${item.name}!`], 'treeCandy');
    }
    return true;
  }
  function inspectJackLever() {
    const lever = dependencies.current().jackLever;
    if (
      dependencies.current().scene !== 'collisionChamber' ||
      !state.story.jackRevealed ||
      !lever ||
      Math.hypot(state.player.x - (lever.x * T + 20), state.player.y - (lever.y * T + 20)) > 68
    )
      return false;
    dependencies.openDialogue(
      ['[Narrator] * A lever. Jackenstein was told to stop anyone from pressing it.'],
      'jackLever',
    );
    return true;
  }
  function inspectObject() {
    if (knightEncounterActive(state)) return;
    if ((state.tennaEntrance || state.collisionBlackout) && !state.dialogue) return;
    if (state.death || state.holeFall || state.padJump || dependencies.choiceDialogOpen()) return;
    if (state.bossEncounter && !state.dialogue) return;
    if (
      state.mode !== 'play' ||
      state.buster ||
      (state.dive && state.dive.phase !== 'hesitate') ||
      dependencies.$('helpDialog').open ||
      state.story.emerging >= 0 ||
      state.story.discussion >= 0
    )
      return;
    if (state.dialogue) {
      dependencies.advanceDialogue();
      return;
    }
    if (inspectJackLever()) return;
    if (interactTrafficStop()) return;
    if (dependencies.inspectGoldenDoor()) return;
    if (dependencies.nearHole()) {
      dependencies.offerHoleJump();
      return;
    }
    if (dependencies.nearSavePoint() && !state.dive) {
      dependencies.openProgressMenu('save');
      return;
    }
    if (takeTreeCandy()) return;
    if (dependencies.interactFountain()) return;
    const npc = nearbyNpc();
    if (npc) {
      speakToNpc(npc);
      return;
    }
    if (state.story.joined) {
      dependencies.openDialogue(['[Flowey] * lets not waste time.'], 'inspect');
      return;
    }
    const object = nearbyObject();
    if (object) dependencies.openDialogue(['[Narrator] * ' + object], 'inspect');
    else
      dependencies.openDialogue(
        ['[Narrator] * nothing to inspect here. Face a nearby pillar or table, then press C.'],
        'inspect',
      );
  }
  return {
    nearbyNpc,
    speakToNpc,
    interactTrafficStop,
    nearbyCandyTree,
    takeTreeCandy,
    inspectJackLever,
    inspectObject,
  };
}
