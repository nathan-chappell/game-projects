// Game settings: start here when you want to try a small change.
// The room grid is 16 tiles wide and 12 tiles tall. Each tile is 40 screen pixels.
const W = 16,
  H = 12,
  T = 40;

const tiles = [
  { id: 0, label: 'Floor', color: '#72577e', solid: false },
  { id: 1, label: 'Wall', color: '#35263f', solid: true },
  { id: 2, label: 'Rug', color: '#ad6b85', solid: false },
  { id: 3, label: 'Flowers', color: '#b1bc82', solid: false },
  { id: 4, label: 'Pond', color: '#557e97', solid: true },
  { id: 5, label: 'Path', color: '#c2ad85', solid: false },
  { id: 6, label: 'Door', color: '#eac780', solid: false },
  { id: 7, label: 'Table', color: '#a67a58', solid: true },
  { id: 8, label: 'Pillar', color: '#8b879b', solid: true },
  { id: 9, label: 'Rubble', color: '#686372', solid: false },
  { id: 10, label: 'Empty', color: '#11141d', solid: true },
];

// These names identify existing browser saves. Keep them the same when changing the code.
const keyName = 'two-worlds-castle-project-v1';

const buildKey = 'little-lantern-build-save-v1';

// A const gives a value a name. Other files can import that name and use it.
const maxHP = 100;

const partyNames = ['Kris', 'Susie', 'Ralsey', 'Flowey'];

const freshPartyHP = () => Object.fromEntries(partyNames.map((name) => [name, maxHP]));

// An object groups related facts. This one describes each kind of healing item.
// minHeal and maxHeal are the smallest and largest possible healing amounts.
const itemDefinitions = {
  gCandy: {
    name: 'G. Candy',
    minHeal: 35,
    maxHeal: 45,
    description: 'Restores a random 35–45 HP. Picked from a tree.',
  },
};

// A function is a reusable recipe. This returns a new, empty inventory each time.
const freshInventory = () => ({ items: { gCandy: 0 } });

const progressKey = 'little-lantern-save-slots-v1';

const progressFlags = ['met', 'joined', 'explained', 'foundFountain', 'fountainWorse', 'teamJoined', 'dived'];

// Pixels per second. Lenny: try 150, walk around, then try changing it back to 135.
const movementSpeed = 135;
const followSpeed = 165;

export {
  W,
  H,
  T,
  tiles,
  keyName,
  buildKey,
  maxHP,
  partyNames,
  freshPartyHP,
  itemDefinitions,
  freshInventory,
  progressKey,
  progressFlags,
  movementSpeed,
  followSpeed,
};
