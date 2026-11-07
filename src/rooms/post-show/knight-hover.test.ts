import assert from 'node:assert/strict';
import test from 'node:test';
import { floatingKnight } from './knight-hover.ts';
import { knightDuelPose } from './knight-choreography.ts';

test('both knights stay lifted through every phase while swords and legs share the actor pose', () => {
  for (let time = 0; time <= 11; time += 1 / 60) {
    const pose = knightDuelPose(time);
    for (const [actor, kaizo] of [
      [pose.roaring, false],
      [pose.kaizo, true],
    ] as const) {
      const before = { ...actor },
        floating = floatingKnight(actor, time, kaizo);
      assert.ok(floating.jump - actor.jump >= 3.6 && floating.jump - actor.jump <= 8.4);
      assert.equal(floating.x, actor.x);
      assert.equal(floating.swordAngle, actor.swordAngle);
      assert.deepEqual(actor, before);
    }
  }
});
test('hovering continues after the battle intro timer stops and reduced motion holds a steady lift', () => {
  const actor = { x: 320, jump: 25, facing: 1, swordAngle: 0.12, lean: 0 };
  for (const kaizo of [false, true]) {
    assert.notEqual(floatingKnight(actor, 12, kaizo).jump, floatingKnight(actor, 13, kaizo).jump);
    assert.deepEqual(floatingKnight(actor, 12, kaizo, true), floatingKnight(actor, 120, kaizo, true));
    assert.equal(floatingKnight(actor, 120, kaizo, true).jump, 31);
  }
});
