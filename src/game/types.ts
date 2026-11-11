import type { VesselArrival } from '../battle/vessel/entrance.ts';
import type { KnightBattleIntro } from '../battle/knights/introduction.ts';
import type { KnightPath } from '../rooms/post-show/knight-path.ts';
import type { Encounter } from '../battle/shared/types.ts';
import type { Dialogue } from '../dialogue/types.ts';
import type { Inventory, ItemId, PartyHP, PartyName, TreeHarvests } from '../inventory/types.ts';
import type { ProgressSave } from '../persistence/types.ts';
import type { createTennaEntrance } from '../rooms/backstage/tenna-story.ts';
import type { createTraffic } from '../rooms/crossing/traffic.ts';
import type { createQueenPuzzle } from '../rooms/queen-terminal/queen-puzzle.ts';
import type { createHallway } from '../rooms/storage/storage-travel.ts';
import type { Layer, Point, Project } from '../world/types.ts';
export interface Story {
  met: boolean;
  joined: boolean;
  emerging: number;
  reveal: number;
  discussion: number;
  explained: boolean;
  foundFountain: boolean;
  fountainWorse: boolean;
  teamJoined: boolean;
  dived: boolean;
  goldenDoorExplained: boolean;
  coreExplained: boolean;
  coreFroggitWarned: boolean;
  coreGlitchNoticed: boolean;
  glitchArrivalSeen: boolean;
  noelleGone: boolean;
  noelleEscaped: boolean;
  studioExplained: boolean;
  tennaInvited: boolean;
  tennaStorageInvited: boolean;
  tennaElixirsReceived: boolean;
  collisionSeen: boolean;
  darkBattleSeen: boolean;
  jackRevealed: boolean;
  jackCandyReceived: boolean;
  tennaFinaleExplained: boolean;
  tennaFinaleComplete: boolean;
  knightStatuesExplained: boolean;
  queenBriefed: boolean;
  queenDemoSeen: boolean;
  queenSolved: boolean;
}
export interface Actor extends Point {
  name: string;
  worried?: boolean;
}
export interface Follower extends Point {
  trail: Point[];
  name?: string;
}
export interface Player extends Point {
  facing: string;
  moving: boolean;
  step: number;
}
export interface UndoEntry {
  project: Project;
  roomIndex: number;
  removedSaves?: { index: number; slot: ProgressSave }[];
}
export interface GameState {
  project: Project;
  mode: 'play' | 'build';
  roomIndex: number;
  tool: string | number;
  hover: Point | null;
  stroke: { changed: boolean; warned?: boolean; layerCells?: Set<string>; deletedCells?: Set<string> } | null;
  dialogue: Dialogue | null;
  selectedNpcId: string | null;
  npcSequence: number;
  placementLayer: Layer;
  layerApplyMode: boolean;
  glitchComfort: {
    roomIndex: number;
    age: number;
    reach: number;
    aside: number;
    starts: Record<string, Point>;
    targets: Record<string, Point>;
  } | null;
  glitchWaiting: Record<string, Point> | null;
  bossEncounter: Encounter | null;
  tennaEntrance: ReturnType<typeof createTennaEntrance> | null;
  collisionBlackout: { age: number; spoken: boolean } | null;
  queenPuzzle: ReturnType<typeof createQueenPuzzle> | null;
  queenDeparture: number | null;
  knightPath: KnightPath | null;
  knightBattle: KnightBattleIntro | null;
  vesselArrival?: VesselArrival | null;
  storageHallway: ReturnType<typeof createHallway> | null;
  traffic: ReturnType<typeof createTraffic> | null;
  pendingBossRoom: number | null;
  story: Story;
  partyHP: PartyHP;
  candyTarget: PartyName;
  selectedItem: ItemId | '';
  inventory: Inventory;
  treeHarvests: TreeHarvests;
  companions: (Follower & { name: string })[];
  buster: { age: number } | null;
  dive: { phase: string; age: number; starts: Record<string, Point> } | null;
  follower: Follower;
  player: Player;
  keys: Set<string>;
  undoStack: UndoEntry[];
  lastSpikeContact: string | null;
  cameraShakeTime: number;
  death: { age: number; menuShown: boolean } | null;
  holeFall: {
    age: number;
    actors: Actor[];
    kind?: string;
    targetRoom?: number;
    x?: number;
    y?: number;
    worldFrame?: HTMLCanvasElement;
  } | null;
  padJump: {
    age: number;
    targetRoom: number;
    targetX: number;
    targetY: number;
    launchX: number;
    launchY: number;
    actors: Actor[];
  } | null;
  pendingPad: (Point & { roomIndex: number }) | null;
  lastPadContact: string | null;
  lastTime: number;
  fade: number;
  doorCooldown: number;
  toastTimer: ReturnType<typeof setTimeout> | undefined;
  saveTimer: ReturnType<typeof setTimeout> | undefined;
}
