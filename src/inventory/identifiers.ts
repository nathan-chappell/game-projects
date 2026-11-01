import { itemDefinitions, partyNames } from '../game/config.ts';
import type { ItemId, PartyName } from './types.ts';
export const itemIds: ItemId[] = ['jackCandy', 'gCandy', 'tpElixir'];
export const isItemId = (value: string): value is ItemId => Object.hasOwn(itemDefinitions, value);
export const isPartyName = (value: string): value is PartyName => partyNames.some((name) => name === value);
