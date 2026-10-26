// Battle rules are separate from drawing and buttons so they can be checked without a browser.
import { itemDefinitions, maxHP } from './config.js';

export const battleSettings = {
  enemyHP: 1000,
  krisAttackDamage: 75,
  maxTP: 100,
  proceedCost: 100,
  proceedsToDisappear: 3,
  proceedFlashSeconds: 1.2,
  disappearSeconds: 0.6,
  defendDamageMultiplier: 0.5,
};

export const krisActions = ['attack', 'act', 'item', 'defend'];

export function createEncounter(cleared = false) {
  return {
    phase: cleared ? 'victory' : 'intro',
    turn: cleared ? null : 'Kris',
    screen: 'menu',
    selectedAction: 'attack',
    tp: 0,
    enemy: { name: '???', hp: battleSettings.enemyHP, maxHP: battleSettings.enemyHP, visible: !cleared },
    proceedCount: cleared ? battleSettings.proceedsToDisappear : 0,
    defending: false,
    projectileDamageMultiplier: 1,
    animationAge: 0,
    hitAge: null,
    message: cleared ? '??? disappeared.' : 'Kris’s turn. Choose an action.',
  };
}

export function canKrisAct(encounter) {
  return encounter?.phase === 'kris' && encounter.turn === 'Kris';
}

// The next turn can call this after Flowey and Noelle have acted. It does not grant free TP.
export function startKrisTurn(encounter) {
  if (!encounter || !['intro', 'flowey'].includes(encounter.phase)) return false;
  encounter.phase = 'kris';
  encounter.turn = 'Kris';
  encounter.screen = 'menu';
  encounter.selectedAction = 'attack';
  encounter.defending = false;
  encounter.projectileDamageMultiplier = 1;
  encounter.message = 'Kris’s turn. Choose an action.';
  return true;
}

export function finishKrisTurn(encounter, message) {
  if (!canKrisAct(encounter)) return false;
  encounter.phase = 'flowey';
  encounter.turn = 'Flowey';
  encounter.screen = 'menu';
  encounter.message = message;
  return true;
}

export function attackEnemy(encounter) {
  if (!canKrisAct(encounter)) return false;
  const damage = Math.min(battleSettings.krisAttackDamage, encounter.enemy.hp);
  encounter.enemy.hp -= damage;
  encounter.hitAge = 0;
  finishKrisTurn(encounter, `Kris dealt ${damage} damage to ???.`);
  return true;
}

export function defend(encounter) {
  if (!canKrisAct(encounter)) return false;
  encounter.defending = true;
  encounter.projectileDamageMultiplier = battleSettings.defendDamageMultiplier;
  finishKrisTurn(encounter, 'Kris defended. Noelle’s next projectiles will be weaker.');
  return true;
}

// Future projectile patterns should use this instead of subtracting their full damage directly.
export function projectileDamage(encounter, baseDamage) {
  return Math.max(0, Math.round(baseDamage * (encounter?.projectileDamageMultiplier ?? 1)));
}

// TP gains will be connected when the remaining turn rules are defined.
export function addTP(encounter, amount) {
  if (!encounter || !Number.isFinite(amount) || amount < 0) return;
  encounter.tp = Math.min(battleSettings.maxTP, encounter.tp + amount);
}

export function proceed(encounter) {
  if (!canKrisAct(encounter) || encounter.tp < battleSettings.proceedCost) return false;
  encounter.tp -= battleSettings.proceedCost;
  encounter.proceedCount++;
  encounter.phase = 'proceedFlash';
  encounter.screen = 'menu';
  encounter.animationAge = 0;
  encounter.message = `Proceed ${encounter.proceedCount} / ${battleSettings.proceedsToDisappear}`;
  return true;
}

export function advanceBattleTime(encounter, dt) {
  if (!encounter || !Number.isFinite(dt) || dt < 0) return false;
  if (encounter.hitAge !== null) {
    encounter.hitAge += dt;
    if (encounter.hitAge >= 0.5) encounter.hitAge = null;
  }
  if (encounter.phase === 'proceedFlash') {
    encounter.animationAge += dt;
    if (encounter.animationAge >= battleSettings.proceedFlashSeconds) {
      encounter.animationAge = 0;
      if (encounter.proceedCount >= battleSettings.proceedsToDisappear) {
        encounter.phase = 'vanishing';
        encounter.turn = null;
      } else {
        encounter.phase = 'flowey';
        encounter.turn = 'Flowey';
      }
      return true;
    }
  } else if (encounter.phase === 'vanishing') {
    encounter.animationAge += dt;
    if (encounter.animationAge >= battleSettings.disappearSeconds) {
      encounter.enemy.visible = false;
      encounter.phase = 'victory';
      encounter.message = '??? disappeared.';
      return true;
    }
  }
  return false;
}

// Both the ordinary inventory and the battle inventory use the same healing recipe.
export function useHealingItem(partyHP, inventory, itemId, target, random = Math.random) {
  const item = itemDefinitions[itemId],
    hp = partyHP[target];
  if (!item || !(inventory.items[itemId] > 0) || !Number.isFinite(hp) || hp >= maxHP) return null;
  const rolledHealing = item.minHeal + Math.floor(random() * (item.maxHeal - item.minHeal + 1));
  const restored = Math.min(rolledHealing, maxHP - hp);
  partyHP[target] += restored;
  inventory.items[itemId]--;
  return { restored, itemName: item.name };
}
