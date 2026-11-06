import type { UndyneAttack } from '../tenna/undyne.ts';
import type { TennaMinigame } from '../tenna/minigame.ts';
import type { TvBolts } from '../tenna/tv-bolts.ts';
import type { PartyName } from '../../inventory/types.ts';
import type { Point } from '../../world/types.ts';
import type { createCrossingAttack } from '../noelle/crossing.ts';
import type { createGoalAttack } from '../noelle/goal.ts';
import type { createOrbitAttack } from '../noelle/orbit.ts';
import type { createSnowgraveAttack } from '../noelle/snowgrave.ts';
export type Random = () => number;
export interface Arena extends Point {
  size: number;
  border: number;
}
export interface RectArena extends Point {
  width: number;
  height: number;
  border: number;
}
export interface Soul extends Point {}
export interface Sword extends Point {
  id: number;
  launch: number;
  active: boolean;
}
export interface SwordAttack {
  arena: Arena;
  motion: number;
  age: number;
  waves: number;
  swords: Sword[];
  nextId: number;
}
export interface MiniEdge extends Point {
  id: number;
  dx: number;
  dy: number;
  side: number;
  warningUntil: number;
}
export interface MiniShot extends MiniEdge {
  originX: number;
  originY: number;
  launch: number;
  active: boolean;
}
export interface MiniSettings {
  depth: number;
  warmup: number;
  warning: number;
  interval: number;
  volleys: number;
  perVolley: number;
  speed: number;
}
export interface MiniAttack {
  arena: Arena;
  launching: boolean;
  age: number;
  settings: MiniSettings;
  volleys: number;
  edges: MiniEdge[];
  shots: MiniShot[];
  random: Random;
  nextId: number;
  selectEdges?: (attack: MiniAttack) => MiniEdge[];
}
export interface WarningColumn {
  x: number;
  index: number;
  born: number;
}
export interface WarningAttack {
  arena: Arena;
  age: number;
  event: number;
  warning: WarningColumn | null;
  active: WarningColumn | null;
  lastX: number | null;
  random: Random;
  soul: Soul;
  minis: MiniAttack;
}
export interface Note extends Point {
  direction: number;
  helper: number;
  lane: number;
  launch: number;
}
export interface SaxAttack {
  arena: Arena;
  age: number;
  waves: number;
  notes: Note[];
}
export interface Snowball extends Point {
  vx?: number;
  vy?: number;
  delay?: number;
  hit?: boolean;
  radius?: number;
  velocity?: number;
}
export type AttackDirection =
  | 'down'
  | 'right'
  | 'path'
  | 'orbit'
  | 'crossing'
  | 'goal'
  | 'snowgrave'
  | 'dark'
  | 'saxophones'
  | 'tvBolts'
  | 'undyne';
export interface AttackBase {
  direction: AttackDirection;
  grazeTP: number;
  buffed: boolean;
  pathAge: number;
  height: number;
  balls: Snowball[];
  impacts: (Point & { age: number })[];
  waves: number;
  nextWaveIn: number;
  hitCooldown: number;
  contactAge: number;
  contactCooldown: number;
  inSnow: boolean;
  contactFlash: number;
  endingAge: number | null;
  grazeActive: boolean;
  grazeCooldown: number;
  orbit?: ReturnType<typeof createOrbitAttack>;
  crossing?: ReturnType<typeof createCrossingAttack>;
  goal?: ReturnType<typeof createGoalAttack>;
  snowgrave?: ReturnType<typeof createSnowgraveAttack>;
  swords?: SwordAttack;
  miniSwords?: MiniAttack;
  warningSwords?: WarningAttack;
  darkPattern?: number;
  saxophones?: SaxAttack;
  tvBolts?: TvBolts;
  undyne?: UndyneAttack;
}
export type Attack = AttackBase &
  (
    | { direction: 'down' | 'right' | 'path' }
    | { direction: 'orbit'; orbit: NonNullable<AttackBase['orbit']> }
    | { direction: 'crossing'; crossing: NonNullable<AttackBase['crossing']> }
    | { direction: 'goal'; goal: NonNullable<AttackBase['goal']> }
    | { direction: 'snowgrave'; snowgrave: NonNullable<AttackBase['snowgrave']> }
    | { direction: 'dark'; swords: SwordAttack; miniSwords: MiniAttack; darkPattern: number }
    | { direction: 'saxophones'; saxophones: SaxAttack }
    | { direction: 'tvBolts'; tvBolts: TvBolts }
    | { direction: 'undyne'; undyne: UndyneAttack }
  );
export type BattleAction = 'attack' | 'act' | 'item' | 'defend' | 'spare';
export interface Rescue {
  stage: string;
  age: number;
  line: number;
  ralseyAttempts: number;
  textShown?: number;
}
export interface PartyStatus {
  mode: string;
  age: number;
}
export interface EncounterBase {
  phase: string;
  turn: string | null;
  screen: string;
  selectedAction: BattleAction;
  tp: number;
  tpGainAge: number | null;
  tpGainAmount: number;
  tpGainSource: string | null;
  nextAttackGrazeTP: number | null;
  enemy: { name: string; hp: number; maxHP: number; visible: boolean };
  proceedCount: number;
  defending: boolean;
  projectileDamageMultiplier: number;
  animationAge: number;
  hitAge: number | null;
  hitActor: string | null;
  hitDamage: number;
  pelletsCast: {
    age: number;
    impacted?: boolean;
    damage?: number;
    restored?: number;
    impactDone?: boolean;
  } | null;
  partyStatus: Record<PartyName, PartyStatus>;
  soul: Soul | null;
  snowAttack: Attack | null;
  enemyAttackCount: number;
  lastEnemyAttack: AttackDirection | null;
  goalAttackUsed: boolean;
  specialAttackQueued: boolean;
  strongerAttacks: boolean;
  strongerAttackCount: number;
  finalAttackPending: boolean;
  finalAttackUsed: boolean;
  finalAttackComplete: boolean;
  snowgravePartyHealed: boolean;
  rescue: Rescue | null;
  noelleEscaped: boolean;
  repeatAttack: boolean;
  invincible: boolean;
  fastKill: boolean;
  message: string;
  darkHeal?: { target: string; restored: number; age: number } | null;
  shineCount?: number;
  darkUnlocked?: boolean;
  darkAttackCount?: number;
  lastDarkPattern?: number;
  minigameIntroSeen?: boolean;
  minigameCount?: number;
  minigame?: TennaMinigame | null;
  score?: number;
  tennaCueSeen?: boolean;
  tennaHeadGlitch?: boolean;
  undyneJoined?: boolean;
  undyneEntranceAge?: number;
  undyneLeft?: boolean;
  guestEvent?: 'enter' | 'leave' | null;
  guestResumePhase?: string;
  darkShinePending?: boolean;
}
export type Encounter = EncounterBase & ({ kind?: 'noelle' } | { kind: 'dark' } | { kind: 'tenna' });
