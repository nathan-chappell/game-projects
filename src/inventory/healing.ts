import { itemDefinitions, maxHP } from '../game/config.ts';
import { isItemId, isPartyName } from './identifiers.ts';
import type { Inventory, ItemDefinition, ItemResult, PartyHP } from './types.ts';

// Both the ordinary inventory and the battle inventory use the same healing recipe.
export function useHealingItem(
  partyHP: PartyHP,
  inventory: Inventory,
  itemId: string,
  target: string,
  random: () => number = Math.random,
): ItemResult | null {
  if (!isItemId(itemId) || !isPartyName(target)) return null;
  const item: ItemDefinition = itemDefinitions[itemId],
    hp = partyHP[target];
  if (
    !item ||
    typeof item.minHeal !== 'number' ||
    typeof item.maxHeal !== 'number' ||
    !Number.isFinite(item.minHeal) ||
    !Number.isFinite(item.maxHeal) ||
    !(inventory.items[itemId] > 0) ||
    !Number.isFinite(hp) ||
    hp >= maxHP
  )
    return null;
  const rolledHealing = item.minHeal + Math.floor(random() * (item.maxHeal - item.minHeal + 1));
  const restored = Math.min(rolledHealing, maxHP - hp);
  partyHP[target] += restored;
  inventory.items[itemId]--;
  return { restored, itemName: item.name };
}
