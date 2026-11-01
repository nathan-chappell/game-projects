import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { advanceSnowAttack, listenInDark } from '../shared/rules.ts';
import { battleArena, battleSettings } from '../shared/settings.ts';
import { attackState } from '../shared/test-state.ts';
import { createDarkEncounter } from './dark-battle.ts';
import { advanceWarningSwords, createWarningSwords, warningSwordTouches } from './warning-swords.ts';
test('warnings last half a second and each new sword replaces the previous one', () => {
  const a = createWarningSwords(battleArena, () => 0),
    soul = { x: 320, y: 163 };
  advanceWarningSwords(a, 0.49, soul);
  assert.equal(a.warning!.index, 0);
  assert.equal(a.active, null);
  advanceWarningSwords(a, 0.01, soul);
  assert.equal(a.active!.index, 0);
  assert.equal(a.warning, null);
  advanceWarningSwords(a, 0.5, soul);
  assert.equal(a.warning!.index, 1);
  assert.equal(a.active!.index, 0);
  advanceWarningSwords(a, 0.49, soul);
  assert.equal(a.active!.index, 0);
  advanceWarningSwords(a, 0.01, soul);
  assert.equal(a.active!.index, 1);
  assert.equal(a.warning, null);
});
test('three distinct mini swords launch each second from safe edge positions', () => {
  const a = createWarningSwords(battleArena, () => 0.2),
    soul = { x: 320, y: 163 };
  advanceWarningSwords(a, 0.99, soul);
  assert.equal(a.minis.nextId, 3);
  assert.ok(a.minis.shots.every((s) => !s.active));
  advanceWarningSwords(a, 0.01, soul);
  assert.equal(a.minis.shots.filter((s) => s.active).length, 3);
  assert.equal(new Set(a.minis.shots.map((s) => `${s.originX},${s.originY}`)).size, 3);
  assert.ok(a.minis.shots.some((s) => Math.abs(s.originY - soul.y) < 10));
  advanceWarningSwords(a, 0.75, soul);
  assert.equal(a.minis.nextId, 6);
  assert.ok(a.minis.shots.filter((s) => s.launch === 2).every((s) => !s.active));
  advanceWarningSwords(a, 0.25, soul);
  assert.equal(a.minis.shots.filter((s) => s.launch === 2 && s.active).length, 3);
});
test('the third attack has damage-free escape routes across random layouts and frame rates', () => {
  for (const fps of [30, 60, 144])
    for (let seed = 1; seed <= 12; seed++) {
      let state = seed;
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
      const b = createDarkEncounter(),
        hp = freshPartyHP();
      b.darkAttackCount = 2;
      for (let i = 0; i < 4; i++) listenInDark(b);
      attackState(b).warningSwords!.random = random;
      let target = 320,
        targetY = 163,
        warning = -1,
        volley = 0;
      for (let frame = 0; frame < 14 * fps && b.phase === 'enemy'; frame++) {
        const a = attackState(b).warningSwords;
        if (a!.warning && a!.warning.index !== warning) {
          warning = a!.warning.index;
          const choices = [247, 283, 320, 357, 393].filter(
            (x) =>
              Math.abs(x - a!.warning!.x) >= 43 &&
              !warningSwordTouches(present(a), { x, y: b.soul!.y }, 24, 21) &&
              (!a!.active ||
                (Math.abs(x - a!.active.x) >= 43 && (x - a!.active.x) * (b.soul!.x - a!.active.x) >= 0)),
          );
          choices.sort((x, y) => Math.abs(x - b.soul!.x) - Math.abs(y - b.soul!.x));
          assert.ok(choices.length);
          target = choices[0];
        }
        if (a!.minis.volleys !== volley) {
          volley = a!.minis.volleys;
          const shots = a!.minis.shots.slice(-3),
            choices = [];
          for (let y = 82; y <= 244; y++)
            if (
              shots.every((s) => Math.abs(s.originY - y) >= 19) &&
              !warningSwordTouches(present(a), { x: target, y }, 24, 21)
            )
              choices.push(y);
          choices.sort((x, y) => Math.abs(x - b.soul!.y) - Math.abs(y - b.soul!.y));
          assert.ok(choices.length);
          targetY = choices[0];
        }
        const dx = target - b.soul!.x,
          dy = targetY - b.soul!.y,
          d = Math.hypot(dx, dy),
          move = Math.min(d, battleSettings.darkSoulSpeed / fps);
        if (d) {
          b.soul!.x += (dx / d) * move;
          b.soul!.y += (dy / d) * move;
        }
        advanceSnowAttack(b, hp, 1 / fps, () => 0);
      }
      assert.equal(b.phase, 'kris');
      assert.deepEqual(hp, freshPartyHP(), `seed ${seed}, FPS ${fps}`);
    }
});
test('warning boxes are harmless, while the sword deals damage and supports one-percent grazing', () => {
  const b = createDarkEncounter(),
    hp = freshPartyHP();
  b.darkAttackCount = 2;
  for (let i = 0; i < 4; i++) listenInDark(b);
  attackState(b).warningSwords!.random = () => 0;
  advanceSnowAttack(b, hp, 0.48, () => 0);
  const x = attackState(b).warningSwords!.warning!.x;
  b.soul!.x = x;
  advanceSnowAttack(b, hp, 0.01, () => 0);
  assert.equal(hp.Kris, 100);
  assert.equal(b.tp, 0);
  advanceSnowAttack(b, hp, 0.02, () => 0);
  assert.equal(hp.Kris, 85);
  assert.equal(b.tp, 0);
  advanceSnowAttack(b, hp, 0.05, () => 0);
  assert.equal(hp.Kris, 85);
  b.soul!.x = x + 34;
  advanceSnowAttack(b, hp, 0.01, () => 0);
  assert.equal(b.tp, 1);
});
test('stationary spots, including the old middle lane, are targeted by the harder mini volleys', () => {
  for (const x of [247, 283, 320, 357, 393])
    for (const y of [84, 125, 163, 205, 242]) {
      const b = createDarkEncounter(),
        hp = freshPartyHP();
      b.darkAttackCount = 2;
      for (let i = 0; i < 4; i++) listenInDark(b);
      b.soul = { x, y };
      advanceSnowAttack(b, hp, 3.2, () => 0);
      assert.ok(
        Object.values(hp).some((h) => h < 100),
        `stationary ${x},${y} must not be safe`,
      );
    }
});
