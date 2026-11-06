import type { Project, Room } from '../../world/types.ts';

export const postShowScene = 'postShowPassage';

export function createPostShowRoom(backstage: number): Room {
  const map: number[][] = Array.from({ length: 12 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) =>
      (x >= 1 && x <= 2 && y >= 1 && y <= 9) || (x >= 1 && x <= 14 && y >= 8 && y <= 9) ? 0 : 1,
    ),
  );
  map[1][1] = 6;
  return {
    name: 'Beyond the Show',
    scene: postShowScene,
    theme: 'dark',
    backgroundColor: '#000000',
    map,
    spawn: { x: 1, y: 4 },
    flowey: { x: 2, y: 4 },
    target: backstage,
    doorLinks: { '1,1': backstage },
    npcs: [],
    trees: [],
    spikes: [],
    savePoints: [],
    glitchPoints: [],
    dialogue: [],
  };
}

export function addPostShowPassage(p: Project) {
  const back = p.rooms.findIndex((room) => room.scene === 'glitchBackstage');
  if (back < 0) return p;
  let passage = p.rooms.findIndex((room) => room.scene === postShowScene);
  if (passage < 0) {
    if (p.rooms.length >= 28) return p;
    passage = p.rooms.length;
    p.rooms.push(createPostShowRoom(back));
  }
  const room = p.rooms[back];
  if (room.postShowExitVersion === 1) return p;
  const x = [11, 10, 12, 9, 13].find(
    (x) =>
      room.map[5][x] === 0 &&
      room.doorLinks?.[`${x},5`] === undefined &&
      !(['npcs', 'trees', 'spikes', 'savePoints', 'jumpPads', 'glitchPoints'] as const).some((field) =>
        room[field]?.some((point) => point.x === x && point.y === 5),
      ),
  );
  if (x !== undefined) {
    room.map[5][x] = 6;
    room.doorLinks = { ...room.doorLinks, [`${x},5`]: passage };
    room.postShowExitVersion = 1;
  }
  return p;
}

export function postShowDoorLocked(room: Room, x: number, y: number, project: Project, complete: boolean) {
  const target = room.doorLinks?.[`${x},${y}`];
  return (
    !complete &&
    room.scene === 'glitchBackstage' &&
    target !== undefined &&
    project.rooms[target]?.scene === postShowScene
  );
}
