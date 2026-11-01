import type { Project } from '../../world/types.ts';
import { backstageScene } from '../backstage/backstage.ts';
import { createStorageRoom, storageScene } from './tenna-storage.ts';

export function addTennaStorage(p: Project) {
  const backstage = p.rooms.findIndex((room) => room.scene === backstageScene);
  if (backstage < 0) return p;
  let storage = p.rooms.findIndex((room) => room.scene === storageScene);
  if (storage < 0) {
    if (p.rooms.length >= 22) return p;
    storage = p.rooms.length;
    p.rooms.push(createStorageRoom(backstage));
  }
  const room = p.rooms[backstage];
  if (room.storageExitVersion !== 1) {
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
      room.doorLinks = { ...(room.doorLinks ?? {}), [`15,${y}`]: storage };
      room.storageExitVersion = 1;
    }
  }
  return p;
}
