import {
  requestSpecialAttack,
  toggleFastKill,
  toggleInvincibility,
  toggleRepeatAttack,
} from '../../../tests/fixtures/combat-tools.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { crossingHazards, crossingSettings } from '../noelle/crossing.ts';
import { greenGoal } from '../noelle/goal.ts';
import { orbitHazards, orbitSettings } from '../noelle/orbit.ts';
import { pelletsDuration } from '../noelle/pellets.ts';
import {
  advanceBattleTime,
  advanceSnowAttack,
  attackEnemy,
  createEncounter,
  defend,
  friendlynessPellets,
  startKrisTurn,
} from './rules.ts';
import { battleArena, battleSettings, enemyAttacks } from './settings.ts';
import { attackState } from './test-state.ts';
import type { Encounter } from './types.ts';

const partyTurn = (index = 0) => {
  const battle = createEncounter();
  startKrisTurn(battle);
  battle.enemyAttackCount = index;
  return battle;
};
const enemyTurn = (index: number) => {
  const battle = partyTurn(index);
  attackEnemy(battle);
  attackEnemy(battle);
  return battle;
};

test('fast kill deals 1,000 damage for either teammate and toggles back to normal without spending a turn', () => {
  const battle = partyTurn();
  battle.tp = 90;
  const before = structuredClone(battle);
  assert.equal(toggleFastKill(battle), true);
  assert.equal(battle.fastKill, true);
  for (const field of ['phase', 'turn', 'screen', 'tp', 'enemyAttackCount'] as const)
    assert.equal(battle[field], before[field]);
  assert.deepEqual(battle.enemy, before.enemy);
  attackEnemy(battle);
  assert.equal(battle.enemy.hp, 2000);
  assert.equal(battle.hitDamage, 1000);
  attackEnemy(battle);
  assert.equal(battle.enemy.hp, 1000);
  assert.equal(battle.hitDamage, 1000);
  assert.equal(battle.phase, 'enemy');
  assert.equal(battle.fastKill, true);
  startKrisTurn(battle);
  toggleFastKill(battle);
  attackEnemy(battle);
  assert.equal(battle.hitDamage, 75);
  attackEnemy(battle);
  assert.equal(battle.hitDamage, 80);
});

test('fast kill preserves pellets costs and healing, and lethal hits still trigger the 1-HP finale', () => {
  const battle = partyTurn(),
    hp = freshPartyHP();
  toggleFastKill(battle);
  attackEnemy(battle);
  battle.tp = 89;
  hp.Flowey = 40;
  assert.equal(friendlynessPellets(battle, hp), false);
  assert.equal(battle.enemy.hp, 2000);
  battle.tp = 90;
  assert.equal(friendlynessPellets(battle, hp), true);
  advanceBattleTime(battle, pelletsDuration);
  assert.equal(battle.hitDamage, 1000);
  assert.equal(battle.enemy.hp, 1000);
  assert.equal(battle.tp, 0);
  assert.equal(hp.Flowey, 75);
  startKrisTurn(battle);
  attackEnemy(battle);
  assert.equal(battle.enemy.hp, 1);
  assert.equal(battle.hitDamage, 999);
  assert.equal(attackState(battle).direction, 'snowgrave');
});

test('fast kill starts off, toggles during enemy attacks and ignores inactive encounters', () => {
  const battle = enemyTurn(0),
    before = structuredClone(battle);
  assert.equal(toggleFastKill(battle), true);
  assert.equal(battle.fastKill, true);
  assert.deepEqual(battle.snowAttack, before.snowAttack);
  assert.deepEqual(battle.enemy, before.enemy);
  assert.equal(createEncounter().fastKill, false);
  for (const phase of ['intro', 'pellets', 'proceedDialogue', 'proceedGlitch', 'victory'] as const) {
    const inactive = createEncounter();
    inactive.phase = phase;
    assert.equal(toggleFastKill(inactive), false);
    assert.equal(inactive.fastKill, false);
  }
  assert.equal(toggleFastKill(null), false);
});

test('special shortcut queues at either party turn without spending resources and then leads to buffed attacks', (t) => {
  t.mock.method(Math, 'random', () => 0.99);
  for (const floweyTurn of [false, true]) {
    const battle = partyTurn(),
      hp = freshPartyHP();
    if (floweyTurn) attackEnemy(battle);
    battle.goalAttackUsed = true;
    battle.screen = 'act';
    battle.selectedAction = 'act';
    battle.tp = 87;
    toggleRepeatAttack(battle);
    toggleInvincibility(battle);
    const before = structuredClone(battle);
    assert.equal(requestSpecialAttack(battle), true);
    for (const field of [
      'phase',
      'turn',
      'screen',
      'selectedAction',
      'tp',
      'enemyAttackCount',
      'invincible',
    ] as const)
      assert.equal(battle[field], before[field]);
    assert.deepEqual(battle.enemy, before.enemy);
    assert.equal(battle.repeatAttack, false);
    assert.equal(battle.specialAttackQueued, true);
    assert.equal(battle.strongerAttacks, false);
    if (!floweyTurn) {
      attackEnemy(battle);
      assert.equal(battle.phase, 'flowey');
      assert.equal(battle.specialAttackQueued, true);
    }
    attackEnemy(battle);
    assert.equal(attackState(battle).direction, 'goal');
    assert.equal(attackState(battle).buffed, false);
    assert.equal(battle.specialAttackQueued, false);
    assert.equal(battle.enemy.hp, 2845);
    assert.equal(battle.enemyAttackCount, 0);
    battle.soul = { x: greenGoal.x, y: greenGoal.y };
    advanceSnowAttack(battle, hp, 0.01, () => 0);
    advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.01, () => 0);
    assert.equal(battle.strongerAttacks, true);
    defend(battle);
    defend(battle);
    assert.equal(attackState(battle).direction, 'down');
    assert.equal(attackState(battle).buffed, true);
  }
});

test('special shortcut immediately replaces any current pattern and can restart the special', () => {
  for (let index = 0; index < enemyAttacks.length; index++) {
    const battle = enemyTurn(index);
    toggleRepeatAttack(battle);
    toggleInvincibility(battle);
    battle.goalAttackUsed = true;
    battle.strongerAttacks = true;
    attackState(battle).hitCooldown = 0.5;
    const before = structuredClone(battle);
    requestSpecialAttack(battle);
    assert.equal(battle.phase, 'enemy');
    assert.equal(attackState(battle).direction, 'goal');
    assert.equal(attackState(battle).buffed, false);
    assert.equal(attackState(battle).goal!.age, 0);
    assert.equal(attackState(battle).hitCooldown, 0);
    assert.equal(battle.enemyAttackCount, before.enemyAttackCount);
    assert.deepEqual(battle.enemy, before.enemy);
    assert.equal(battle.tp, before.tp);
    assert.equal(battle.invincible, true);
    assert.equal(battle.repeatAttack, false);
    const first = battle.snowAttack;
    first!.goal!.age = 40;
    requestSpecialAttack(battle);
    assert.notEqual(battle.snowAttack, first);
    assert.equal(attackState(battle).goal!.age, 0);
    startKrisTurn(battle);
    assert.equal(battle.strongerAttacks, true);
  }
});

test('special shortcut ignores cutscenes, finished battles and missing encounters', () => {
  for (const phase of [
    'intro',
    'pellets',
    'pellets',
    'proceedDialogue',
    'proceedGlitch',
    'victory',
  ] as const) {
    const battle = createEncounter();
    battle.phase = phase;
    const before = structuredClone(battle);
    assert.equal(requestSpecialAttack(battle), false);
    assert.deepEqual(battle, before);
  }
  assert.equal(requestSpecialAttack(null), false);
  assert.equal(createEncounter().specialAttackQueued, false);
});

test('repeat mode replays each boss attack after both party turns without advancing the sequence', (t) => {
  t.mock.method(Math, 'random', () => 0);
  for (let index = 0; index < enemyAttacks.length; index++) {
    const battle = enemyTurn(index),
      first = battle.snowAttack;
    assert.equal(toggleRepeatAttack(battle), true);
    assert.equal(battle.phase, 'enemy');
    first!.height = 40;
    first!.contactAge = 0.6;
    startKrisTurn(battle);
    assert.equal(battle.lastEnemyAttack, enemyAttacks[index]);
    attackEnemy(battle);
    assert.equal(battle.phase, 'flowey');
    attackEnemy(battle);
    assert.equal(attackState(battle).direction, enemyAttacks[index]);
    assert.notEqual(battle.snowAttack, first);
    assert.equal(attackState(battle).height, 0);
    assert.equal(attackState(battle).contactAge, 0);
    assert.equal(battle.enemyAttackCount, index + 1);
    startKrisTurn(battle);
    attackEnemy(battle);
    attackEnemy(battle);
    assert.equal(attackState(battle).direction, enemyAttacks[index]);
    toggleRepeatAttack(battle);
    startKrisTurn(battle);
    attackEnemy(battle);
    attackEnemy(battle);
    assert.equal(attackState(battle).direction, enemyAttacks[(index + 1) % enemyAttacks.length]);
  }
});

test('Noelle plays all five attacks in order once, then randomly chooses a different attack', (t) => {
  const choices = [0.99, 0.41, 0.01, 0.69, 0.21, 0.99];
  const random = t.mock.method(Math, 'random', () => choices.shift());
  const battle = partyTurn();
  const next = () => {
    defend(battle);
    defend(battle);
    const direction = attackState(battle).direction;
    if (direction === 'orbit') assert.equal(attackState(battle).orbit!.variant, 'normal');
    if (direction === 'crossing') assert.ok(attackState(battle).crossing);
    startKrisTurn(battle);
    return direction;
  };
  assert.deepEqual(Array.from({ length: 5 }, next), enemyAttacks);
  assert.equal(random.mock.callCount(), 0);
  assert.deepEqual(Array.from({ length: 6 }, next), ['orbit', 'right', 'down', 'orbit', 'down', 'crossing']);
  assert.equal(random.mock.callCount(), 6);
  assert.equal(battle.enemyAttackCount, 11);
});

test('random selection excludes only the last attack, which becomes eligible after another attack', (t) => {
  let roll = 0;
  t.mock.method(Math, 'random', () => roll);
  for (const previous of enemyAttacks) {
    const available = enemyAttacks.filter((attack) => attack !== previous);
    for (let index = 0; index < available.length; index++) {
      for (const offset of [0, 0.999999]) {
        const battle = partyTurn(enemyAttacks.length);
        battle.lastEnemyAttack = previous;
        roll = (index + offset) / available.length;
        defend(battle);
        defend(battle);
        assert.equal(attackState(battle).direction, available[index]);
        const nextAvailable = enemyAttacks.filter((attack) => attack !== battle.lastEnemyAttack);
        roll = nextAvailable.indexOf(previous) / nextAvailable.length;
        startKrisTurn(battle);
        defend(battle);
        defend(battle);
        assert.equal(attackState(battle).direction, previous);
      }
    }
  }
});

test('repeat holds a randomly chosen attack and random selection resumes when switched off', (t) => {
  const random = t.mock.method(Math, 'random', () => 0.65);
  const battle = partyTurn(enemyAttacks.length);
  const next = () => {
    defend(battle);
    defend(battle);
  };
  next();
  assert.equal(attackState(battle).direction, 'orbit');
  toggleRepeatAttack(battle);
  random.mock.mockImplementation(() => 0.25);
  for (let round = 0; round < 2; round++) {
    startKrisTurn(battle);
    next();
    assert.equal(attackState(battle).direction, 'orbit');
    assert.equal(battle.enemyAttackCount, 6);
    assert.equal(random.mock.callCount(), 1);
  }
  toggleRepeatAttack(battle);
  startKrisTurn(battle);
  next();
  assert.equal(attackState(battle).direction, 'right');
  assert.equal(battle.enemyAttackCount, 7);
  assert.equal(random.mock.callCount(), 2);
});

test('enabling repeat before the first attack plays the first pattern and then holds it', () => {
  const battle = partyTurn();
  toggleRepeatAttack(battle);
  attackEnemy(battle);
  attackEnemy(battle);
  assert.equal(attackState(battle).direction, 'down');
  assert.equal(battle.enemyAttackCount, 1);
  startKrisTurn(battle);
  attackEnemy(battle);
  attackEnemy(battle);
  assert.equal(attackState(battle).direction, 'down');
  assert.equal(battle.enemyAttackCount, 1);
});

test('testing toggles do not select actions, consume TP, change turns, or change enemy HP', () => {
  const battle = partyTurn();
  battle.screen = 'act';
  battle.selectedAction = 'act';
  battle.tp = 87;
  toggleRepeatAttack(battle);
  toggleInvincibility(battle);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.turn, 'Kris');
  assert.equal(battle.screen, 'act');
  assert.equal(battle.selectedAction, 'act');
  assert.equal(battle.tp, 87);
  assert.equal(battle.enemy.hp, 3000);
  assert.equal(battle.invincible, true);
  assert.equal(battle.repeatAttack, true);
});

test('testing toggles ignore cutscenes and finished encounters and start off for new battles', () => {
  for (const phase of ['intro', 'pellets', 'proceedDialogue', 'proceedGlitch', 'victory'] as const) {
    const battle = createEncounter();
    battle.phase = phase;
    assert.equal(toggleRepeatAttack(battle), false);
    assert.equal(toggleInvincibility(battle), false);
    assert.equal(battle.repeatAttack, false);
    assert.equal(battle.invincible, false);
  }
  assert.equal(toggleInvincibility(null), false);
  assert.equal(toggleRepeatAttack(null), false);
});

const hazards = [
  {
    name: 'falling snowball',
    index: 0,
    place(battle: Encounter) {
      attackState(battle).balls = [{ ...present(battle.soul), velocity: 0, hit: false }];
      attackState(battle).nextWaveIn = 100;
    },
  },
  {
    name: 'sideways snowball',
    index: 1,
    place(battle: Encounter) {
      attackState(battle).balls = [{ ...present(battle.soul), velocity: 0, hit: false }];
      attackState(battle).nextWaveIn = 100;
    },
  },
  {
    name: 'bottom snow',
    index: 0,
    place(battle: Encounter) {
      attackState(battle).height = 60;
      attackState(battle).nextWaveIn = 100;
      battle.soul = { x: 240, y: 245 };
    },
  },
  {
    name: 'right snow',
    index: 1,
    place(battle: Encounter) {
      attackState(battle).height = 60;
      attackState(battle).nextWaveIn = 100;
      battle.soul = { x: 400, y: 90 };
    },
  },
  {
    name: 'path snow',
    index: 2,
    place(battle: Encounter) {
      attackState(battle).pathAge = 4.5;
      battle.soul = { x: 400, y: 163 };
    },
  },
  {
    name: 'ice cube',
    index: 3,
    place(battle: Encounter) {
      const orbit = attackState(battle).orbit;
      present(orbit).age = orbitSettings.warmup;
      present(orbit).box.vx = present(orbit).box.vy = 0;
      battle.soul = { x: orbitHazards(present(orbit)).cube.x, y: orbitHazards(present(orbit)).cube.y };
    },
  },
  {
    name: 'orbiting snowball',
    index: 3,
    place(battle: Encounter) {
      const orbit = attackState(battle).orbit;
      present(orbit).age = orbitSettings.warmup;
      present(orbit).box.vx = present(orbit).box.vy = 0;
      present(orbit).box.x = 300;
      present(orbit).box.y = 100;
      battle.soul = { ...orbitHazards(present(orbit)).balls[0] };
    },
  },
  ...(['large', 'small', 'spinning'] as const).map((size) => ({
    name: `crossing ${size}`,
    index: 4,
    place(battle: Encounter) {
      const crossing = attackState(battle).crossing;
      present(crossing).age = crossingSettings.warmup;
      battle.soul = { ...crossingHazards(present(crossing), battleArena)[size][size === 'large' ? 2 : 0] };
    },
  })),
];

test('invincibility prevents every boss hazard from hurting or reviving party members, then toggles off cleanly', () => {
  for (const hazard of hazards) {
    const battle = enemyTurn(hazard.index),
      hp = freshPartyHP();
    hp.Kris = 37;
    hp.Flowey = 0;
    toggleInvincibility(battle);
    hazard.place(battle);
    advanceSnowAttack(battle, hp, 0.02, () => 0);
    advanceSnowAttack(battle, hp, 0.1, () => 0);
    assert.equal(hp.Kris, 37, hazard.name);
    assert.equal(hp.Flowey, 0, hazard.name);
    assert.equal(hp.Susie, 100, hazard.name);
    hazard.place(battle);
    toggleInvincibility(battle);
    assert.equal(attackState(battle).hitCooldown, 0);
    assert.equal(attackState(battle).contactAge, 0);
    advanceSnowAttack(battle, hp, 0.01, () => 0);
    assert.ok(hp.Kris < 37, hazard.name);
    assert.equal(hp.Flowey, 0, hazard.name);
  }
});

test('repeat and invincibility persist across full enemy and party turns', () => {
  const battle = partyTurn(),
    hp = freshPartyHP();
  toggleRepeatAttack(battle);
  toggleInvincibility(battle);
  attackEnemy(battle);
  attackEnemy(battle);
  battle.soul = { x: 221, y: 63 };
  advanceSnowAttack(battle, hp, 25, () => 0.5);
  assert.equal(battle.phase, 'kris');
  assert.equal(battle.repeatAttack, true);
  assert.equal(battle.invincible, true);
  assert.deepEqual(hp, freshPartyHP());
  attackEnemy(battle);
  attackEnemy(battle);
  assert.equal(attackState(battle).direction, 'down');
  assert.equal(battle.invincible, true);
});
