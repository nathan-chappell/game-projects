import { W } from '../../game/config.ts';
import { blankMap } from '../../world/grid.ts';
import type { Project } from '../../world/types.ts';

export function defaults(): Project {
  const chamber = blankMap(),
    hall = blankMap();
  for (let x = 0; x < W; x++) {
    chamber[1][x] = 1;
    hall[1][x] = 1;
  }
  for (let y = 3; y <= 9; y++) for (let x = 6; x <= 9; x++) chamber[y][x] = 2;
  for (const [x, y] of [
    [2, 3],
    [13, 3],
    [2, 8],
    [13, 8],
  ])
    chamber[y][x] = 8;
  for (const [x, y] of [
    [4, 9],
    [11, 7],
    [4, 4],
  ])
    chamber[y][x] = 9;
  chamber[3][4] = 7;
  chamber[5][15] = 6;
  for (let y = 4; y <= 6; y++) for (let x = 1; x <= 13; x++) hall[y][x] = 2;
  for (const [x, y] of [
    [3, 3],
    [12, 3],
    [3, 8],
    [12, 8],
  ])
    hall[y][x] = 8;
  for (const [x, y] of [
    [7, 8],
    [9, 3],
    [5, 9],
    [10, 9],
  ])
    hall[y][x] = 9;
  hall[5][0] = 6;
  return {
    version: 2,
    id: 'two-worlds-castle-v1',
    updatedAt: 0,
    rooms: [
      {
        name: 'The Waking Chamber',
        theme: 'castle',
        map: chamber,
        spawn: { x: 7, y: 7 },
        flowey: { x: 8, y: 4 },
        dialogue: [],
        target: 1,
      },
      {
        name: 'The Silent Hall',
        theme: 'castle',
        map: hall,
        spawn: { x: 2, y: 5 },
        flowey: { x: 5, y: 5 },
        dialogue: [
          '* Hi... you finally woke up.',
          '* Something has happened.',
          '* The UNDERGROUND and the legend of DELTARUNE have been combined...',
          "* ...or something like that. I don't know what's happening.",
          '* You need to help me.',
        ],
        target: 0,
      },
    ],
  };
}
