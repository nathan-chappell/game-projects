import { itemDefinitions } from './config.js';

export const treeSupplies = tree => [['gCandy', tree.candy ?? 2], ['tpElixir', tree.tpElixirs ?? 0]];
export const treeHarvestKey = (roomIndex, tree, itemId = 'gCandy') =>
  `${roomIndex}:${tree.x},${tree.y}${itemId === 'gCandy' ? '' : ':' + itemId}`;

export function nextTreeItem(tree, roomIndex, harvests) {
  return treeSupplies(tree).find(([id, count]) => (harvests[treeHarvestKey(roomIndex, tree, id)] || 0) < count)?.[0] ?? null;
}

export function harvestTree(tree, roomIndex, harvests, inventory) {
  const id = nextTreeItem(tree, roomIndex, harvests);
  if (!id) return null;
  const key = treeHarvestKey(roomIndex, tree, id);
  harvests[key] = (harvests[key] || 0) + 1;
  inventory.items[id] = (inventory.items[id] || 0) + 1;
  return { id, name: itemDefinitions[id].name };
}

export function validTreeHarvests(harvests) {
  return harvests === undefined || !!(harvests && typeof harvests === 'object' && !Array.isArray(harvests) &&
    Object.keys(harvests).length <= 7680 && Object.entries(harvests).every(([key,count]) =>
      /^\d{1,2}:\d{1,2},\d{1,2}(?::tpElixir)?$/.test(key) && Number.isInteger(count) && count >= 0 && count <= 6));
}
