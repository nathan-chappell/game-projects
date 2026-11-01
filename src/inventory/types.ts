export type PartyName = 'Kris' | 'Flowey' | 'Susie' | 'Ralsey';
export type PartyHP = Record<PartyName, number>;
export type ItemId = 'gCandy' | 'tpElixir' | 'jackCandy';
export interface Inventory {
  items: Record<ItemId, number>;
}
export interface SavedInventory {
  items: Partial<Record<ItemId, number>>;
}
export interface LegacyInventory {
  gCandy: number;
  heldCandy?: PartyHP;
  items?: never;
}
export interface ItemDefinition {
  name: string;
  description: string;
  minHeal?: number;
  maxHeal?: number;
  tpGain?: number;
  grazeTP?: number;
}
export type TreeHarvests = Record<string, number>;
export interface ItemResult {
  itemName: string;
  restored?: number;
  tpGained?: number;
  message?: string;
}
