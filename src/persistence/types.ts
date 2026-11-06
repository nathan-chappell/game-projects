import type { Story } from '../game/types.ts';
import type { LegacyInventory, PartyHP, SavedInventory, TreeHarvests } from '../inventory/types.ts';
import type { Point, Project } from '../world/types.ts';
export interface ProgressSave {
  version: 1;
  savedAt: number;
  project: Project;
  roomIndex: number;
  savePoint?: Point;
  player: Point & { facing: string };
  story: Pick<
    Story,
    'met' | 'joined' | 'explained' | 'foundFountain' | 'fountainWorse' | 'teamJoined' | 'dived'
  > &
    Partial<Story>;
  partyHP?: PartyHP;
  hp?: number;
  inventory?: SavedInventory | LegacyInventory;
  treeHarvests?: TreeHarvests;
  glitchWaiting?: Record<'Ralsey' | 'Susie', Point> | null;
  knightPathX?: number;
  hallwayX?: number;
  trafficCheckpoint?: string;
}
