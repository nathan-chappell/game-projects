import type { Project } from '../../world/types.ts';
import { rooftopScene } from '../rooftop/neon-rooftop.ts';
import { createQueenRoom, queenScene } from './queen-room.ts';

export function addQueenRoom(p: Project) {
  const roof = p.rooms.findIndex((r) => r.scene === rooftopScene);
  if (roof < 0) return p;
  let queen = p.rooms.findIndex((r) => r.scene === queenScene);
  if (queen < 0) {
    if (p.rooms.length >= 26) return p;
    queen = p.rooms.length;
    p.rooms.push(createQueenRoom(roof));
  }
  const room = p.rooms[roof];
  if (room.queenExitVersion !== 1) {
    const y = [9, 8].find(
      (y) =>
        [0, 1, 5].includes(room.map[y][15]) &&
        room.doorLinks?.[`15,${y}`] === undefined &&
        !(['npcs', 'trees', 'spikes', 'savePoints', 'jumpPads'] as const).some((field) =>
          room[field]?.some((point) => point.x === 15 && point.y === y),
        ),
    );
    if (y !== undefined) {
      room.map[y][15] = 6;
      room.doorLinks = { ...(room.doorLinks ?? {}), [`15,${y}`]: queen };
      room.queenExitVersion = 1;
    }
  }
  return p;
}
