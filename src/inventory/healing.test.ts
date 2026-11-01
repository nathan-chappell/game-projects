import assert from 'node:assert/strict';
import test from 'node:test';
import { freshInventory, freshPartyHP, itemDefinitions } from '../game/config.ts';
import { useHealingItem } from './healing.ts';

test('invalid healing settings cannot consume an item, change HP, or sample randomness', () => {
  const original = { ...itemDefinitions.gCandy };
  const hp = freshPartyHP(),
    inventory = freshInventory();
  hp.Kris = 50;
  inventory.items.gCandy = 1;
  let rolls = 0;
  try {
    for (const field of ['minHeal', 'maxHeal'] as const) {
      for (const value of [Infinity, -Infinity, NaN]) {
        Object.assign(itemDefinitions.gCandy, original, { [field]: value });
        assert.equal(
          useHealingItem(hp, inventory, 'gCandy', 'Kris', () => {
            rolls++;
            return 0;
          }),
          null,
        );
        assert.equal(hp.Kris, 50);
        assert.equal(inventory.items.gCandy, 1);
      }
    }
    assert.equal(rolls, 0);
  } finally {
    Object.assign(itemDefinitions.gCandy, original);
  }
});
