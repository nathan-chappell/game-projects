import { W } from '../../game/config.ts';
import { blankMap } from '../../world/grid.ts';
import type { Project } from '../../world/types.ts';

export function fountainRoom() {
  const map = blankMap();
  for (let x = 0; x < W; x++) map[1][x] = 1;
  for (let y = 5; y <= 9; y++) for (let x = 4; x <= 11; x++) map[y][x] = 2;
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
    [2, 7],
    [13, 7],
  ])
    map[y][x] = 9;
  for (let y = 3; y <= 4; y++) for (let x = 7; x <= 8; x++) map[y][x] = 4;
  map[5][0] = 6;
  return {
    name: 'The Dark Fountain',
    theme: 'castle',
    scene: 'fountain',
    map,
    spawn: { x: 3, y: 6 },
    flowey: { x: 2, y: 6 },
    target: 2,
    dialogue: [
      '[Flowey] * The cracks all lead here... Kris, that is not just a little hole!',
      '[Susie] * KRIS! Finally! A little help here?',
      '[Ralsey] * Please stay back from the fountain! I am trying to keep its magic from spreading.',
      '[Kris] * Ralsey? Susie? How did you get here?',
      '[Susie] * We followed you into the castle. Then this thing started pouring darkness through the floor.',
      '[Susie] * I tried breaking the stone around it. Bad idea. It just got louder.',
      '[Ralsey] * It feels like something on the other side is pulling it open. My spell can only slow it down.',
      '[Flowey] * The barrier... We think your fountain touched the magic around the UNDERGROUND.',
      '[Ralsey] * That could be why I can feel two different kinds of magic here!',
      '[Kris] * If we close it now, what happens to everyone caught between the worlds?',
      '[Ralsey] * I do not know yet. We must keep it stable until we can separate the two kinds of magic safely.',
      '[Susie] * Great. A fountain that fights back, and now a talking flower. Weird day.',
      '[Flowey] * I have a name! It is Flowey. And I would also like the worlds to stop falling apart.',
      '[Susie] * Fine, Flowey. Help Kris look for a way to untangle this mess. Ralsey and I will hold it here.',
      '[Kris] * We will figure it out together.',
      '[Ralsey] * Thank you, Kris. Stay close, everyone. When the light pulses, the fountain is trying to grow again.',
    ],
  };
}

export function addFountainChapter(p: Project) {
  if ((p.chapter ?? 0) >= 3) return p;
  for (const room of p.rooms) {
    if (room.target >= 3) room.target++;
    if (room.doorLinks)
      for (const key of Object.keys(room.doorLinks)) if (room.doorLinks[key] >= 3) room.doorLinks[key]++;
  }
  p.rooms.splice(3, 0, fountainRoom());
  const echo = p.rooms[2];
  echo.map[5][15] = 6;
  echo.map[5][14] = 0;
  echo.doorLinks = { ...(echo.doorLinks ?? {}), '15,5': 3 };
  p.chapter = 3;
  return p;
}
