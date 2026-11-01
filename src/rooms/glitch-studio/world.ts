import { H, W } from '../../game/config.ts';
import type { Project } from '../../world/types.ts';
import { addCoreFallSpike } from '../core/world.ts';
import { createStudioRoom, glitchStudioScene } from './glitch-studio.ts';

export function addGlitchWorld(p: Project) {
  const deep = p.rooms.find((room) => room.scene === 'coreDepths');
  if (!deep) return p;
  if (!p.rooms.some((room) => room.scene === 'glitchWorld')) {
    if (p.rooms.length >= 20) return p;
    const map: number[][] = Array.from({ length: H }, (_, y) => Array(W).fill(y >= 4 && y <= 8 ? 0 : 1));
    p.rooms.push({
      name: 'Glitch World',
      scene: 'glitchWorld',
      theme: 'dark',
      map,
      spawn: { x: 8, y: 6 },
      flowey: { x: 7, y: 6 },
      npcs: [],
      dialogue: [],
      target: -1,
      doorLinks: {},
    });
  }
  if (deep.coreFloorFallVersion !== 1) {
    addCoreFallSpike(deep);
    deep.coreFloorFallVersion = 1;
  }
  return p;
}

export function addGlitchBossRoom(p: Project) {
  const walkway = p.rooms.findIndex((room) => room.scene === 'glitchWorld');
  if (walkway < 0) return p;
  let boss = p.rooms.findIndex((room) => room.scene === 'glitchBoss');
  if (boss < 0) {
    if (p.rooms.length >= 20) return p;
    const map: number[][] = Array.from({ length: H }, (_, y) => Array(W).fill(y >= 5 && y <= 10 ? 0 : 1));
    map[8][0] = 6;
    boss = p.rooms.length;
    p.rooms.push({
      name: 'Glitch World — Silent Encounter',
      scene: 'glitchBoss',
      theme: 'dark',
      map,
      spawn: { x: 2, y: 8 },
      flowey: { x: 1, y: 8 },
      npcs: [],
      dialogue: [],
      target: walkway,
      doorLinks: { '0,8': walkway },
    });
  }
  const encounter = p.rooms[boss];
  if (encounter.battleBackdropVersion !== 1) {
    if (encounter.glitchPoints === undefined)
      encounter.glitchPoints = [
        ...[0, 5, 7, 11].map((x) => ({
          x,
          y: 11,
          shape: 'pillar' as const,
          height: 12,
          width: 1,
          renderLayer: 'back' as const,
        })),
        { x: 2, y: 2, renderLayer: 'back' },
        { x: 13, y: 2, renderLayer: 'back' },
        { x: 15, y: 6, renderLayer: 'back' },
      ];
    encounter.battleBackdropVersion = 1;
  }
  const room = p.rooms[walkway];
  if (room.glitchBossExitVersion !== 1) {
    const y = [6, 5, 7, 4, 8].find((y) => room.map[y][15] === 0 && room.doorLinks?.['15,' + y] === undefined);
    if (y !== undefined) {
      room.map[y][15] = 6;
      room.doorLinks = { ...(room.doorLinks ?? {}), ['15,' + y]: boss };
    }
    room.glitchBossExitVersion = 1;
  }
  return p;
}

export function addGlitchStudioRoom(p: Project) {
  const boss = p.rooms.findIndex((room) => room.scene === 'glitchBoss');
  if (boss < 0) return p;
  let studio = p.rooms.findIndex((room) => room.scene === glitchStudioScene);
  if (studio < 0) {
    if (p.rooms.length >= 20) return p;
    studio = p.rooms.length;
    p.rooms.push(createStudioRoom(boss));
  }
  const room = p.rooms[boss];
  if (room.glitchStudioExitVersion !== 1) {
    const y = [8, 7, 9, 6, 10].find(
      (y) =>
        [0, 5].includes(room.map[y][15]) &&
        room.doorLinks?.[`15,${y}`] === undefined &&
        !(['npcs', 'trees', 'spikes', 'savePoints', 'jumpPads'] as const).some((field) =>
          room[field]?.some((point) => point.x === 15 && point.y === y),
        ),
    );
    if (y !== undefined) {
      room.map[y][15] = 6;
      room.doorLinks = { ...(room.doorLinks ?? {}), [`15,${y}`]: studio };
      room.glitchStudioExitVersion = 1;
    }
  }
  return p;
}
