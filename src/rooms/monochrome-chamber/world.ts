import type { Project } from '../../world/types.ts';
import { addJackToChamber, createCollisionChamber } from './collision-chamber.ts';

export function addCollisionChamber(p: Project) {
  const back = p.rooms.findIndex((r) => r.scene === 'glitchBackstage');
  if (back < 0) return p;
  let chamber = p.rooms.findIndex((r) => r.scene === 'collisionChamber');
  if (chamber < 0) {
    if (p.rooms.length >= 27) return p;
    chamber = p.rooms.length;
    p.rooms.push(createCollisionChamber(back));
  }
  addJackToChamber(p.rooms[chamber]);
  const room = p.rooms[back];
  if (room.collisionExitVersion !== 1) {
    const y = [8, 7, 9, 6, 10].find(
      (y) =>
        [0, 1, 5].includes(room.map[y][0]) &&
        room.doorLinks?.[`0,${y}`] === undefined &&
        !(['npcs', 'trees', 'spikes', 'savePoints'] as const).some((f) =>
          room[f]?.some((o) => o.x === 0 && o.y === y),
        ),
    );
    if (y !== undefined) {
      room.map[y][0] = 6;
      room.doorLinks = { ...(room.doorLinks ?? {}), [`0,${y}`]: chamber };
      room.collisionExitVersion = 1;
    }
  }
  return p;
}
