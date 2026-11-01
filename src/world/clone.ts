// Rooms are grids of tile numbers. These updates add story rooms without replacing saved edits.
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
