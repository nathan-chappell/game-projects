import type { Point, Room } from '../world/types.ts';
import { H, T, W } from './config.ts';
import type { GameState } from './types.ts';
interface Dependencies {
  readonly state: GameState;
  readonly cellOpen: (r: Room, x: number, y: number, avoidFlowey?: boolean) => boolean;
  readonly current: () => Room;
  readonly findStart: (
    r: Room,
    preferred?: Point,
  ) => {
    x: number;
    y: number;
  };
  readonly routeToPlayer: (
    start: Point,
    target?: Point,
  ) => {
    x: number;
    y: number;
  }[];
  readonly storyUI: () => void;
  readonly toast: (t: string) => void;
  readonly announce: (t: string) => void;
}
export function createParty(dependencies: Dependencies) {
  const state = dependencies.state;
  function friendsWaiting() {
    return state.story.glitchArrivalSeen && !state.story.noelleEscaped;
  }
  function ensureGlitchWaiting() {
    if (!friendsWaiting()) return;
    const room = state.project.rooms.find((room) => room.scene === 'glitchWorld');
    if (!room) return;
    const used = new Set();
    const pick = (preferred: Point) => {
      const spots = [];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (dependencies.cellOpen(room, x, y, false) && !used.has(x + ',' + y))
            spots.push({ x: x * T + 20, y: y * T + 20 });
      spots.sort(
        (a, b) =>
          Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y),
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
    if (!friendsWaiting() || !state.glitchWaiting || dependencies.current().scene !== 'glitchWorld')
      return [];
    return ['Ralsey', 'Susie'].map((name) => ({
      name,
      ...(state.glitchWaiting ?? {})[name],
      worried: name === 'Ralsey',
      comforting: name === 'Susie',
    }));
  }
  function isLateStoryRoom(room: Room) {
    return (
      typeof room.scene === 'string' &&
      (room.scene.startsWith('dark') ||
        [
          'coreEntrance',
          'coreLower',
          'coreDepths',
          'glitchWorld',
          'glitchBoss',
          'glitchStudio',
          'glitchBackstage',
          'tennaStorage',
          'storageHallway',
          'trafficCrossing',
          'neonRooftop',
          'queenPasscode',
          'collisionChamber',
        ].includes(room.scene ?? ''))
    );
  }
  function partyStageForRoom(room: Room, index: number) {
    if (isLateStoryRoom(room) || (index >= 2 && !room.scene)) return 2;
    if (room.scene === 'worlds' || room.scene === 'fountain') return 1;
    return 0;
  }
  function preparePartyForRoom() {
    // Jumping ahead in Build or loading an older save can bypass recruitment.
    // Repair membership without changing anyone's HP, items or completed dialogue.
    const stage = partyStageForRoom(dependencies.current(), state.roomIndex);
    if (stage === 2) state.story.teamJoined = true;
    if (stage >= 1 || state.story.teamJoined) {
      state.story.met = true;
      state.story.joined = true;
      state.story.reveal = 1;
      state.story.emerging = -1;
    }
    if (dependencies.current().scene === 'fountain' && stage >= 1) state.story.explained = true;
    if (isLateStoryRoom(dependencies.current())) {
      state.story.explained = true;
      state.story.foundFountain = true;
      state.story.fountainWorse = true;
      state.story.dived = true;
    }
  }
  function fountainFriends(r = dependencies.current()) {
    return r.scene === 'fountain' && (!state.story.teamJoined || state.mode === 'build')
      ? [
          { name: 'Ralsey', x: 260, y: 260 },
          { name: 'Susie', x: 420, y: 260 },
        ]
      : [];
  }
  function partyFriends() {
    if (state.mode === 'play' && dependencies.current().scene === 'glitchBoss' && state.story.noelleEscaped) {
      return ['Ralsey', 'Susie'].map((name, index) => {
        const spot = dependencies.findStart(dependencies.current(), {
          x: dependencies.current().spawn.x + 3 + index * 2,
          y: dependencies.current().spawn.y,
        });
        return { name, x: spot.x * T + T / 2, y: spot.y * T + T / 2, worried: name === 'Ralsey' };
      });
    }
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
  function recruitFriends() {
    if (state.story.teamJoined) return;
    const friends = fountainFriends().map((n) => ({ ...n }));
    state.story.teamJoined = true;
    let leader = state.follower;
    state.companions = friends.map((n) => {
      const member = { ...n, trail: dependencies.routeToPlayer(n, leader) };
      leader = member;
      return member;
    });
    dependencies.storyUI();
    dependencies.toast('Ralsey and Susie joined your party!');
    dependencies.announce('Ralsey and Susie now follow Kris and Flowey.');
  }
  return {
    friendsWaiting,
    ensureGlitchWaiting,
    roomWaitingFriends,
    partyStageForRoom,
    preparePartyForRoom,
    fountainFriends,
    partyFriends,
    nearFountainFriend,
    recruitFriends,
  };
}
