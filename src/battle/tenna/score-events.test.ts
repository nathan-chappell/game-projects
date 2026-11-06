import { undyneDropOffset } from './undyne-drawing.ts';
import { createShootingMinigame } from './minigame.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createTennaEncounter } from '../../rooms/backstage/tenna-finale.ts';
import {
  createEncounter,
  defend,
  advanceBattleTime,
  advanceSnowAttack,
  moveSoul,
  startKrisTurn,
  finishTennaMinigame,
} from '../shared/rules.ts';
import { freshPartyHP } from '../../game/config.ts';
import {
  addTennaTestingPoints,
  completeTennaScoreEvent,
  queueTennaScoreEvent,
  undyneActive,
} from './score-events.ts';
import {
  advanceUndyneAttack,
  createUndyneAttack,
  spearBlockSide,
  undyneArenaBounds,
  spearDistance,
} from './undyne.ts';
import { battleArena } from '../shared/settings.ts';

test('score keys add points without filling TP or toggling immunity; thresholds queue once and preserve the turn', () => {
  const b = createTennaEncounter();
  b.tp = 14;
  addTennaTestingPoints(b, 200);
  addTennaTestingPoints(b, 200);
  assert.equal(b.score, 400);
  assert.equal(b.phase, 'kris');
  addTennaTestingPoints(b, 200);
  assert.equal(b.phase, 'tennaGuest');
  assert.equal(b.guestEvent, 'enter');
  assert.equal(b.tp, 14);
  assert.equal(b.invincible, false);
  assert.equal(completeTennaScoreEvent(b), true);
  assert.equal(b.phase, 'kris');
  assert.equal(undyneActive(b), true);
  assert.equal(queueTennaScoreEvent(b), false);
  addTennaTestingPoints(b, 200);
  assert.equal(b.guestEvent, 'leave');
  completeTennaScoreEvent(b);
  assert.equal(undyneActive(b), false);
  assert.equal(queueTennaScoreEvent(b), false);
  assert.equal(addTennaTestingPoints(createEncounter(), 500), false);
});
test('score jumps process both milestones once and the head glitch stays after score losses', () => {
  const b = createTennaEncounter();
  addTennaTestingPoints(b, 1500);
  assert.equal(b.tennaHeadGlitch, true);
  assert.equal(b.guestEvent, 'enter');
  completeTennaScoreEvent(b);
  queueTennaScoreEvent(b);
  assert.equal(b.guestEvent, 'leave');
  completeTennaScoreEvent(b);
  assert.equal(queueTennaScoreEvent(b), false);
  assert.equal(b.enemy.hp, 4000);
  b.score = 1190;
  queueTennaScoreEvent(b);
  assert.equal(b.tennaHeadGlitch, true);
});
test('milestone dialogue waits for the end of minigames and enemy attacks', () => {
  const b = createTennaEncounter();
  b.phase = 'minigame';
  addTennaTestingPoints(b, 500);
  assert.equal(b.phase, 'minigame');
  b.phase = 'enemy';
  assert.equal(queueTennaScoreEvent(b), false);
  startKrisTurn(b);
  advanceBattleTime(b, 0, freshPartyHP());
  assert.equal(b.phase, 'tennaGuest');
});
test('Undyne replaces enemy turns between 500 and 749, with normal patterns returning at 750', () => {
  const b = createTennaEncounter();
  addTennaTestingPoints(b, 500);
  completeTennaScoreEvent(b);
  for (let i = 0; i < 4; i++) defend(b);
  assert.equal(b.snowAttack?.direction, 'undyne');
  const center = { ...b.soul! };
  moveSoul(b, new Set(['left']), 0.1);
  assert.deepEqual(b.soul, center);
  if (b.snowAttack?.direction !== 'undyne') throw new Error('Expected Undyne');
  assert.equal(b.snowAttack.undyne.shield, 'left');
  startKrisTurn(b);
  addTennaTestingPoints(b, 250);
  completeTennaScoreEvent(b);
  for (let i = 0; i < 4; i++) defend(b);
  assert.equal(b.phase, 'tennaCue');
});
test('all spear directions can be blocked at 30/60/144 FPS, and wrong shields take 30 damage with defend reduction', () => {
  for (const fps of [30, 60, 144]) {
    const a = createUndyneAttack(battleArena, () => 0.4);
    let hits = 0,
      finished = false;
    for (let frame = 0; frame < 16 * fps && !finished; frame++) {
      const incoming = a.spears.find((s) => !s.resolved);
      a.shield = incoming ? spearBlockSide(incoming) : 'up';
      const result = advanceUndyneAttack(a, 1 / fps);
      hits += result.hits;
      finished = result.finished;
    }
    assert.equal(hits, 0);
    assert.equal(a.blocked, 20);
    assert.equal(finished, true);
  }
  for (const [defending, invincible, expected] of [
    [false, false, 70],
    [true, false, 85],
    [false, true, 100],
  ] as const) {
    const b = createTennaEncounter(),
      hp = freshPartyHP();
    addTennaTestingPoints(b, 500);
    completeTennaScoreEvent(b);
    for (let i = 0; i < 4; i++) defend(b);
    b.projectileDamageMultiplier = defending ? 0.5 : 1;
    b.invincible = invincible;
    if (b.snowAttack?.direction !== 'undyne') throw new Error('Expected Undyne');
    b.snowAttack.undyne.spears = [{ side: 'down', launch: 0, yellow: false, resolved: false }];
    advanceSnowAttack(b, hp, 1, () => 0);
    assert.equal(hp.Kris, expected);
    assert.equal(b.phase, 'kris');
  }
});

test('exact score boundaries and earned minigame points trigger the same one-time events', () => {
  const b = createTennaEncounter();
  b.score = 499;
  assert.equal(queueTennaScoreEvent(b), false);
  b.score = 500;
  assert.equal(queueTennaScoreEvent(b), true);
  completeTennaScoreEvent(b);
  b.score = 749;
  assert.equal(undyneActive(b), true);
  assert.equal(queueTennaScoreEvent(b), false);
  b.score = 750;
  queueTennaScoreEvent(b);
  completeTennaScoreEvent(b);
  assert.equal(undyneActive(b), false);
  b.score = 1199;
  queueTennaScoreEvent(b);
  assert.equal(b.tennaHeadGlitch, undefined);
  b.score = 1200;
  queueTennaScoreEvent(b);
  assert.equal(b.tennaHeadGlitch, true);
  const earned = createTennaEncounter();
  earned.score = 495;
  earned.phase = 'minigame';
  earned.minigame = createShootingMinigame();
  finishTennaMinigame(earned, freshPartyHP());
  assert.equal(earned.score, 595);
  assert.equal(earned.phase, 'tennaGuest');
  completeTennaScoreEvent(earned);
  assert.equal(earned.phase, 'flowey');
  assert.equal(earned.turn, 'Flowey');
  assert.equal(createTennaEncounter().undyneJoined, undefined);
  assert.equal(createTennaEncounter().tennaHeadGlitch, undefined);
});

test('testing score gains work during Tenna dialogue and attack introductions without replacing their phase', () => {
  for (const phase of ['tennaOpening', 'tennaCue', 'tennaGuest', 'tennaCut', 'minigameIntro']) {
    const b = createTennaEncounter();
    b.phase = phase;
    assert.equal(addTennaTestingPoints(b, 500), true);
    assert.equal(b.score, 500);
    assert.equal(b.phase, phase);
    assert.equal(b.tp, 0);
    assert.equal(b.invincible, false);
  }
  const finished = createTennaEncounter();
  finished.phase = 'victory';
  assert.equal(addTennaTestingPoints(finished, 500), false);
  assert.equal(finished.score, 0);
});

test('the arena expands beyond the screen and yellow spears require the opposite shield', () => {
  const a = createUndyneAttack(battleArena, () => 0.4);
  assert.equal(undyneArenaBounds(a).size, battleArena.size);
  a.age = 1;
  const expanded = undyneArenaBounds(a);
  assert.ok(expanded.x < 0 && expanded.y < 0);
  assert.ok(expanded.x + expanded.size > 640 && expanded.y + expanded.size > 480);
  assert.equal(a.spears.filter((s) => s.yellow).length, 5);
  assert.equal(spearDistance(a, 0), -100);
  for (const shield of ['up', 'down']) {
    const yellow = createUndyneAttack(battleArena);
    yellow.spears = [{ side: 'up', yellow: true, launch: 0, resolved: false }];
    yellow.shield = shield;
    const result = advanceUndyneAttack(yellow, 0.75);
    assert.equal(result.blocked, shield === 'down' ? 1 : 0);
    assert.equal(result.hits, shield === 'up' ? 1 : 0);
  }
});

test('Undyne drops from above the frame, lands, and settles without changing the active turn', () => {
  const b = createTennaEncounter();
  addTennaTestingPoints(b, 500);
  completeTennaScoreEvent(b);
  assert.equal(b.undyneEntranceAge, 0);
  assert.ok(undyneDropOffset(0) > 400);
  assert.ok(undyneDropOffset(0.4) > 0);
  advanceBattleTime(b, 1.2, freshPartyHP());
  assert.equal(b.undyneEntranceAge, 1.2);
  assert.equal(undyneDropOffset(1.2), 0);
  assert.equal(b.phase, 'kris');
});
