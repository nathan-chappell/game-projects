import { createKnightBattleIntro } from '../../battle/knights/introduction.ts';
import {
  knightImpactTimes,
  knightSequencePhase,
  knightSequenceSeconds,
  knightEncounterActive,
  knightSword,
  swordIntersection,
} from './knight-choreography.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostShowRoom } from './post-show.ts';
import {
  advanceKnightPath,
  createKnightPath,
  knightDuelPose,
  knightPathCamera,
  knightPathSettings,
  statueConversation,
} from './knight-path.ts';
import { validProgress } from '../../persistence/progress.ts';
import { createGameState } from '../../game/state.ts';
import { defaults } from '../castle/starter.ts';
import { upgradeProject } from '../../world/upgrades.ts';

test('the path locks into its finite encounter and allows returning before reaching it', () => {
  const room = createPostShowRoom(0);
  for (const fps of [30, 60, 144]) {
    const p = createKnightPath();
    advanceKnightPath(p, room, new Set(['right']), 2);
    assert.ok(p.x < 111, 'the black void blocks a shortcut across the elbow');
    for (let i = 0; i < fps * 2; i++) advanceKnightPath(p, room, new Set(['down']), 1 / fps);
    assert.ok(p.y >= 320 && p.y < 400);
    for (let i = 0; i < fps * 26; i++) advanceKnightPath(p, room, new Set(['right']), 1 / fps);
    assert.ok(p.x >= knightPathSettings.duelAt && p.x < knightPathSettings.duelAt + 5);
    const encounterX = p.x;
    assert.ok(p.duelAge > 0);
    assert.ok(knightPathCamera(p) > 2800);
    for (let i = 0; i < fps * 26; i++) advanceKnightPath(p, room, new Set(['left']), 1 / fps);
    assert.equal(p.x, encounterX);
    assert.equal(p.duelAge, knightSequenceSeconds);
    const returning = createKnightPath(2500, 360);
    advanceKnightPath(returning, room, new Set(['left']), 22);
    assert.equal(returning.x, 50);
    assert.equal(advanceKnightPath(returning, room, new Set(['up']), 3), true);
  }
});
test('sprinting speeds up the path and invalid time does not change state', () => {
  const room = createPostShowRoom(0),
    walk = createKnightPath(1000, 360),
    sprint = createKnightPath(1000, 360);
  advanceKnightPath(walk, room, new Set(['right']), 1);
  advanceKnightPath(sprint, room, new Set(['right', 'sprint']), 1);
  assert.ok(sprint.x > walk.x);
  const before = { ...walk };
  for (const dt of [NaN, Infinity, -1, 0]) advanceKnightPath(walk, room, new Set(['right']), dt);
  assert.deepEqual(walk, before);
});
test('the finite sequence charges, blocks both Swoons and stops at the three-team handoff', () => {
  const steps = [
    [0, 'faceoff'],
    [1.8, 'chargePose'],
    [2.8, 'charge'],
    [3.1, 'chargeBlocked'],
    [6, 'roaringSwoon'],
    [6.3, 'kaizoBlocksSwoon'],
    [8.4, 'kaizoSwoon'],
    [8.7, 'roaringBlocksSwoon'],
    [10.5, 'transition'],
    [11, 'threeTeams'],
  ] as const;
  for (const [time, phase] of steps) assert.equal(knightSequencePhase(time), phase);
  assert.ok(knightDuelPose(3).roaringX > knightDuelPose(1.8).roaringX);
  assert.deepEqual(knightDuelPose(100), knightDuelPose(11));
  assert.equal(statueConversation[0].speaker, 'Flowey');
});
test('saved path distances and statue dialogue remain optional and validate before loading', () => {
  const project = upgradeProject(defaults()),
    state = createGameState(project);
  const slot = {
    version: 1,
    savedAt: 1,
    project,
    roomIndex: 0,
    player: { x: 60, y: 180, facing: 'right' },
    story: state.story,
  };
  assert.equal(validProgress(slot), true);
  assert.equal(validProgress({ ...slot, knightPathX: 3000 }), true);
  for (const x of [-1, Infinity, '100', 4000])
    assert.equal(validProgress({ ...slot, knightPathX: x }), false);
  assert.equal(validProgress({ ...slot, story: { ...state.story, knightStatuesExplained: 'yes' } }), false);
});

test('the charge meets Kaizo’s blade, and Swoon impacts occur at the guarded defender', () => {
  const charged = knightDuelPose(3.1);
  assert.equal(charged.chargePose, true);
  assert.ok(swordIntersection(knightSword(charged.roaring), knightSword(charged.kaizo)));
  assert.deepEqual(knightImpactTimes, [3.05, 6.15, 8.55]);
  assert.equal(knightDuelPose(6.3).kaizo.swordAngle, Math.PI);
  assert.equal(knightDuelPose(8.7).roaring.swordAngle, Math.PI);
});
test('the battle introduction has three distinct teams and does not invent HP or turn rules', () => {
  const state = createGameState(upgradeProject(defaults()));
  assert.equal(knightEncounterActive(state), false);
  state.knightBattle = createKnightBattleIntro();
  assert.equal(knightEncounterActive(state), true);
  assert.equal(state.knightBattle.teams.length, 3);
  assert.deepEqual(
    state.knightBattle.teams.map((team) => team.id),
    ['party', 'roaring', 'kaizo'],
  );
  assert.deepEqual(state.knightBattle.teams[0].members, ['Kris', 'Flowey', 'Susie', 'Ralsey']);
  assert.equal('hp' in state.knightBattle, false);
  assert.equal('turn' in state.knightBattle, false);
});
