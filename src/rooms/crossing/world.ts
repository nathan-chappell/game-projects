import type { Project } from '../../world/types.ts';
import { createHallwayRoom } from '../storage/storage-travel.ts';
import { storageScene } from '../storage/tenna-storage.ts';
import { createTrafficRoom } from './traffic.ts';

export function addStorageCrossing(p: Project) {
  const storage = p.rooms.findIndex((r) => r.scene === storageScene);
  if (storage < 0) return p;
  let hall = p.rooms.findIndex((r) => r.scene === 'storageHallway'),
    traffic = p.rooms.findIndex((r) => r.scene === 'trafficCrossing');
  if (p.rooms.length + Number(hall < 0) + Number(traffic < 0) > 24) return p;
  if (hall < 0) {
    hall = p.rooms.length;
    p.rooms.push(createHallwayRoom(storage));
  }
  if (traffic < 0) {
    traffic = p.rooms.length;
    p.rooms.push(createTrafficRoom(hall));
  }
  const corridor = p.rooms[hall];
  if (corridor.crossingExitVersion !== 1) {
    corridor.doorLinks = { ...(corridor.doorLinks ?? {}), '15,8': traffic };
    corridor.crossingExitVersion = 1;
  }
  const room = p.rooms[storage];
  if (room.hallwayExitVersion !== 1) {
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
      room.doorLinks = { ...(room.doorLinks ?? {}), [`15,${y}`]: hall };
      room.hallwayExitVersion = 1;
    }
  }
  return p;
}
