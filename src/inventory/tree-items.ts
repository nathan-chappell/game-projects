import { itemDefinitions } from '../game/config.ts';
import type { Tree } from '../world/types.ts';
import type { Inventory, ItemId, TreeHarvests } from './types.ts';

export const treeSupplies = (tree: Tree): [ItemId, number][] => [
  ['gCandy', tree.candy ?? 2],
  ['tpElixir', tree.tpElixirs ?? 0],
];
export const treeHarvestKey = (roomIndex: number, tree: Tree, itemId = 'gCandy') =>
  `${roomIndex}:${tree.x},${tree.y}${itemId === 'gCandy' ? '' : ':' + itemId}`;

export function nextTreeItem(tree: Tree, roomIndex: number, harvests: TreeHarvests) {
  return (
    treeSupplies(tree).find(
      ([id, count]) => (harvests[treeHarvestKey(roomIndex, tree, id)] || 0) < count,
    )?.[0] ?? null
  );
}

export function harvestTree(tree: Tree, roomIndex: number, harvests: TreeHarvests, inventory: Inventory) {
  const id = nextTreeItem(tree, roomIndex, harvests);
  if (!id) return null;
  const key = treeHarvestKey(roomIndex, tree, id);
  harvests[key] = (harvests[key] || 0) + 1;
  inventory.items[id] = (inventory.items[id] || 0) + 1;
  return { id, name: itemDefinitions[id].name };
}

export function validTreeHarvests(harvests: unknown): harvests is TreeHarvests | undefined {
  return (
    harvests === undefined ||
    !!(
      harvests &&
      typeof harvests === 'object' &&
      !Array.isArray(harvests) &&
      Object.keys(harvests).length <= 7680 &&
      Object.entries(harvests).every(
        ([key, count]) =>
          /^\d{1,2}:\d{1,2},\d{1,2}(?::tpElixir)?$/.test(key) &&
          typeof count === 'number' &&
          Number.isInteger(count) &&
          count >= 0 &&
          count <= 6,
      )
    )
  );
}
