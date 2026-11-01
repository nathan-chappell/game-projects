import test from 'node:test';
import assert from 'node:assert/strict';
import { pelletsDuration } from '../src/battle-pellets.js';
import {
  createEncounter, startKrisTurn, attackEnemy, defend, friendlynessPellets,
  advanceSnowAttack, advanceBattleTime, moveSoul, soulArena, isSoulInSnow,
  toggleRepeatAttack, toggleInvincibility, requestSpecialAttack, battleSettings,
} from '../src/battle-rules.js';
import {
  snowgraveSettings as settings, snowgraveArena, snowgraveOffsets,
  snowgraveCycle, snowgraveDuration, snowgraveFrame,
} from '../src/battle-snowgrave.js';
import { freshPartyHP } from '../src/config.js';

function finalTurn(defending = false) {
  const battle = createEncounter();
  startKrisTurn(battle);
  if (defending) defend(battle);
  battle.enemy.hp = 40;
  attackEnemy(battle);
  return battle;
}

test('a lethal attack from Kris or Flowey immediately starts the final attack at 1 HP', () => {
  for (const actor of ['Kris','Flowey']) {
    for (const hp of [1,40,actor === 'Kris' ? 75 : 80]) {
      const battle = createEncounter();
      startKrisTurn(battle);
      if (actor === 'Flowey') defend(battle);
      battle.enemy.hp = hp;
      const count = battle.enemyAttackCount;
      attackEnemy(battle);
      assert.equal(battle.enemy.hp, 1);
      assert.equal(battle.enemy.visible, true);
      assert.equal(battle.hitDamage, hp - 1);
      assert.equal(battle.hitActor, actor);
      assert.equal(battle.phase, 'enemy');
      assert.equal(battle.snowAttack.direction, 'snowgrave');
      assert.equal(battle.snowAttack.buffed, false);
      assert.equal(battle.finalAttackUsed, true);
      assert.equal(battle.finalAttackPending, false);
      assert.equal(battle.goalAttackUsed, false);
      assert.equal(battle.enemyAttackCount, count);
      assert.equal(attackEnemy(battle), false);
      assert.equal(defend(battle), false);
      assert.equal(battle.enemy.hp, 1);
    }
  }
  assert.equal(createEncounter().finalAttackUsed, false);
});

test('lethal Friendlyness Pellets still heals and spends TP before starting Snowgrave', () => {
  const battle = createEncounter(), hp = freshPartyHP();
  startKrisTurn(battle); defend(battle);
  battle.enemy.hp = 100; battle.tp = 90; hp.Flowey = 20;
  assert.equal(friendlynessPellets(battle, hp), true);
  assert.equal(battle.phase,'pellets');
  advanceBattleTime(battle,pelletsDuration);
  assert.equal(battle.enemy.hp, 1);
  assert.equal(battle.hitDamage, 99);
  assert.equal(battle.tp, 0);
  assert.equal(hp.Flowey, 55);
  assert.equal(battle.snowAttack.direction, 'snowgrave');
});

test('the final spell overrides queued specials and repeats and cannot be replaced or replayed', () => {
  const battle = createEncounter();
  startKrisTurn(battle);
  toggleRepeatAttack(battle); toggleInvincibility(battle); requestSpecialAttack(battle);
  toggleRepeatAttack(battle);
  battle.strongerAttacks = true;
  battle.enemy.hp = 40;
  attackEnemy(battle);
  assert.equal(battle.snowAttack.direction, 'snowgrave');
  assert.equal(battle.repeatAttack, false);
  assert.equal(battle.specialAttackQueued, false);
  assert.equal(battle.invincible, true);
  assert.equal(toggleRepeatAttack(battle), false);
  assert.equal(requestSpecialAttack(battle), false);
  assert.equal(battle.snowAttack.direction, 'snowgrave');
  startKrisTurn(battle); // The existing Shift skip uses this entry point.
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.finalAttackComplete, true);
  assert.equal(battle.enemy.hp, 1);
  advanceBattleTime(battle, 1);
  assert.equal(battle.phase, 'kris');
  assert.match(battle.message, /Snowgrave ends/);
  assert.equal(battle.enemy.hp, 1);
  assert.equal(battle.enemy.visible, true);
  assert.equal(startKrisTurn(battle), false);
});

test('the narrow gap fits the full soul and each change leaves time to react and move', () => {
  const battle = finalTurn();
  assert.equal(soulArena(battle), snowgraveArena);
  assert.equal(isSoulInSnow(battle), false);
  assert.ok(settings.gapWidth >= battleSettings.soulWidth + 20);
  let previous = 0;
  for (let index = 0; index < snowgraveOffsets.length; index++) {
    const frame = snowgraveFrame({ age:settings.intro + index * snowgraveCycle + 0.1 });
    assert.equal(frame.stage, 'warning');
    assert.equal(frame.gap.right - frame.gap.left, settings.gapWidth);
    assert.ok(frame.gap.left >= snowgraveArena.x + snowgraveArena.border);
    assert.ok(frame.gap.right <= snowgraveArena.x + snowgraveArena.width - snowgraveArena.border);
    assert.ok(Math.abs(snowgraveOffsets[index] - previous) <= battleSettings.soulSpeed * (settings.warning - 0.12));
    previous = snowgraveOffsets[index];
  }
});

test('gathering and warnings do not damage the party, and ice only hits after it rises to the soul', () => {
  const battle = finalTurn(), hp = freshPartyHP();
  battle.soul.x = snowgraveArena.x + 16;
  advanceSnowAttack(battle, hp, settings.intro + settings.warning - 0.01, () => 0);
  assert.deepEqual(hp, freshPartyHP());
  battle.snowAttack.snowgrave.age = settings.intro + settings.warning + 0.001;
  advanceSnowAttack(battle, hp, 0.001, () => 0);
  assert.deepEqual(hp, freshPartyHP());
  advanceSnowAttack(battle, hp, 0.035, () => 0);
  assert.equal(hp.Kris, 75);
});

test('Snowgrave damage respects Defend, hit immunity and invincibility without adding phase-two snow damage', () => {
  for (const defending of [false,true]) {
    const battle = finalTurn(defending), hp = freshPartyHP();
    battle.strongerAttacks = true;
    battle.soul.x = snowgraveArena.x + 16;
    battle.snowAttack.snowgrave.age = settings.intro + settings.warning + 0.06;
    advanceSnowAttack(battle, hp, 0.01, () => 0);
    assert.equal(hp.Kris, defending ? 87 : 75);
    advanceSnowAttack(battle, hp, 0.05, () => 0);
    assert.equal(hp.Kris, defending ? 87 : 75);
    toggleInvincibility(battle);
    battle.snowAttack.snowgrave.age = settings.intro + settings.warning + 0.06;
    advanceSnowAttack(battle, hp, 0.01, () => 0);
    assert.equal(hp.Kris, defending ? 87 : 75);
    assert.equal(battle.enemy.hp, 1);
  }
});

test('the final spell can defeat the last living teammate without damaging fallen teammates', () => {
  const battle = finalTurn(), hp = freshPartyHP();
  hp.Kris = 0; hp.Flowey = 10;
  battle.soul.x = snowgraveArena.x + 16;
  battle.snowAttack.snowgrave.age = settings.intro + settings.warning + 0.06;
  advanceSnowAttack(battle, hp, 0.01, () => 0);
  assert.equal(hp.Kris, 0);
  assert.equal(hp.Flowey, 0);
  assert.equal(hp.Susie, 100);
  assert.equal(battle.finalAttackComplete, false);
});

test('all twenty fast bursts can be dodged without damage at human-scale input intervals', () => {
  for (const dt of [1/60, 1/60 + 1e-14]) {
    const battle = finalTurn(), hp = freshPartyHP();
    let frames = 0;
    while (battle.phase === 'enemy' && frames < (snowgraveDuration + 1) * 60) {
      const frame = snowgraveFrame(battle.snowAttack.snowgrave),
        target = (frame.gap.left + frame.gap.right) / 2,
        dx = target - battle.soul.x,
        keys = new Set(Math.abs(dx) > 7.5 ? [dx > 0 ? 'right' : 'left'] : []);
      // Change direction at most ten times per second, rather than every frame.
      for (let tick = 0; tick < 6; tick++, frames++) {
        moveSoul(battle, keys, dt);
        advanceSnowAttack(battle, hp, dt, () => 0);
      }
      assert.deepEqual(hp, freshPartyHP());
      assert.equal(battle.enemy.hp, 1);
    }
    assert.equal(battle.invincible, false);
    assert.equal(battle.defending, false);
    assert.equal(battle.phase, 'kris');
    assert.equal(battle.finalAttackComplete, true);
    assert.equal(battle.turn, 'Kris');
    assert.equal(battle.soul, null);
    assert.equal(battle.snowAttack, null);
    advanceBattleTime(battle, 1);
    assert.equal(battle.phase, 'kris');
    assert.equal(battle.enemy.hp, 1);
    assert.equal(battle.enemy.visible, true);
  }
});

test('Snowgrave leaves an attack-only Kris turn and does not restart an enemy pattern', () => {
  const battle = finalTurn(), hp = freshPartyHP();
  battle.goalAttackUsed = true;
  battle.strongerAttacks = true;
  battle.strongerAttackCount = 3;
  battle.snowAttack.snowgrave.age = snowgraveDuration - 0.01;
  advanceSnowAttack(battle, hp, 0.02);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.finalAttackComplete, true);
  assert.equal(battle.projectileDamageMultiplier, 1);
  attackEnemy(battle);
  assert.equal(battle.phase, 'rescue');
  assert.equal(battle.enemy.hp, 0);
  assert.equal(battle.hitDamage, 1);
  battle.tp = 90; hp.Flowey = 40;
  assert.equal(friendlynessPellets(battle, hp), false);
  assert.equal(hp.Flowey, 40);
  assert.equal(battle.tp, 90);
  assert.equal(battle.enemy.visible, true);
  assert.equal(battle.finalAttackPending, false);
  assert.equal(battle.phase, 'rescue');
  assert.equal(battle.snowAttack, null);
  assert.equal(startKrisTurn(battle), false);
});

test('Snowgrave healing revives a fallen Kris so the final party action remains his turn', () => {
  const battle = finalTurn(), hp = freshPartyHP();
  hp.Kris = 0;
  battle.snowAttack.snowgrave.age = snowgraveDuration - 0.01;
  advanceSnowAttack(battle, hp, 0.02);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.turn, 'Kris');
  assert.equal(hp.Kris, 50);
  assert.equal(battle.enemy.hp, 1);
  assert.equal(defend(battle), false);
  assert.equal(battle.enemy.visible, true);
});
