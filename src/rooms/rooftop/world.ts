import type { Project } from '../../world/types.ts';
import { createRooftopRoom, rooftopScene } from './neon-rooftop.ts';

export function addNeonRooftop(p: Project) {
  const crossing = p.rooms.findIndex((r) => r.scene === 'trafficCrossing');
  if (crossing < 0) return p;
  let roof = p.rooms.findIndex((r) => r.scene === rooftopScene);
  if (roof < 0) {
    if (p.rooms.length >= 25) return p;
    roof = p.rooms.length;
    p.rooms.push(createRooftopRoom(crossing));
  }
  const room = p.rooms[crossing];
  if (room.rooftopExitVersion !== 1) {
    const y = [7, 6, 5].find(
      (y) =>
        [0, 1, 5].includes(room.map[y][15]) &&
        room.doorLinks?.[`15,${y}`] === undefined &&
        !(['npcs', 'trees', 'spikes', 'savePoints', 'jumpPads'] as const).some((field) =>
          room[field]?.some((point) => point.x === 15 && point.y === y),
        ),
    );
    if (y !== undefined) {
      room.map[y][15] = 6;
      room.doorLinks = { ...(room.doorLinks ?? {}), [`15,${y}`]: roof };
      room.rooftopExitVersion = 1;
    }
  }
  return p;
}
