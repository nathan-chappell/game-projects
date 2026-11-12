import assert from 'node:assert/strict';
import test from 'node:test';
import { createVesselEncounter } from './entrance.ts';
import { beginClearedVesselScene } from './progression.ts';
import { advanceBattleTime, attackEnemy, startNextEnemyAttack } from '../shared/rules.ts';
import { vesselEntryText, vesselTransferFrame, vesselTransferSettings } from './soul-transfer.ts';

test('the soul leaves Kris, reaches the Vessel and is absorbed before the blackout narration', () => {
  const settings = vesselTransferSettings;
  const start = vesselTransferFrame(0),
    grip = vesselTransferFrame(settings.grip),
    pulled = vesselTransferFrame(settings.exit),
    middle = vesselTransferFrame(4);
  assert.equal(start.soulVisible, false);
  assert.equal(grip.soulVisible, false);
  assert.equal(start.krisPose, 1);
  assert.equal(vesselTransferFrame(0.8).krisPose, 2);
  assert.equal(vesselTransferFrame(1.4).krisPose, 3);
  assert.equal(vesselTransferFrame(2).krisPose, 4);
  assert.equal(pulled.krisPose, 5);
  assert.ok(pulled.soulVisible && pulled.soul.x > grip.soul.x + 30);
  assert.equal(vesselTransferFrame(settings.release).krisPose, 6);
  assert.ok(middle.soul.x > pulled.soul.x && middle.soul.x < 455);
  assert.deepEqual(vesselTransferFrame(settings.arrive).soul, { x: 455, y: 215 });
  assert.equal(vesselTransferFrame(settings.absorb).scale, 0);
  assert.equal(vesselTransferFrame(settings.blackout).blackout, 1);
  assert.equal(vesselTransferFrame(settings.textStart - 0.1).text, '');
  const slowText = vesselTransferFrame(settings.textStart + 1).text;
  assert.ok(slowText.length >= 10 && slowText.length <= 14);
  assert.equal(vesselTransferFrame(60).text, vesselEntryText);
  assert.deepEqual(vesselTransferFrame(settings.arrive, true).soul, { x: 455, y: 215 });
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
  advanceBattleTime(b, 60, hp);
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
