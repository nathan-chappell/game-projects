import assert from 'node:assert/strict';
import test from 'node:test';
import { createTennaEncounter } from '../../rooms/backstage/tenna-finale.ts';
import { createEncounter, advanceBattleTime } from '../shared/rules.ts';
import { addTennaTestingPoints, queueTennaScoreEvent } from './score-events.ts';
import {
  beginTennaEnding,
  completeTennaOutburst,
  completeTennaShutdown,
  tennaCollapseSeconds,
} from './ending.ts';
import { tennaAftermathConversation } from '../../rooms/backstage/tenna-aftermath.ts';

test('1500 is the exact one-time ending threshold; lower scores and other bosses do not end', () => {
  const b = createTennaEncounter();
  b.undyneJoined = b.undyneLeft = true;
  b.score = 1499;
  assert.equal(queueTennaScoreEvent(b), false);
  addTennaTestingPoints(b, 1);
  assert.equal(b.phase, 'tennaFinaleOutburst');
  assert.equal(b.tennaEndingStarted, true);
  assert.equal(addTennaTestingPoints(b, 500), false);
  assert.equal(beginTennaEnding(b), false);
  const noelle = createEncounter();
  noelle.score = 1500;
  assert.equal(queueTennaScoreEvent(noelle), false);
});
test('the outburst precedes a timed glitch; Tenna disappears before his shutdown line', () => {
  for (const fps of [30, 60, 144]) {
    const b = createTennaEncounter();
    addTennaTestingPoints(b, 2000);
    assert.equal(b.phase, 'tennaFinaleOutburst');
    assert.equal(b.enemy.visible, true);
    assert.equal(completeTennaShutdown(b), false);
    completeTennaOutburst(b);
    for (let frame = 0; frame < fps; frame++) advanceBattleTime(b, 1 / fps);
    assert.equal(b.phase, 'tennaFinaleGlitch');
    assert.equal(b.enemy.visible, true);
    for (let frame = 0; frame < Math.ceil(tennaCollapseSeconds * fps); frame++) advanceBattleTime(b, 1 / fps);
    assert.equal(b.phase, 'tennaFinaleShutdown');
    assert.equal(b.enemy.visible, false);
    assert.equal(completeTennaShutdown(b), true);
    assert.equal(b.phase, 'tennaFinaleReturn');
  }
});
test('the finale waits for a live minigame or enemy attack and clears guest effects', () => {
  const b = createTennaEncounter();
  b.phase = 'minigame';
  addTennaTestingPoints(b, 1500);
  assert.equal(b.phase, 'minigame');
  b.phase = 'enemy';
  assert.equal(queueTennaScoreEvent(b), false);
  b.phase = 'kris';
  b.turn = 'Kris';
  b.undyneMenuSpear = { target: 'act', age: 0 };
  queueTennaScoreEvent(b);
  assert.equal(b.phase, 'tennaFinaleOutburst');
  assert.equal(b.undyneMenuSpear, null);
  assert.equal(b.snowAttack, null);
  assert.equal(b.soul, null);
});
test('Ralsey calls her a mysterious knight before Flowey identifies and explains Undyne', () => {
  const ralsey = tennaAftermathConversation.findIndex(
    (line) => line.speaker === 'Ralsey' && /mysterious knight/i.test(line.text),
  );
  const flowey = tennaAftermathConversation.findIndex(
    (line) => line.speaker === 'Flowey' && /That was Undyne/.test(line.text),
  );
  assert.ok(ralsey >= 0 && flowey > ralsey);
  assert.ok(
    tennaAftermathConversation.some((line) => line.speaker === 'Flowey' && /determination/.test(line.text)),
  );
});
