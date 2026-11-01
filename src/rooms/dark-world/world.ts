import { H, T, W } from '../../game/config.ts';
import type { Project, Room } from '../../world/types.ts';
export function darkWorldArrival() {
  const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
  // The reference has a black passage extending right across a purple field.
  for (let y = 5; y <= 7; y++) for (let x = 3; x < W; x++) map[y][x] = 0;
  return {
    name: 'D.G.W — Arrival',
    theme: 'dark',
    scene: 'darkArrival',
    map,
    spawn: { x: 5, y: 6 },
    flowey: { x: 4, y: 6 },
    dialogue: [],
    target: -1,
    npcs: [],
  };
}
export function addDarkWorldChapter(p: Project) {
  if ((p.chapter ?? 0) >= 4) return p;
  for (const room of p.rooms) {
    if (room.target >= 4) room.target++;
    if (room.doorLinks)
      for (const key of Object.keys(room.doorLinks)) if (room.doorLinks[key] >= 4) room.doorLinks[key]++;
  }
  p.rooms.splice(4, 0, darkWorldArrival());
  p.chapter = 4;
  return p;
}
export function addDarkWorldJunction(p: Project) {
  if (p.rooms.some((room) => room.scene === 'darkJunction') || p.rooms.length >= 20) return p;
  const arrivalIndex = p.rooms.findIndex((room) => room.scene === 'darkArrival');
  if (arrivalIndex < 0) return p;
  const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
  // A broad horizontal passage with a central branch leading downward.
  for (let y = 3; y <= 6; y++) for (let x = 0; x < W; x++) map[y][x] = 0;
  for (let y = 7; y < H; y++) for (let x = 6; x <= 9; x++) map[y][x] = 0;
  map[4][0] = 6;
  const destination = p.rooms.length;
  p.rooms.push({
    name: 'D.G.W — The Junction',
    scene: 'darkJunction',
    theme: 'dark',
    map,
    spawn: { x: 2, y: 4 },
    flowey: { x: 1, y: 4 },
    dialogue: [],
    npcs: [],
    target: arrivalIndex,
    doorLinks: { '0,4': arrivalIndex },
  });
  const arrival = p.rooms[arrivalIndex];
  // Keep player-made room edits; only open the connecting passage.
  arrival.map[6][14] = 0;
  arrival.map[6][15] = 6;
  arrival.doorLinks = { ...(arrival.doorLinks ?? {}), '15,6': destination };
  p.chapter = Math.max(p.chapter || 0, 5);
  return p;
}
export function addDarkWorldDescent(p: Project) {
  const existing = p.rooms.find((room) => room.scene === 'darkDescent');
  if (existing) {
    if (existing.descentLayoutVersion !== 3) {
      // Undo the earlier horizontal extension, preserving placed objects and edited tiles.
      if (existing.descentLayoutVersion === 2) {
        for (let y = 8; y <= 10; y++)
          for (let x = 1; x <= 3; x++) {
            const occupied =
              (existing.savePoints || []).some((point) => point.x === x && point.y === y) ||
              (existing.npcs || []).some((npc) => npc.x === x && npc.y === y) ||
              (existing.spawn.x === x && existing.spawn.y === y);
            if (existing.map[y][x] === 0 && !occupied) existing.map[y][x] = 1;
          }
      }
      const junctionIndex = p.rooms.findIndex((room) => room.scene === 'darkJunction');
      existing.doorLinks = { ...(existing.doorLinks ?? {}) };
      for (let x = 8; x <= 11; x++) {
        existing.map[0][x] = 6;
        existing.map[1][x] = 0;
        if (existing.map[2][x] === 6) existing.map[2][x] = 0;
        delete existing.doorLinks[x + ',2'];
        existing.doorLinks[x + ',0'] = junctionIndex;
      }
      existing.spawn = { x: 8, y: 1 };
      existing.descentLayoutVersion = 3;
    }
    return p;
  }
  if (p.rooms.length >= 20) return p;
  const junctionIndex = p.rooms.findIndex((room) => room.scene === 'darkJunction');
  if (junctionIndex < 0) return p;
  const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
  // The reference's tall shaft opens into a wider ledge on its lower left.
  for (let y = 0; y <= 10; y++) for (let x = 8; x <= 11; x++) map[y][x] = 0;
  for (let y = 8; y <= 10; y++) for (let x = 4; x <= 11; x++) map[y][x] = 0;
  const destination = p.rooms.length,
    doorLinks: Record<string, number> = {};
  for (let x = 8; x <= 11; x++) {
    map[0][x] = 6;
    doorLinks[x + ',0'] = junctionIndex;
  }
  p.rooms.push({
    name: 'D.G.W — The Descent',
    scene: 'darkDescent',
    descentLayoutVersion: 3,
    theme: 'dark',
    map,
    spawn: { x: 8, y: 1 },
    flowey: { x: 9, y: 1 },
    dialogue: [],
    npcs: [],
    target: junctionIndex,
    doorLinks,
  });
  const junction = p.rooms[junctionIndex];
  junction.doorLinks = { ...(junction.doorLinks ?? {}) };
  for (let x = 6; x <= 9; x++) {
    junction.map[10][x] = 0;
    junction.map[11][x] = 6;
    junction.doorLinks[x + ',11'] = destination;
  }
  p.chapter = Math.max(p.chapter || 0, 6);
  return p;
}
export function addDarkWorldGlowPassage(p: Project) {
  if (p.rooms.some((room) => room.scene === 'darkGlowPassage') || p.rooms.length >= 20) return p;
  const junctionIndex = p.rooms.findIndex((room) => room.scene === 'darkJunction');
  if (junctionIndex < 0) return p;
  const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1)),
    doorLinks: Record<string, number> = {};
  for (let y = 4; y <= 7; y++) {
    for (let x = 0; x < W; x++) map[y][x] = 0;
    map[y][0] = 6;
    doorLinks['0,' + y] = junctionIndex;
  }
  const destination = p.rooms.length;
  p.rooms.push({
    name: 'D.G.W — The Glowing Passage',
    scene: 'darkGlowPassage',
    theme: 'dark',
    map,
    spawn: { x: 2, y: 5 },
    flowey: { x: 1, y: 5 },
    dialogue: [],
    npcs: [],
    target: junctionIndex,
    doorLinks,
  });
  const junction = p.rooms[junctionIndex];
  junction.doorLinks = { ...(junction.doorLinks ?? {}) };
  for (let y = 3; y <= 6; y++) {
    junction.map[y][14] = 0;
    junction.map[y][15] = 6;
    junction.doorLinks['15,' + y] = destination;
  }
  p.chapter = Math.max(p.chapter || 0, 7);
  return p;
}
export function customizeHolePassage(p: Project) {
  const room = p.rooms.find((room) => room.scene === 'darkGlowPassage');
  if (!room || room.holeLayoutVersion === 1) return p;
  const junction = p.rooms.findIndex((room) => room.scene === 'darkJunction');
  room.map = Array.from({ length: H }, () => Array(W).fill(1));
  for (let y = 1; y <= 4; y++) for (let x = 0; x <= 12; x++) room.map[y][x] = 0;
  for (let y = 8; y < H; y++) for (let x = 9; x < W; x++) room.map[y][x] = 0;
  room.doorLinks = {};
  for (let y = 1; y <= 4; y++) {
    room.map[y][0] = 6;
    room.doorLinks['0,' + y] = junction;
  }
  room.spawn = { x: 2, y: 3 };
  room.holeLayoutVersion = 1;
  return p;
}
export const jumpIslandPlatforms = [
  [110, 220, 94],
  [310, 120, 94],
  [540, 330, 100],
];
export function addJumpIslands(p: Project) {
  const existing = p.rooms.find((room) => room.scene === 'darkJumpIslands');
  if (existing) {
    if (existing.islandsSizeVersion !== 2) {
      const oldPlatforms = [
        [110, 220, 82],
        [310, 120, 82],
        [540, 330, 88],
      ];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const px = x * T + 20,
            py = y * T + 20;
          const inside = (platforms: number[][]) =>
            platforms.some(([cx, cy, r]) => Math.hypot(px - cx, py - cy) < r);
          if (existing.map[y][x] === 1 && inside(jumpIslandPlatforms) && !inside(oldPlatforms))
            existing.map[y][x] = 0;
        }
      existing.islandsSizeVersion = 2;
    }
    return p;
  }
  if (p.rooms.length >= 20) return p;
  const previous = p.rooms.findIndex((room) => room.scene === 'darkGlowPassage');
  if (previous < 0) return p;
  const map: number[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      const px = x * T + 20,
        py = y * T + 20;
      return jumpIslandPlatforms.some(([cx, cy, r]) => Math.hypot(px - cx, py - cy) < r) ||
        (px < 110 && py >= 200 && py <= 240) ||
        (px > 540 && py >= 320 && py <= 360)
        ? 0
        : 1;
    }),
  );
  map[5][0] = 6;
  const destination = p.rooms.length;
  p.rooms.push({
    name: 'D.G.W — The Leaping Isles',
    scene: 'darkJumpIslands',
    islandsSizeVersion: 2,
    theme: 'dark',
    map,
    spawn: { x: 1, y: 5 },
    flowey: { x: 2, y: 5 },
    dialogue: [],
    npcs: [],
    target: previous,
    doorLinks: { '0,5': previous },
    jumpPads: [
      { x: 3, y: 4, targetX: 7, targetY: 3 },
      { x: 8, y: 3, targetX: 13, targetY: 8 },
    ],
  });
  const source = p.rooms[previous];
  source.doorLinks = { ...(source.doorLinks ?? {}) };
  for (let y = 8; y < H; y++) {
    source.map[y][14] = 0;
    source.map[y][15] = 6;
    source.doorLinks['15,' + y] = destination;
  }
  return p;
}
export function addWindingPassage(p: Project) {
  if (p.rooms.some((room) => room.scene === 'darkWindingPassage') || p.rooms.length >= 20) return p;
  const previous = p.rooms.findIndex((room) => room.scene === 'darkJumpIslands');
  if (previous < 0) return p;
  const map: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
  // Left approach, tall bridge over the purple gap, and a lower right exit.
  for (let y = 5; y <= 7; y++) for (let x = 0; x <= 6; x++) map[y][x] = 0;
  for (let y = 0; y <= 7; y++) for (let x = 4; x <= 6; x++) map[y][x] = 0;
  for (let y = 0; y <= 2; y++) for (let x = 4; x <= 10; x++) map[y][x] = 0;
  for (let y = 0; y <= 10; y++) for (let x = 9; x <= 10; x++) map[y][x] = 0;
  for (let y = 10; y < H; y++) for (let x = 9; x < W; x++) map[y][x] = 0;
  const doorLinks: Record<string, number> = {};
  for (let y = 5; y <= 7; y++) {
    map[y][0] = 6;
    doorLinks['0,' + y] = previous;
  }
  const destination = p.rooms.length;
  p.rooms.push({
    name: 'D.G.W — The Winding Passage',
    scene: 'darkWindingPassage',
    theme: 'dark',
    map,
    spawn: { x: 2, y: 6 },
    flowey: { x: 1, y: 6 },
    dialogue: [],
    npcs: [],
    target: previous,
    doorLinks,
  });
  const source = p.rooms[previous];
  source.map[8][14] = 0;
  source.map[8][15] = 6;
  source.doorLinks = { ...(source.doorLinks ?? {}), '15,8': destination };
  return p;
}
export function updateGoldenHallLayout(room: Room, previous: number) {
  if (room.goldenHallVersion === 2) return;
  room.map = Array.from({ length: H }, () => Array(W).fill(1));
  room.doorLinks = {};
  for (let y = 9; y <= 10; y++) {
    for (let x = 0; x <= 14; x++) room.map[y][x] = 0;
    room.map[y][0] = 6;
    room.doorLinks['0,' + y] = previous;
  }
  room.spawn = { x: 2, y: 10 };
  room.goldenHallVersion = 2;
}
export function addGoldenDoorHall(p: Project) {
  const previous = p.rooms.findIndex((room) => room.scene === 'darkWindingPassage');
  if (previous < 0) return p;
  const existing = p.rooms.find((room) => room.scene === 'darkGoldenHall');
  if (existing) {
    updateGoldenHallLayout(existing, previous);
    return p;
  }
  if (p.rooms.length >= 20) return p;
  const destination = p.rooms.length;
  const room: Room = {
    name: 'D.G.W — The Golden Door',
    scene: 'darkGoldenHall',
    map: [],
    spawn: { x: 2, y: 10 },
    theme: 'dark',
    flowey: { x: 1, y: 10 },
    dialogue: [],
    npcs: [],
    target: previous,
  };
  updateGoldenHallLayout(room, previous);
  p.rooms.push(room);
  const source = p.rooms[previous];
  source.doorLinks = { ...(source.doorLinks ?? {}) };
  for (let y = 10; y < H; y++) {
    source.map[y][14] = 0;
    source.map[y][15] = 6;
    source.doorLinks['15,' + y] = destination;
  }
  return p;
}
