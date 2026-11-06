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

test('the long path follows its elbow, scrolls to the duel lookout, and permits walking all the way back', () => {
  const room = createPostShowRoom(0);
  for (const fps of [30, 60, 144]) {
    const p = createKnightPath();
    advanceKnightPath(p, room, new Set(['right']), 2);
    assert.ok(p.x < 111, 'the black void blocks a shortcut across the elbow');
    for (let i = 0; i < fps * 2; i++) advanceKnightPath(p, room, new Set(['down']), 1 / fps);
    assert.ok(p.y >= 320 && p.y < 400);
    for (let i = 0; i < fps * 26; i++) advanceKnightPath(p, room, new Set(['right']), 1 / fps);
    assert.equal(p.x, knightPathSettings.lookout);
    assert.ok(p.duelAge > 0);
    assert.ok(knightPathCamera(p) > 3000);
    for (let i = 0; i < fps * 26; i++) advanceKnightPath(p, room, new Set(['left']), 1 / fps);
    assert.equal(p.x, 50);
    assert.equal(advanceKnightPath(p, room, new Set(['up']), 3), true);
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
test('the duel alternates attacks, jumps and clashes and repeats without declaring a winner', () => {
  assert.ok(knightDuelPose(2.9).clash > 0.5);
  assert.ok(knightDuelPose(5).kaizoJump > 70);
  assert.notEqual(knightDuelPose(0).roaringX, knightDuelPose(2.5).roaringX);
  assert.equal(knightDuelPose(9).slash, 'both');
  assert.deepEqual(knightDuelPose(2.5), knightDuelPose(14.5));
  assert.equal(statueConversation[0].speaker, 'Flowey');
  assert.ok(statueConversation.some((line) => line.speaker === 'Ralsey' && /Roaring Knight/.test(line.text)));
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
