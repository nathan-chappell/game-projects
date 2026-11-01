import { H, W } from '../game/config.ts';

// An array is a list. Here, each row is a list of tile numbers; tiles are listed in config.js.
export function blankMap(): number[][] {
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 1 : 0)),
  );
}
