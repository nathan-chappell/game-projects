import assert from 'node:assert/strict';
import test from 'node:test';
import { createVesselEncounter } from './entrance.ts';
import { beginClearedVesselScene } from './progression.ts';
import { advanceBattleTime, attackEnemy, startNextEnemyAttack } from '../shared/rules.ts';
import { vesselEntryText, vesselTransferFrame } from './soul-transfer.ts';

test('the soul leaves Kris, reaches the Vessel and is absorbed before the blackout narration', () => {
  const start = vesselTransferFrame(0),
    lifted = vesselTransferFrame(0.8),
    middle = vesselTransferFrame(1.8);
  assert.deepEqual(start.soul, { x: 185, y: 203 });
  assert.ok(lifted.soul.y < start.soul.y);
  assert.ok(middle.soul.x > 185 && middle.soul.x < 455);
  assert.deepEqual(vesselTransferFrame(2.8).soul, { x: 455, y: 215 });
  assert.equal(vesselTransferFrame(3.3).scale, 0);
  assert.equal(vesselTransferFrame(4.1).blackout, 1);
  assert.equal(vesselTransferFrame(4.4).text, '');
  assert.equal(vesselTransferFrame(5).text.length, 16);
  assert.equal(vesselTransferFrame(20).text, vesselEntryText);
  assert.deepEqual(vesselTransferFrame(2.8, true).soul, { x: 455, y: 215 });
  assert.equal(
    vesselEntryText.replaceAll('\n', ' '),
    'You entered the Vessel. Its the thing you where looking for. You nearly destroyed the World, didnt you? Looking for your discarded Vessel... now, you face the concicuences.',
  );
});

test('the transfer starts once, preserves battle resources, blocks actions and holds its final text', () => {
  const b = createVesselEncounter(),
    hp = { Kris: 41, Flowey: 32, Susie: 62, Ralsey: 78 };
  b.vesselClearedAttacks = [1, 2, 3];
  assert.equal(beginClearedVesselScene(b), false);
  b.vesselClearedAttacks.push(4);
  b.tp = 37;
  assert.equal(beginClearedVesselScene(b), true);
  advanceBattleTime(b, 2, hp);
  beginClearedVesselScene(b);
  assert.equal(b.animationAge, 2);
  assert.equal(attackEnemy(b), false);
  advanceBattleTime(b, 20, hp);
  assert.equal(b.phase, 'vesselEntered');
  assert.equal(b.message, vesselEntryText);
  const age = b.animationAge;
  advanceBattleTime(b, 100, hp);
  startNextEnemyAttack(b, '');
  assert.equal(b.animationAge, age);
  assert.equal(b.message, vesselEntryText);
  assert.equal(b.enemy.hp, 10000);
  assert.equal(b.tp, 37);
  assert.deepEqual(hp, { Kris: 41, Flowey: 32, Susie: 62, Ralsey: 78 });
  assert.equal(b.soul, null);
  assert.equal(b.snowAttack, null);
});
