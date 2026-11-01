import assert from 'node:assert/strict';
import test from 'node:test';
import { present } from '../../game/invariants.ts';
import { clone } from '../../world/clone.ts';
import { upgradeProject } from '../../world/upgrades.ts';
import { validBuild, validProject } from '../../world/validation.ts';
import { defaults } from '../castle/starter.ts';
import { createScoreboard, createStudioRoom } from './glitch-studio.ts';

test('the studio is linked in both directions and has a reachable entrance and save point without combat objects', () => {
  const project = upgradeProject(defaults()),
    bossIndex = project.rooms.findIndex((r) => r.scene === 'glitchBoss'),
    studioIndex = project.rooms.findIndex((r) => r.scene === 'glitchStudio'),
    studio = project.rooms[studioIndex],
    boss = project.rooms[bossIndex];
  assert.equal(boss.doorLinks!['15,8'], studioIndex);
  assert.equal(boss.map[8][15], 6);
  assert.equal(studio.doorLinks!['0,8'], bossIndex);
  assert.equal(studio.map[8][0], 6);
  assert.deepEqual(studio.npcs, []);
  assert.deepEqual(studio.spikes, []);
  assert.deepEqual(studio.dialogue, []);
  const seen = new Set(),
    queue = [studio.spawn];
  while (queue.length) {
    const { x, y } = present(queue.shift()),
      key = `${x},${y}`;
    if (seen.has(key) || ![0, 6].includes(studio.map[y]?.[x])) continue;
    seen.add(key);
    queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  assert.ok(seen.has('0,8'));
  assert.ok(seen.has('13,9'));
  assert.equal(validProject(project), true);
  assert.equal(
    validBuild({ format: 'little-lantern-build', version: 1, savedAt: 123, project: clone(project) }),
    true,
  );
});

test('room upgrades preserve custom studio layouts and do not reset manually edited exit links', () => {
  const project = upgradeProject(defaults()),
    studio = project.rooms.find((r) => r.scene === 'glitchStudio'),
    boss = project.rooms.find((r) => r.scene === 'glitchBoss');
  studio!.name = 'My glitched room';
  studio!.map[10][10] = 1;
  studio!.tileColors = { '4,8': '#123456' };
  boss!.map[8][15] = 0;
  delete boss!.doorLinks!['15,8'];
  const before = clone(project);
  upgradeProject(project);
  assert.deepEqual(project, before);
  assert.equal(createStudioRoom(4).doorLinks!['0,8'], 4);
});

test('scoreboard values remain within 1–999, refresh on a timer, and slow down with reduced motion', () => {
  for (const random of [() => 0, () => 0.999999, Math.random]) {
    const read = createScoreboard(random);
    for (let time = 0; time < 100; time += 0.31)
      for (const value of read(time)) assert.ok(Number.isInteger(value) && value >= 1 && value <= 999);
  }
  let calls = 0;
  const read = createScoreboard(() => {
    calls++;
    return (calls % 10) / 10;
  });
  const first = read(0);
  assert.equal(calls, 1);
  assert.strictEqual(read(0.29), first);
  assert.equal(calls, 1);
  read(0.3);
  assert.equal(calls, 2);
  const slow = createScoreboard(() => {
    calls++;
    return 0.5;
  });
  slow(0, true);
  const count = calls;
  slow(1.49, true);
  assert.equal(calls, count);
  slow(1.5, true);
  assert.equal(calls, count + 1);
});
