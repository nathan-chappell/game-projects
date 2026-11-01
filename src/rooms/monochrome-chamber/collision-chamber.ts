import type { Room } from '../../world/types.ts';
export const collisionConversation = [
  { speaker: 'Ralsey', text: 'What is this, Flowey?' },
  { speaker: 'Flowey', text: 'Maybe other universes are colliding, too.' },
  { speaker: 'Susie', text: 'Yea, yea... I get it... No more smashing fountains.' },
];
export function createCollisionChamber(backstage: number): Room {
  const map: number[][] = Array.from({ length: 12 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) =>
      (y >= 7 && y <= 10 && x >= 2 && x <= 13) || (y === 11 && (x === 7 || x === 8)) ? 0 : 1,
    ),
  );
  map[11][8] = 6;
  const room = {
    name: 'The Monochrome Chamber',
    scene: 'collisionChamber',
    theme: 'dark',
    map,
    spawn: { x: 8, y: 10 },
    flowey: { x: 8, y: 11 },
    target: backstage,
    doorLinks: { '8,11': backstage },
    npcs: [],
    trees: [],
    spikes: [],
    savePoints: [],
    glitchPoints: [],
    dialogue: [],
  };
  return addJackToChamber(room);
}

export function addJackToChamber(room: Room) {
  if (room.jackRevealVersion === 1) return room;
  room.npcs ??= [];
  if (!room.npcs.some((n) => n.id === 'jackenstein')) {
    const positions = [
      { x: 12, y: 7 },
      { x: 13, y: 8 },
      { x: 11, y: 8 },
    ];
    const spot = positions.find(
      (p) =>
        room.map[p.y]?.[p.x] === 0 &&
        !(['npcs', 'trees', 'savePoints', 'spikes'] as const).some((f) =>
          room[f]?.some((o) => o.x === p.x && o.y === p.y),
        ),
    );
    if (spot && room.npcs.length < 24)
      room.npcs.push({
        id: 'jackenstein',
        name: 'Jackenstein',
        sprite: 'jackenstein',
        ...spot,
        speech: ['Idk what da points do... But that TV Man really wanted this lever left alone.'],
      });
  }
  if (!room.jackLever) {
    const spot = [
      { x: 2, y: 8 },
      { x: 3, y: 8 },
      { x: 2, y: 9 },
    ].find(
      (p) =>
        room.map[p.y]?.[p.x] === 0 &&
        !(['npcs', 'trees', 'savePoints', 'spikes'] as const).some((f) =>
          room[f]?.some((o) => o.x === p.x && o.y === p.y),
        ),
    );
    if (spot) {
      room.jackLever = spot;
      room.map[spot.y][spot.x] = 7;
    }
  }
  room.jackRevealVersion = 1;
  return room;
}
