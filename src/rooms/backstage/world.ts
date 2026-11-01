import type { Project } from '../../world/types.ts';
import { glitchStudioScene } from '../glitch-studio/glitch-studio.ts';
import { backstageScene, createBackstageRoom } from './backstage.ts';

export function addBackstageRoom(p: Project) {
  const studio = p.rooms.findIndex((room) => room.scene === glitchStudioScene);
  if (studio < 0) return p;
  let backstage = p.rooms.findIndex((room) => room.scene === backstageScene);
  if (backstage < 0) {
    // Reserve one story slot even when an older Build already used all 20 rooms.
    if (p.rooms.length >= 21) return p;
    backstage = p.rooms.length;
    p.rooms.push(createBackstageRoom(studio));
  }
  const backstageRoom = p.rooms[backstage];
  if (backstageRoom.backstageEntryVersion !== 1) {
    if (backstageRoom.doorLinks?.['0,8'] === studio) {
      backstageRoom.map[8][0] = 1;
      delete backstageRoom.doorLinks['0,8'];
    }
    backstageRoom.map[3][3] = 6;
    backstageRoom.map[4][3] = 0;
    backstageRoom.doorLinks = { ...(backstageRoom.doorLinks ?? {}), '3,3': studio };
    if (backstageRoom.spawn.x === 3 && backstageRoom.spawn.y === 8) backstageRoom.spawn = { x: 3, y: 5 };
    backstageRoom.flowey = { x: 3, y: 4 };
    backstageRoom.backstageEntryVersion = 1;
  }
  const room = p.rooms[studio];
  if (room.backstageExitVersion !== 1) {
    const y = [8, 7, 9, 6, 10].find(
      (y) =>
        [0, 1, 5].includes(room.map[y][15]) &&
        room.doorLinks?.[`15,${y}`] === undefined &&
        !(['npcs', 'trees', 'spikes', 'savePoints', 'jumpPads'] as const).some((field) =>
          room[field]?.some((point) => point.x === 15 && point.y === y),
        ),
    );
    if (y !== undefined) {
      room.map[y][15] = 6;
      room.doorLinks = { ...(room.doorLinks ?? {}), [`15,${y}`]: backstage };
      room.backstageExitVersion = 1;
    }
  }
  return p;
}
