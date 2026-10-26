import { buildKey, H, W, tiles, T } from './config.js';

// Rooms are grids of tile numbers. These updates add story rooms without replacing saved edits.
const clone = (v) => JSON.parse(JSON.stringify(v));

function validBuild(build) {
  return (
    build &&
    build.format === 'little-lantern-build' &&
    build.version === 1 &&
    Number.isFinite(build.savedAt) &&
    validProject(build.project)
  );
}

function readSavedBuild() {
  try {
    const build = JSON.parse(localStorage.getItem(buildKey));
    return validBuild(build) ? build : null;
  } catch {
    return null;
  }
}

// An array is a list. Here, each row is a list of tile numbers; tiles are listed in config.js.
function blankMap() {
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 1 : 0)),
  );
}

function defaults() {
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

function validNpcs(npcs) {
  return (
    npcs === undefined ||
    (Array.isArray(npcs) &&
      npcs.length <= 24 &&
      new Set(npcs.map((n) => n && n.id)).size === npcs.length &&
      npcs.every(
        (n) =>
          n &&
          typeof n.id === 'string' &&
          n.id.length <= 80 &&
          n.sprite === 'frog' &&
          typeof n.name === 'string' &&
          n.name.length > 0 &&
          n.name.length <= 32 &&
          Number.isInteger(n.x) &&
          n.x >= 0 &&
          n.x < W &&
          Number.isInteger(n.y) &&
          n.y >= 0 &&
          n.y < H &&
          Array.isArray(n.speech) &&
          n.speech.length > 0 &&
          n.speech.length <= 100 &&
          n.speech.every((line) => typeof line === 'string' && line.length <= 1200),
      ))
  );
}

const validColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

function validTreeStyle(tree) {
  return (
    (tree.candy === undefined || (Number.isInteger(tree.candy) && tree.candy >= 0 && tree.candy <= 6)) &&
    ['canopyColor', 'accentColor', 'trunkColor'].every((key) => tree[key] === undefined || validColor(tree[key]))
  );
}

function validParticlePoints(points) {
  return (
    points === undefined ||
    (Array.isArray(points) &&
      points.length <= W * H &&
      points.every(
        (point) =>
          point &&
          Number.isInteger(point.x) &&
          point.x >= 0 &&
          point.x < W &&
          Number.isInteger(point.y) &&
          point.y >= 0 &&
          point.y < H,
      ))
  );
}

const objectFields = ['npcs', 'trees', 'savePoints', 'spikes', 'jumpPads', 'particlePoints', 'glitchPoints'];

const objectLayer = (object) => object.renderLayer || 'normal';

function validDrawStyle(object) {
  return object && (object.renderLayer === undefined || ['normal', 'back', 'ground'].includes(object.renderLayer));
}

function validGlitchStyle(point) {
  return (
    (point.shape === undefined || point.shape === 'pillar') &&
    (point.height === undefined || (Number.isInteger(point.height) && point.height >= 1 && point.height <= 12)) &&
    (point.width === undefined || (Number.isInteger(point.width) && point.width >= 1 && point.width <= 4))
  );
}

function validProject(p) {
  return (
    p &&
    p.version === 2 &&
    p.id === 'two-worlds-castle-v1' &&
    Number.isFinite(p.updatedAt) &&
    Array.isArray(p.rooms) &&
    p.rooms.length >= 2 &&
    p.rooms.length <= 20 &&
    p.rooms.every(
      (r) =>
        r &&
        objectFields.every(
          (field) => r[field] === undefined || (Array.isArray(r[field]) && r[field].every(validDrawStyle)),
        ) &&
        (r.glitchPoints === undefined || r.glitchPoints.every(validGlitchStyle)) &&
        ['hideGoldenDoor', 'hideHole'].every((key) => r[key] === undefined || typeof r[key] === 'boolean') &&
        (r.backgroundColor === undefined || validColor(r.backgroundColor)) &&
        (r.jumpPads === undefined ||
          (Array.isArray(r.jumpPads) &&
            r.jumpPads.length <= W * H &&
            r.jumpPads.every(
              (pad) =>
                pad &&
                ['x', 'targetX'].every((key) => Number.isInteger(pad[key]) && pad[key] >= 0 && pad[key] < W) &&
                ['y', 'targetY'].every((key) => Number.isInteger(pad[key]) && pad[key] >= 0 && pad[key] < H) &&
                (pad.targetRoom !== undefined || pad.x !== pad.targetX || pad.y !== pad.targetY) &&
                (pad.targetRoom === undefined ||
                  (Number.isInteger(pad.targetRoom) && pad.targetRoom >= 0 && pad.targetRoom < p.rooms.length)) &&
                (pad.launchX === undefined || (Number.isInteger(pad.launchX) && pad.launchX >= 0 && pad.launchX < W)) &&
                (pad.launchY === undefined || (Number.isInteger(pad.launchY) && pad.launchY >= 0 && pad.launchY < H)),
            ))) &&
        (r.spikes === undefined ||
          (Array.isArray(r.spikes) &&
            r.spikes.length <= W * H &&
            r.spikes.every(
              (point) =>
                point &&
                Number.isInteger(point.x) &&
                point.x >= 0 &&
                point.x < W &&
                Number.isInteger(point.y) &&
                point.y >= 0 &&
                point.y < H,
            ))) &&
        (r.tileColors === undefined ||
          (r.tileColors &&
            typeof r.tileColors === 'object' &&
            !Array.isArray(r.tileColors) &&
            Object.keys(r.tileColors).length <= W * H &&
            Object.entries(r.tileColors).every(
              ([key, color]) => /^\d{1,2},\d{1,2}$/.test(key) && validColor(color),
            ))) &&
        (r.trees === undefined ||
          (Array.isArray(r.trees) &&
            r.trees.length <= 48 &&
            r.trees.every(
              (point) =>
                point &&
                validTreeStyle(point) &&
                Number.isInteger(point.x) &&
                point.x >= 0 &&
                point.x < W &&
                Number.isInteger(point.y) &&
                point.y >= 0 &&
                point.y < H,
            ))) &&
        validParticlePoints(r.particlePoints) &&
        validParticlePoints(r.glitchPoints) &&
        (r.savePoints === undefined ||
          (Array.isArray(r.savePoints) &&
            r.savePoints.length <= W * H &&
            r.savePoints.every(
              (point) =>
                point &&
                Number.isInteger(point.x) &&
                point.x >= 0 &&
                point.x < W &&
                Number.isInteger(point.y) &&
                point.y >= 0 &&
                point.y < H,
            ))) &&
        validNpcs(r.npcs) &&
        typeof r.name === 'string' &&
        r.name.length <= 32 &&
        ['room', 'garden', 'castle', 'dark'].includes(r.theme) &&
        Array.isArray(r.map) &&
        r.map.length === H &&
        r.map.every(
          (row) =>
            Array.isArray(row) &&
            row.length === W &&
            row.every((t) => Number.isInteger(t) && t >= 0 && t < tiles.length),
        ) &&
        ['spawn', 'flowey'].every(
          (k) =>
            r[k] &&
            Number.isInteger(r[k].x) &&
            Number.isInteger(r[k].y) &&
            r[k].x >= 0 &&
            r[k].x < W &&
            r[k].y >= 0 &&
            r[k].y < H,
        ) &&
        Array.isArray(r.dialogue) &&
        r.dialogue.length <= 100 &&
        r.dialogue.every((s) => typeof s === 'string' && s.length <= 1200) &&
        Number.isInteger(r.target) &&
        r.target >= -1 &&
        r.target < p.rooms.length &&
        (!r.doorLinks ||
          (typeof r.doorLinks === 'object' &&
            !Array.isArray(r.doorLinks) &&
            Object.entries(r.doorLinks).every(
              ([key, v]) => /^\d+,\d+$/.test(key) && Number.isInteger(v) && v >= 0 && v < p.rooms.length,
            ))),
    )
  );
}

function echoChamber() {
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

function addEchoChapter(p) {
  if (p.chapter >= 2) return p;
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
  hall.doorLinks = { ...hall.doorLinks, '15,5': 2 };
  p.chapter = 2;
  return p;
}

function fountainRoom() {
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

function addFountainChapter(p) {
  if (p.chapter >= 3) return p;
  for (const room of p.rooms) {
    if (room.target >= 3) room.target++;
    if (room.doorLinks)
      for (const key of Object.keys(room.doorLinks)) if (room.doorLinks[key] >= 3) room.doorLinks[key]++;
  }
  p.rooms.splice(3, 0, fountainRoom());
  const echo = p.rooms[2];
  echo.map[5][15] = 6;
  echo.map[5][14] = 0;
  echo.doorLinks = { ...echo.doorLinks, '15,5': 3 };
  p.chapter = 3;
  return p;
}

function darkWorldArrival() {
  const map = Array.from({ length: H }, () => Array(W).fill(1));
  // The reference has a black passage extending right across a purple field.
  for (let y = 5; y <= 7; y++) for (let x = 3; x < W; x++) map[y][x] = 0;
  return {
    name: 'D.G.W — Arrival',
    theme: 'dark',
    scene: 'darkArrival',
    map,
    spawn: { x: 5, y: 6 },
    flowey: { x: 4, y: 6 },
    dialogue: [],
    target: -1,
    npcs: [],
  };
}

function addDarkWorldChapter(p) {
  if (p.chapter >= 4) return p;
  for (const room of p.rooms) {
    if (room.target >= 4) room.target++;
    if (room.doorLinks)
      for (const key of Object.keys(room.doorLinks)) if (room.doorLinks[key] >= 4) room.doorLinks[key]++;
  }
  p.rooms.splice(4, 0, darkWorldArrival());
  p.chapter = 4;
  return p;
}

function addDarkWorldJunction(p) {
  if (p.rooms.some((room) => room.scene === 'darkJunction') || p.rooms.length >= 20) return p;
  const arrivalIndex = p.rooms.findIndex((room) => room.scene === 'darkArrival');
  if (arrivalIndex < 0) return p;
  const map = Array.from({ length: H }, () => Array(W).fill(1));
  // A broad horizontal passage with a central branch leading downward.
  for (let y = 3; y <= 6; y++) for (let x = 0; x < W; x++) map[y][x] = 0;
  for (let y = 7; y < H; y++) for (let x = 6; x <= 9; x++) map[y][x] = 0;
  map[4][0] = 6;
  const destination = p.rooms.length;
  p.rooms.push({
    name: 'D.G.W — The Junction',
    scene: 'darkJunction',
    theme: 'dark',
    map,
    spawn: { x: 2, y: 4 },
    flowey: { x: 1, y: 4 },
    dialogue: [],
    npcs: [],
    target: arrivalIndex,
    doorLinks: { '0,4': arrivalIndex },
  });
  const arrival = p.rooms[arrivalIndex];
  // Keep player-made room edits; only open the connecting passage.
  arrival.map[6][14] = 0;
  arrival.map[6][15] = 6;
  arrival.doorLinks = { ...arrival.doorLinks, '15,6': destination };
  p.chapter = Math.max(p.chapter || 0, 5);
  return p;
}

function addDarkWorldDescent(p) {
  const existing = p.rooms.find((room) => room.scene === 'darkDescent');
  if (existing) {
    if (existing.descentLayoutVersion !== 3) {
      // Undo the earlier horizontal extension, preserving placed objects and edited tiles.
      if (existing.descentLayoutVersion === 2) {
        for (let y = 8; y <= 10; y++)
          for (let x = 1; x <= 3; x++) {
            const occupied =
              (existing.savePoints || []).some((point) => point.x === x && point.y === y) ||
              (existing.npcs || []).some((npc) => npc.x === x && npc.y === y) ||
              (existing.spawn.x === x && existing.spawn.y === y);
            if (existing.map[y][x] === 0 && !occupied) existing.map[y][x] = 1;
          }
      }
      const junctionIndex = p.rooms.findIndex((room) => room.scene === 'darkJunction');
      existing.doorLinks = { ...existing.doorLinks };
      for (let x = 8; x <= 11; x++) {
        existing.map[0][x] = 6;
        existing.map[1][x] = 0;
        if (existing.map[2][x] === 6) existing.map[2][x] = 0;
        delete existing.doorLinks[x + ',2'];
        existing.doorLinks[x + ',0'] = junctionIndex;
      }
      existing.spawn = { x: 8, y: 1 };
      existing.descentLayoutVersion = 3;
    }
    return p;
  }
  if (p.rooms.length >= 20) return p;
  const junctionIndex = p.rooms.findIndex((room) => room.scene === 'darkJunction');
  if (junctionIndex < 0) return p;
  const map = Array.from({ length: H }, () => Array(W).fill(1));
  // The reference's tall shaft opens into a wider ledge on its lower left.
  for (let y = 0; y <= 10; y++) for (let x = 8; x <= 11; x++) map[y][x] = 0;
  for (let y = 8; y <= 10; y++) for (let x = 4; x <= 11; x++) map[y][x] = 0;
  const destination = p.rooms.length,
    doorLinks = {};
  for (let x = 8; x <= 11; x++) {
    map[0][x] = 6;
    doorLinks[x + ',0'] = junctionIndex;
  }
  p.rooms.push({
    name: 'D.G.W — The Descent',
    scene: 'darkDescent',
    descentLayoutVersion: 3,
    theme: 'dark',
    map,
    spawn: { x: 8, y: 1 },
    flowey: { x: 9, y: 1 },
    dialogue: [],
    npcs: [],
    target: junctionIndex,
    doorLinks,
  });
  const junction = p.rooms[junctionIndex];
  junction.doorLinks = { ...junction.doorLinks };
  for (let x = 6; x <= 9; x++) {
    junction.map[10][x] = 0;
    junction.map[11][x] = 6;
    junction.doorLinks[x + ',11'] = destination;
  }
  p.chapter = Math.max(p.chapter || 0, 6);
  return p;
}

function addDarkWorldGlowPassage(p) {
  if (p.rooms.some((room) => room.scene === 'darkGlowPassage') || p.rooms.length >= 20) return p;
  const junctionIndex = p.rooms.findIndex((room) => room.scene === 'darkJunction');
  if (junctionIndex < 0) return p;
  const map = Array.from({ length: H }, () => Array(W).fill(1)),
    doorLinks = {};
  for (let y = 4; y <= 7; y++) {
    for (let x = 0; x < W; x++) map[y][x] = 0;
    map[y][0] = 6;
    doorLinks['0,' + y] = junctionIndex;
  }
  const destination = p.rooms.length;
  p.rooms.push({
    name: 'D.G.W — The Glowing Passage',
    scene: 'darkGlowPassage',
    theme: 'dark',
    map,
    spawn: { x: 2, y: 5 },
    flowey: { x: 1, y: 5 },
    dialogue: [],
    npcs: [],
    target: junctionIndex,
    doorLinks,
  });
  const junction = p.rooms[junctionIndex];
  junction.doorLinks = { ...junction.doorLinks };
  for (let y = 3; y <= 6; y++) {
    junction.map[y][14] = 0;
    junction.map[y][15] = 6;
    junction.doorLinks['15,' + y] = destination;
  }
  p.chapter = Math.max(p.chapter || 0, 7);
  return p;
}

function customizeHolePassage(p) {
  const room = p.rooms.find((room) => room.scene === 'darkGlowPassage');
  if (!room || room.holeLayoutVersion === 1) return p;
  const junction = p.rooms.findIndex((room) => room.scene === 'darkJunction');
  room.map = Array.from({ length: H }, () => Array(W).fill(1));
  for (let y = 1; y <= 4; y++) for (let x = 0; x <= 12; x++) room.map[y][x] = 0;
  for (let y = 8; y < H; y++) for (let x = 9; x < W; x++) room.map[y][x] = 0;
  room.doorLinks = {};
  for (let y = 1; y <= 4; y++) {
    room.map[y][0] = 6;
    room.doorLinks['0,' + y] = junction;
  }
  room.spawn = { x: 2, y: 3 };
  room.holeLayoutVersion = 1;
  return p;
}

const jumpIslandPlatforms = [
  [110, 220, 94],
  [310, 120, 94],
  [540, 330, 100],
];

function addJumpIslands(p) {
  const existing = p.rooms.find((room) => room.scene === 'darkJumpIslands');
  if (existing) {
    if (existing.islandsSizeVersion !== 2) {
      const oldPlatforms = [
        [110, 220, 82],
        [310, 120, 82],
        [540, 330, 88],
      ];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const px = x * T + 20,
            py = y * T + 20;
          const inside = (platforms) => platforms.some(([cx, cy, r]) => Math.hypot(px - cx, py - cy) < r);
          if (existing.map[y][x] === 1 && inside(jumpIslandPlatforms) && !inside(oldPlatforms)) existing.map[y][x] = 0;
        }
      existing.islandsSizeVersion = 2;
    }
    return p;
  }
  if (p.rooms.length >= 20) return p;
  const previous = p.rooms.findIndex((room) => room.scene === 'darkGlowPassage');
  if (previous < 0) return p;
  const map = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      const px = x * T + 20,
        py = y * T + 20;
      return jumpIslandPlatforms.some(([cx, cy, r]) => Math.hypot(px - cx, py - cy) < r) ||
        (px < 110 && py >= 200 && py <= 240) ||
        (px > 540 && py >= 320 && py <= 360)
        ? 0
        : 1;
    }),
  );
  map[5][0] = 6;
  const destination = p.rooms.length;
  p.rooms.push({
    name: 'D.G.W — The Leaping Isles',
    scene: 'darkJumpIslands',
    islandsSizeVersion: 2,
    theme: 'dark',
    map,
    spawn: { x: 1, y: 5 },
    flowey: { x: 2, y: 5 },
    dialogue: [],
    npcs: [],
    target: previous,
    doorLinks: { '0,5': previous },
    jumpPads: [
      { x: 3, y: 4, targetX: 7, targetY: 3 },
      { x: 8, y: 3, targetX: 13, targetY: 8 },
    ],
  });
  const source = p.rooms[previous];
  source.doorLinks = { ...source.doorLinks };
  for (let y = 8; y < H; y++) {
    source.map[y][14] = 0;
    source.map[y][15] = 6;
    source.doorLinks['15,' + y] = destination;
  }
  return p;
}

function addWindingPassage(p) {
  if (p.rooms.some((room) => room.scene === 'darkWindingPassage') || p.rooms.length >= 20) return p;
  const previous = p.rooms.findIndex((room) => room.scene === 'darkJumpIslands');
  if (previous < 0) return p;
  const map = Array.from({ length: H }, () => Array(W).fill(1));
  // Left approach, tall bridge over the purple gap, and a lower right exit.
  for (let y = 5; y <= 7; y++) for (let x = 0; x <= 6; x++) map[y][x] = 0;
  for (let y = 0; y <= 7; y++) for (let x = 4; x <= 6; x++) map[y][x] = 0;
  for (let y = 0; y <= 2; y++) for (let x = 4; x <= 10; x++) map[y][x] = 0;
  for (let y = 0; y <= 10; y++) for (let x = 9; x <= 10; x++) map[y][x] = 0;
  for (let y = 10; y < H; y++) for (let x = 9; x < W; x++) map[y][x] = 0;
  const doorLinks = {};
  for (let y = 5; y <= 7; y++) {
    map[y][0] = 6;
    doorLinks['0,' + y] = previous;
  }
  const destination = p.rooms.length;
  p.rooms.push({
    name: 'D.G.W — The Winding Passage',
    scene: 'darkWindingPassage',
    theme: 'dark',
    map,
    spawn: { x: 2, y: 6 },
    flowey: { x: 1, y: 6 },
    dialogue: [],
    npcs: [],
    target: previous,
    doorLinks,
  });
  const source = p.rooms[previous];
  source.map[8][14] = 0;
  source.map[8][15] = 6;
  source.doorLinks = { ...source.doorLinks, '15,8': destination };
  return p;
}

function updateGoldenHallLayout(room, previous) {
  if (room.goldenHallVersion === 2) return;
  room.map = Array.from({ length: H }, () => Array(W).fill(1));
  room.doorLinks = {};
  for (let y = 9; y <= 10; y++) {
    for (let x = 0; x <= 14; x++) room.map[y][x] = 0;
    room.map[y][0] = 6;
    room.doorLinks['0,' + y] = previous;
  }
  room.spawn = { x: 2, y: 10 };
  room.goldenHallVersion = 2;
}

function addGoldenDoorHall(p) {
  const previous = p.rooms.findIndex((room) => room.scene === 'darkWindingPassage');
  if (previous < 0) return p;
  const existing = p.rooms.find((room) => room.scene === 'darkGoldenHall');
  if (existing) {
    updateGoldenHallLayout(existing, previous);
    return p;
  }
  if (p.rooms.length >= 20) return p;
  const destination = p.rooms.length;
  const room = {
    name: 'D.G.W — The Golden Door',
    scene: 'darkGoldenHall',
    theme: 'dark',
    flowey: { x: 1, y: 10 },
    dialogue: [],
    npcs: [],
    target: previous,
  };
  updateGoldenHallLayout(room, previous);
  p.rooms.push(room);
  const source = p.rooms[previous];
  source.doorLinks = { ...source.doorLinks };
  for (let y = 10; y < H; y++) {
    source.map[y][14] = 0;
    source.map[y][15] = 6;
    source.doorLinks['15,' + y] = destination;
  }
  return p;
}

function addFurnaceChamber(p) {
  const existing = p.rooms.find((room) => room.scene === 'darkFurnace');
  if (existing) {
    addCoreFroggit(existing);
    return p;
  }
  if (p.rooms.length >= 20) return p;
  const previous = p.rooms.findIndex((room) => room.scene === 'darkGoldenHall');
  if (previous < 0) return p;
  const map = Array.from({ length: H }, () => Array(W).fill(1));
  for (let y = 7; y <= 9; y++) for (let x = 3; x <= 12; x++) map[y][x] = 0;
  map[8][3] = 6;
  p.rooms.push({
    name: 'The Furnace Chamber',
    scene: 'darkFurnace',
    theme: 'dark',
    map,
    spawn: { x: 5, y: 8 },
    flowey: { x: 4, y: 8 },
    npcs: [],
    dialogue: [],
    target: previous,
    doorLinks: { '3,8': previous },
  });
  addCoreFroggit(p.rooms[p.rooms.length - 1]);
  return p;
}

function addCoreFroggit(room) {
  // Migrate older adventures once, keeping later Build edits and deletions.
  if (room.coreFroggitAdded) return;
  room.coreFroggitAdded = true;
  room.npcs ??= [];
  if (room.npcs.length >= 24 || room.npcs.some((npc) => npc.id === 'core-warning-froggit')) return;
  for (const y of [8, 9, 7])
    for (const x of [10, 11, 12, 9, 8]) {
      if (
        tiles[room.map[y][x]].solid ||
        room.map[y][x] === 6 ||
        room.npcs.some((npc) => npc.x === x && npc.y === y) ||
        ['trees', 'savePoints', 'spikes', 'jumpPads'].some((key) =>
          room[key]?.some((point) => point.x === x && point.y === y),
        ) ||
        [room.spawn, room.flowey].some((point) => point.x === x && point.y === y)
      )
        continue;
      room.npcs.push({
        id: 'core-warning-froggit',
        sprite: 'frog',
        name: 'Froggit',
        x,
        y,
        speech: ['Hey! Something weird is happening in the Core!!!'],
      });
      return;
    }
}

function addCoreEntrance(p) {
  const outside = p.rooms.findIndex((room) => room.scene === 'darkFurnace');
  if (outside < 0) return p;
  let inside = p.rooms.findIndex((room) => room.scene === 'coreEntrance');
  if (inside < 0) {
    if (p.rooms.length >= 20) return p;
    const map = Array.from({ length: H }, () => Array(W).fill(1));
    for (let y = 2; y <= 10; y++) for (let x = 6; x <= 9; x++) map[y][x] = 0;
    for (let y = 8; y <= 10; y++) for (let x = 3; x <= 12; x++) map[y][x] = 0;
    inside = p.rooms.length;
    p.rooms.push({
      name: 'Inside the CORE',
      scene: 'coreEntrance',
      theme: 'dark',
      map,
      spawn: { x: 8, y: 9 },
      flowey: { x: 7, y: 9 },
      npcs: [],
      dialogue: [],
      target: -1,
      doorLinks: {},
    });
  }
  const room = p.rooms[outside];
  if (room.coreBounceAdded) return p;
  room.coreBounceAdded = true;
  room.jumpPads ??= [];
  for (const [x, y] of [
    [12, 8],
    [12, 9],
    [12, 7],
    [11, 9],
    [11, 7],
  ]) {
    if (
      tiles[room.map[y][x]].solid ||
      room.map[y][x] === 6 ||
      ['npcs', 'trees', 'spikes', 'jumpPads', 'savePoints'].some((key) =>
        room[key]?.some((point) => point.x === x && point.y === y),
      ) ||
      [room.spawn, room.flowey].some((point) => point.x === x && point.y === y)
    )
      continue;
    room.jumpPads.push({ x, y, targetRoom: inside, targetX: 8, targetY: 9, launchX: 8, launchY: 4 });
    break;
  }
  return p;
}

function addCoreFallSpike(room) {
  // Existing Build placements (including an explicitly empty list) take priority.
  if (room.spikes === undefined) {
    room.spikes = [];
    for (const [x, y] of [
      [8, 5],
      [7, 5],
      [8, 4],
      [7, 4],
    ]) {
      if (
        tiles[room.map[y][x]].solid ||
        room.map[y][x] === 6 ||
        ['npcs', 'trees', 'savePoints', 'jumpPads'].some((key) =>
          room[key]?.some((point) => point.x === x && point.y === y),
        ) ||
        Math.hypot(room.spawn.x - x, room.spawn.y - y) < 2.5
      )
        continue;
      room.spikes.push({ x, y });
      break;
    }
  }
}

function addLowerCore(p) {
  const entry = p.rooms.find((room) => room.scene === 'coreEntrance');
  if (!entry) return p;
  if (!p.rooms.some((room) => room.scene === 'coreLower')) {
    if (p.rooms.length >= 20) return p;
    const map = Array.from({ length: H }, () => Array(W).fill(1));
    for (let y = 2; y <= 10; y++) for (let x = 6; x <= 9; x++) map[y][x] = 0;
    for (let y = 8; y <= 10; y++) for (let x = 3; x <= 12; x++) map[y][x] = 0;
    p.rooms.push({
      name: 'CORE — Lower Chamber',
      scene: 'coreLower',
      theme: 'dark',
      map,
      spawn: { x: 8, y: 9 },
      flowey: { x: 7, y: 9 },
      npcs: [],
      dialogue: [],
      savePoints: [{ x: 4, y: 8 }],
      target: -1,
      doorLinks: {},
    });
  }
  if (entry.coreFloorFallVersion === 1) return p;
  const outside = p.rooms.findIndex((room) => room.scene === 'darkFurnace');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const key = x + ',' + y;
      if (entry.map[y][x] === 6 && (entry.doorLinks?.[key] ?? entry.target) === outside) {
        entry.map[y][x] = 1;
        if (entry.tileColors) delete entry.tileColors[key];
      }
    }
  entry.doorLinks = Object.fromEntries(
    Object.entries(entry.doorLinks || {}).filter(([, target]) => target !== outside),
  );
  if (entry.target === outside) entry.target = -1;
  addCoreFallSpike(entry);
  entry.coreFloorFallVersion = 1;
  return p;
}

function addDeeperCore(p) {
  const lower = p.rooms.find((room) => room.scene === 'coreLower');
  if (!lower) return p;
  if (!p.rooms.some((room) => room.scene === 'coreDepths')) {
    if (p.rooms.length >= 20) return p;
    const map = Array.from({ length: H }, () => Array(W).fill(1));
    for (let y = 2; y <= 10; y++) for (let x = 6; x <= 9; x++) map[y][x] = 0;
    for (let y = 8; y <= 10; y++) for (let x = 3; x <= 12; x++) map[y][x] = 0;
    p.rooms.push({
      name: 'CORE — Deep Chamber',
      scene: 'coreDepths',
      theme: 'dark',
      map,
      spawn: { x: 8, y: 9 },
      flowey: { x: 7, y: 9 },
      npcs: [],
      dialogue: [],
      savePoints: [{ x: 4, y: 8 }],
      target: -1,
      doorLinks: {},
    });
  }
  if (lower.coreFloorFallVersion !== 1) {
    addCoreFallSpike(lower);
    lower.coreFloorFallVersion = 1;
  }
  return p;
}

function addGlitchWorld(p) {
  const deep = p.rooms.find((room) => room.scene === 'coreDepths');
  if (!deep) return p;
  if (!p.rooms.some((room) => room.scene === 'glitchWorld')) {
    if (p.rooms.length >= 20) return p;
    const map = Array.from({ length: H }, (_, y) => Array(W).fill(y >= 4 && y <= 8 ? 0 : 1));
    p.rooms.push({
      name: 'Glitch World',
      scene: 'glitchWorld',
      theme: 'dark',
      map,
      spawn: { x: 8, y: 6 },
      flowey: { x: 7, y: 6 },
      npcs: [],
      dialogue: [],
      target: -1,
      doorLinks: {},
    });
  }
  if (deep.coreFloorFallVersion !== 1) {
    addCoreFallSpike(deep);
    deep.coreFloorFallVersion = 1;
  }
  return p;
}

function addGlitchBossRoom(p) {
  const walkway = p.rooms.findIndex((room) => room.scene === 'glitchWorld');
  if (walkway < 0) return p;
  let boss = p.rooms.findIndex((room) => room.scene === 'glitchBoss');
  if (boss < 0) {
    if (p.rooms.length >= 20) return p;
    const map = Array.from({ length: H }, (_, y) => Array(W).fill(y >= 5 && y <= 10 ? 0 : 1));
    map[8][0] = 6;
    boss = p.rooms.length;
    p.rooms.push({
      name: 'Glitch World — Silent Encounter',
      scene: 'glitchBoss',
      theme: 'dark',
      map,
      spawn: { x: 2, y: 8 },
      flowey: { x: 1, y: 8 },
      npcs: [],
      dialogue: [],
      target: walkway,
      doorLinks: { '0,8': walkway },
    });
  }
  const encounter = p.rooms[boss];
  if (encounter.battleBackdropVersion !== 1) {
    if (encounter.glitchPoints === undefined)
      encounter.glitchPoints = [
        ...[0, 5, 7, 11].map((x) => ({ x, y: 11, shape: 'pillar', height: 12, width: 1, renderLayer: 'back' })),
        { x: 2, y: 2, renderLayer: 'back' },
        { x: 13, y: 2, renderLayer: 'back' },
        { x: 15, y: 6, renderLayer: 'back' },
      ];
    encounter.battleBackdropVersion = 1;
  }
  const room = p.rooms[walkway];
  if (room.glitchBossExitVersion !== 1) {
    const y = [6, 5, 7, 4, 8].find((y) => room.map[y][15] === 0 && room.doorLinks?.['15,' + y] === undefined);
    if (y !== undefined) {
      room.map[y][15] = 6;
      room.doorLinks = { ...room.doorLinks, ['15,' + y]: boss };
    }
    room.glitchBossExitVersion = 1;
  }
  return p;
}

// Run room updates in story order. Each update keeps the player's existing Build edits.
function upgradeProject(project) {
  const updates = [
    addEchoChapter,
    addFountainChapter,
    addDarkWorldChapter,
    addDarkWorldJunction,
    addDarkWorldDescent,
    addDarkWorldGlowPassage,
    customizeHolePassage,
    addJumpIslands,
    addWindingPassage,
    addGoldenDoorHall,
    addFurnaceChamber,
    addCoreEntrance,
    addLowerCore,
    addDeeperCore,
    addGlitchWorld,
    addGlitchBossRoom,
  ];
  for (const update of updates) project = update(project);
  return project;
}

export {
  clone,
  validBuild,
  readSavedBuild,
  blankMap,
  defaults,
  validProject,
  validColor,
  validGlitchStyle,
  objectLayer,
  jumpIslandPlatforms,
  upgradeProject,
};
