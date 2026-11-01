import type { Inventory, ItemDefinition, ItemId, PartyHP, PartyName } from '../inventory/types.ts';
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

const partyNames: PartyName[] = ['Kris', 'Susie', 'Ralsey', 'Flowey'];

const freshPartyHP = (): PartyHP => ({ Kris: maxHP, Susie: maxHP, Ralsey: maxHP, Flowey: maxHP });

// An object groups related facts. This one describes each kind of carried item.
// minHeal and maxHeal are the smallest and largest possible healing amounts.
const itemDefinitions: Record<ItemId, ItemDefinition> = {
  jackCandy: {
    name: 'Jack.Candy',
    minHeal: maxHP,
    maxHeal: maxHP,
    description: 'Restores one teammate to MAX HP. A gift from Jackenstein.',
  },
  gCandy: {
    name: 'G. Candy',
    minHeal: 35,
    maxHeal: 45,
    description: 'Restores a random 35–45 HP. Picked from a tree.',
  },
  tpElixir: {
    name: 'TP Elixir',
    tpGain: 15,
    grazeTP: 4,
    description:
      'Battle only. Gain 15% TP now. Grazing grants 4% TP during Noelle’s next attack. Does not stack above 4%.',
  },
} satisfies Record<ItemId, ItemDefinition>;

// A function is a reusable recipe. This returns a new, empty inventory each time.
const freshInventory = (): Inventory => ({ items: { gCandy: 0, tpElixir: 0, jackCandy: 0 } });

const progressKey = 'little-lantern-save-slots-v1';

const progressFlags = [
  'met',
  'joined',
  'explained',
  'foundFountain',
  'fountainWorse',
  'teamJoined',
  'dived',
] as const;

// Pixels per second. Lenny: try 150, walk around, then try changing it back to 135.
const movementSpeed = 135;
const sprintMultiplier = 1.75;
const followSpeed = 165;

export {
  buildKey,
  followSpeed,
  freshInventory,
  freshPartyHP,
  H,
  itemDefinitions,
  keyName,
  maxHP,
  movementSpeed,
  partyNames,
  progressFlags,
  progressKey,
  sprintMultiplier,
  T,
  tiles,
  W,
};
