import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { advanceSnowAttack, listenInDark } from '../shared/rules.ts';
import { battleArena } from '../shared/settings.ts';
import { attackState } from '../shared/test-state.ts';
import type { Encounter } from '../shared/types.ts';
import { createDarkEncounter } from './dark-battle.ts';
import { advanceMiniSwords, createMiniSwords, miniSwordHazards, miniSwordSettings } from './mini-swords.ts';
const turns = (b: Encounter) => {
  for (let i = 0; i < 4; i++) listenInDark(b);
};
test('mini swords guard every edge after warmup and support nearby grazing', () => {
  const a = createMiniSwords(battleArena);
  assert.equal(a.edges.length, 44);
  assert.equal(new Set(a.edges.map((e) => e.side)).size, 4);
  assert.deepEqual(miniSwordHazards(a, { x: 220, y: 163 }, 24, 21), []);
  advanceMiniSwords(a, 0.8);
  for (const soul of [
    { x: 220, y: 163 },
    { x: 420, y: 163 },
    { x: 320, y: 64 },
    { x: 320, y: 264 },
  ])
    assert.ok(miniSwordHazards(a, soul, 24, 21).some((h) => h.hit));
  assert.deepEqual(miniSwordHazards(a, { x: 320, y: 163 }, 24, 21), [{ hit: false, near: false }]);
  assert.deepEqual(miniSwordHazards(a, { x: 245, y: 163 }, 24, 21), [{ hit: false, near: true }]);
});
test('nine mini swords warn and launch together, leaving one two-slot gap per volley', () => {
  let seed = 5;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const a = createMiniSwords(battleArena, true, random);
  advanceMiniSwords(a, 0.8);
  assert.equal(a.shots.length, 9);
  assert.ok(a.shots.every((s) => !s.active));
  assert.equal(a.edges.filter((e) => e.warningUntil > a.age).length, 9);
  advanceMiniSwords(a, miniSwordSettings.warning - 0.01);
  assert.ok(a.shots.every((s) => !s.active));
  advanceMiniSwords(a, 0.02);
  assert.ok(a.shots.every((s) => s.active));
  for (let i = 0; i < 1400; i++) advanceMiniSwords(a, 0.01);
  assert.equal(a.volleys, 5);
  assert.equal(a.nextId, 45);
  assert.equal(a.shots.length, 0);
});
test('first attack keeps the big waves; the next launches minis; the third uses warning swords; the sequence then repeats', () => {
  const b = createDarkEncounter(),
    hp = freshPartyHP();
  b.invincible = true;
  for (const pattern of [0, 1, 2, 0]) {
    turns(b);
    assert.equal(attackState(b).darkPattern, pattern);
    assert.equal(attackState(b).miniSwords!.launching, pattern !== 0);
    advanceSnowAttack(b, hp, 14);
    assert.equal(b.phase, 'kris');
  }
});
test('edge contact deals damage once per cooldown, while an outside near-miss gives one TP', () => {
  const b = createDarkEncounter(),
    hp = freshPartyHP();
  turns(b);
  b.soul!.x = 245;
  advanceSnowAttack(b, hp, 0.81, () => 0);
  assert.equal(hp.Kris, 100);
  assert.equal(b.tp, 1);
  b.soul!.x = 220;
  advanceSnowAttack(b, hp, 0.01, () => 0);
  assert.equal(hp.Kris, 85);
  advanceSnowAttack(b, hp, 0.05, () => 0);
  assert.equal(hp.Kris, 85);
});
test('the launching attack has damage-free routes across random layouts and frame rates', () => {
  for (const fps of [30, 60, 144])
    for (let seed = 1; seed <= 12; seed++) {
      let state = seed;
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
      const b = createDarkEncounter(),
        hp = freshPartyHP();
      b.darkAttackCount = 1;
      turns(b);
      attackState(b).miniSwords!.random = random;
      let count = 0,
        target = { x: 320, y: 163 };
      for (let frame = 0; frame < 14 * fps && b.phase === 'enemy'; frame++) {
        const a = attackState(b).miniSwords;
        if (a!.volleys !== count) {
          count = a!.volleys;
          const shots = a!.shots.slice(-9),
            horizontal = !!shots[0].dx;
          const positions = shots.map((s) => (horizontal ? s.originY : s.originX)).sort((a, b) => a - b);
          let gap = 0,
            center = 0;
          for (let i = 1; i < positions.length; i++)
            if (positions[i] - positions[i - 1] > gap) {
              gap = positions[i] - positions[i - 1];
              center = (positions[i] + positions[i - 1]) / 2;
            }
          assert.equal(gap, 57);
          target = horizontal ? { x: 320, y: center } : { x: center, y: 163 };
        }
        const dx = target.x - b.soul!.x,
          dy = target.y - b.soul!.y,
          d = Math.hypot(dx, dy),
          move = Math.min(d, 150 / fps);
        if (d) {
          b.soul!.x += (dx / d) * move;
          b.soul!.y += (dy / d) * move;
        }
        advanceSnowAttack(b, hp, 1 / fps, () => 0);
      }
      assert.equal(b.phase, 'kris');
      assert.deepEqual(hp, freshPartyHP(), `seed ${seed}, ${fps} FPS`);
    }
});
