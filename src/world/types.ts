/** Tile coordinates unless a caller explicitly converts them to screen pixels. */
export interface Point {
  x: number;
  y: number;
}
export type Layer = 'normal' | 'back' | 'ground';
export interface PlacedObject extends Point {
  renderLayer?: Layer;
}
export interface Tree extends PlacedObject {
  candy?: number;
  tpElixirs?: number;
  canopyColor?: string;
  accentColor?: string;
  trunkColor?: string;
}
export interface GlitchPoint extends PlacedObject {
  shape?: 'pillar';
  width?: number;
  height?: number;
}
export interface JumpPad extends PlacedObject {
  targetX: number;
  targetY: number;
  targetRoom?: number;
  launchX?: number;
  launchY?: number;
}
export interface Npc extends PlacedObject {
  id: string;
  sprite: string;
  name: string;
  speech: string[];
}
export interface Room {
  name: string;
  theme: string;
  scene?: string;
  map: number[][];
  spawn: Point;
  flowey: Point;
  dialogue: string[];
  target: number;
  doorLinks?: Record<string, number>;
  npcs?: Npc[];
  trees?: Tree[];
  spikes?: PlacedObject[];
  savePoints?: PlacedObject[];
  jumpPads?: JumpPad[];
  particlePoints?: PlacedObject[];
  glitchPoints?: GlitchPoint[];
  tileColors?: Record<string, string>;
  backgroundColor?: string;
  hideGoldenDoor?: boolean;
  hideHole?: boolean;
  jackLever?: Point;
  coreFroggitAdded?: boolean;
  coreBounceAdded?: boolean;
  hole?: Point;
  goldenDoor?: Point;
  [migration: `${string}Version`]: number | undefined;
}
export interface Project {
  version: number;
  id: string;
  updatedAt: number;
  rooms: Room[];
  chapter?: number;
}
export interface BuildSave {
  format: 'little-lantern-build';
  version: 1;
  savedAt: number;
  project: Project;
}
