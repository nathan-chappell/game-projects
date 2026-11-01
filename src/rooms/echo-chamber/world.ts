import { W } from '../../game/config.ts';
import { blankMap } from '../../world/grid.ts';
import type { Project } from '../../world/types.ts';

export function echoChamber() {
  const map = blankMap();
  for (let x = 0; x < W; x++) map[1][x] = 1;
  for (let y = 4; y <= 8; y++) for (let x = 4; x <= 11; x++) map[y][x] = 2;
  for (const [x, y] of [
    [3, 3],
    [12, 3],
    [3, 9],
    [12, 9],
  ])
    map[y][x] = 8;
  for (const [x, y] of [
    [5, 3],
    [10, 3],
    [5, 9],
    [10, 9],
  ])
    map[y][x] = 9;
  map[3][7] = 7;
  map[3][8] = 7;
  map[5][0] = 6;
  return {
    name: 'The Echo Chamber',
    theme: 'castle',
    scene: 'worlds',
    map,
    spawn: { x: 5, y: 6 },
    flowey: { x: 4, y: 6 },
    target: 1,
    dialogue: [
      '[Flowey] * Kris... look at that crack. The light inside it keeps changing.',
      '[Kris] * That darkness... it looks like a Dark Fountain.',
      '[Flowey] * A fountain? In the UNDERGROUND, magic was holding a barrier together.',
      '[Kris] * What if the fountain touched that barrier?',
      '[Flowey] * Before everything changed, I saw a flash. Then the castle appeared around me.',
      '[Flowey] * Maybe the two kinds of magic pulled on each other... and tore a hole between our worlds.',
      '[Kris] * So the worlds are overlapping wherever the hole reaches.',
      '[Flowey] * That would explain the ruins inside this castle. But why did it start here?',
      '[Kris] * Someone might have opened the fountain on purpose.',
      '[Flowey] * Maybe. Or it was an accident. We need more than a guess before we try to close it.',
      '[Kris] * Then we follow the cracks. Find where the light is coming from.',
      '[Flowey] * Together, okay? I do not want to find out what happens if the worlds split while we are apart.',
    ],
  };
}

export function addEchoChapter(p: Project) {
  if ((p.chapter ?? 0) >= 2) return p;
  // Insert before player-made rooms, preserving their maps and destinations.
  for (const room of p.rooms) {
    if (room.target >= 2) room.target++;
    if (room.doorLinks)
      for (const key of Object.keys(room.doorLinks)) if (room.doorLinks[key] >= 2) room.doorLinks[key]++;
  }
  p.rooms.splice(2, 0, echoChamber());
  const hall = p.rooms[1];
  hall.map[5][15] = 6;
  hall.map[5][14] = 0;
  hall.doorLinks = { ...(hall.doorLinks ?? {}), '15,5': 2 };
  p.chapter = 2;
  return p;
}
