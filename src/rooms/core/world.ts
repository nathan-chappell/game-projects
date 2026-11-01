import { H, tiles, W } from '../../game/config.ts';
import type { Project, Room } from '../../world/types.ts';

export function addFurnaceChamber(p: Project) {
  const existing = p.rooms.find((room) => room.scene === 'darkFurnace');
  if (existing) {
    addCoreFroggit(existing);
    return p;
  }
  if (p.rooms.length >= 20) return p;
  const previous = p.rooms.findIndex((room) => room.scene === 'darkGoldenHall');
  if (previous < 0) return p;
  const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
  for (let y = 7; y <= 9; y++) for (let x = 3; x <= 12; x++) map[y][x] = 0;
  map[8][3] = 6;
  p.rooms.push({
    name: 'The Furnace Chamber',
    scene: 'darkFurnace',
    theme: 'dark',
    map,
    spawn: { x: 5, y: 8 },
    flowey: { x: 4, y: 8 },
    npcs: [],
    dialogue: [],
    target: previous,
    doorLinks: { '3,8': previous },
  });
  addCoreFroggit(p.rooms[p.rooms.length - 1]);
  return p;
}

export function addCoreFroggit(room: Room) {
  // Migrate older adventures once, keeping later Build edits and deletions.
  if (room.coreFroggitAdded) return;
  room.coreFroggitAdded = true;
  room.npcs ??= [];
  if (room.npcs.length >= 24 || room.npcs.some((npc) => npc.id === 'core-warning-froggit')) return;
  for (const y of [8, 9, 7])
    for (const x of [10, 11, 12, 9, 8]) {
      if (
        tiles[room.map[y][x]].solid ||
        room.map[y][x] === 6 ||
        room.npcs.some((npc) => npc.x === x && npc.y === y) ||
        (['trees', 'savePoints', 'spikes', 'jumpPads'] as const).some((key) =>
          room[key]?.some((point) => point.x === x && point.y === y),
        ) ||
        [room.spawn, room.flowey].some((point) => point.x === x && point.y === y)
      )
        continue;
      room.npcs.push({
        id: 'core-warning-froggit',
        sprite: 'frog',
        name: 'Froggit',
        x,
        y,
        speech: ['Hey! Something weird is happening in the Core!!!'],
      });
      return;
    }
}

export function addCoreEntrance(p: Project) {
  const outside = p.rooms.findIndex((room) => room.scene === 'darkFurnace');
  if (outside < 0) return p;
  let inside = p.rooms.findIndex((room) => room.scene === 'coreEntrance');
  if (inside < 0) {
    if (p.rooms.length >= 20) return p;
    const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
    for (let y = 2; y <= 10; y++) for (let x = 6; x <= 9; x++) map[y][x] = 0;
    for (let y = 8; y <= 10; y++) for (let x = 3; x <= 12; x++) map[y][x] = 0;
    inside = p.rooms.length;
    p.rooms.push({
      name: 'Inside the CORE',
      scene: 'coreEntrance',
      theme: 'dark',
      map,
      spawn: { x: 8, y: 9 },
      flowey: { x: 7, y: 9 },
      npcs: [],
      dialogue: [],
      target: -1,
      doorLinks: {},
    });
  }
  const room = p.rooms[outside];
  if (room.coreBounceAdded) return p;
  room.coreBounceAdded = true;
  room.jumpPads ??= [];
  for (const [x, y] of [
    [12, 8],
    [12, 9],
    [12, 7],
    [11, 9],
    [11, 7],
  ]) {
    if (
      tiles[room.map[y][x]].solid ||
      room.map[y][x] === 6 ||
      (['npcs', 'trees', 'spikes', 'jumpPads', 'savePoints'] as const).some((key) =>
        room[key]?.some((point) => point.x === x && point.y === y),
      ) ||
      [room.spawn, room.flowey].some((point) => point.x === x && point.y === y)
    )
      continue;
    room.jumpPads.push({ x, y, targetRoom: inside, targetX: 8, targetY: 9, launchX: 8, launchY: 4 });
    break;
  }
  return p;
}

export function addCoreFallSpike(room: Room) {
  // Existing Build placements (including an explicitly empty list) take priority.
  if (room.spikes === undefined) {
    room.spikes = [];
    for (const [x, y] of [
      [8, 5],
      [7, 5],
      [8, 4],
      [7, 4],
    ]) {
      if (
        tiles[room.map[y][x]].solid ||
        room.map[y][x] === 6 ||
        (['npcs', 'trees', 'savePoints', 'jumpPads'] as const).some((key) =>
          room[key]?.some((point) => point.x === x && point.y === y),
        ) ||
        Math.hypot(room.spawn.x - x, room.spawn.y - y) < 2.5
      )
        continue;
      room.spikes.push({ x, y });
      break;
    }
  }
}

export function addLowerCore(p: Project) {
  const entry = p.rooms.find((room) => room.scene === 'coreEntrance');
  if (!entry) return p;
  if (!p.rooms.some((room) => room.scene === 'coreLower')) {
    if (p.rooms.length >= 20) return p;
    const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
    for (let y = 2; y <= 10; y++) for (let x = 6; x <= 9; x++) map[y][x] = 0;
    for (let y = 8; y <= 10; y++) for (let x = 3; x <= 12; x++) map[y][x] = 0;
    p.rooms.push({
      name: 'CORE — Lower Chamber',
      scene: 'coreLower',
      theme: 'dark',
      map,
      spawn: { x: 8, y: 9 },
      flowey: { x: 7, y: 9 },
      npcs: [],
      dialogue: [],
      savePoints: [{ x: 4, y: 8 }],
      target: -1,
      doorLinks: {},
    });
  }
  if (entry.coreFloorFallVersion === 1) return p;
  const outside = p.rooms.findIndex((room) => room.scene === 'darkFurnace');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const key = x + ',' + y;
      if (entry.map[y][x] === 6 && (entry.doorLinks?.[key] ?? entry.target) === outside) {
        entry.map[y][x] = 1;
        if (entry.tileColors) delete entry.tileColors[key];
      }
    }
  entry.doorLinks = Object.fromEntries(
    Object.entries(entry.doorLinks || {}).filter(([, target]) => target !== outside),
  );
  if (entry.target === outside) entry.target = -1;
  addCoreFallSpike(entry);
  entry.coreFloorFallVersion = 1;
  return p;
}

export function addDeeperCore(p: Project) {
  const lower = p.rooms.find((room) => room.scene === 'coreLower');
  if (!lower) return p;
  if (!p.rooms.some((room) => room.scene === 'coreDepths')) {
    if (p.rooms.length >= 20) return p;
    const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
    for (let y = 2; y <= 10; y++) for (let x = 6; x <= 9; x++) map[y][x] = 0;
    for (let y = 8; y <= 10; y++) for (let x = 3; x <= 12; x++) map[y][x] = 0;
    p.rooms.push({
      name: 'CORE — Deep Chamber',
      scene: 'coreDepths',
      theme: 'dark',
      map,
      spawn: { x: 8, y: 9 },
      flowey: { x: 7, y: 9 },
      npcs: [],
      dialogue: [],
      savePoints: [{ x: 4, y: 8 }],
      target: -1,
      doorLinks: {},
    });
  }
  if (lower.coreFloorFallVersion !== 1) {
    addCoreFallSpike(lower);
    lower.coreFloorFallVersion = 1;
  }
  return p;
}
