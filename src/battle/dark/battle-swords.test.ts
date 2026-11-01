import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import { advanceSnowAttack, defend, listenInDark } from '../shared/rules.ts';
import { battleArena } from '../shared/settings.ts';
import { attackState } from '../shared/test-state.ts';
import { createDarkEncounter } from './dark-battle.ts';
import { advanceSwords, createSwordAttack, swordLaneY, swordSettings, swordTouchesSoul } from './swords.ts';
test('direction is random, the warning is safe, and each of eight waves launches five swords together', () => {
  for (const seed of [0, 0.99]) {
    const a = createSwordAttack(battleArena, () => seed);
    assert.equal(a.motion, seed < 0.5 ? -1 : 1);
    advanceSwords(a, 0.7);
    assert.equal(a.swords.length, 0);
    advanceSwords(a, 0.2);
    assert.equal(a.swords.length, 5);
    assert.ok(a.swords.every((s) => s.active));
    for (let i = 0; i < 1200; i++) advanceSwords(a, 0.01);
    assert.equal(a.waves, 8);
    assert.equal(a.nextId, 40);
    assert.equal(a.swords.length, 0);
  }
});
test('the blade and hilt collide, but the empty space around a sword does not', () => {
  const s = { x: 320, y: 160, active: true };
  for (const motion of [-1, 1]) {
    assert.equal(swordTouchesSoul(s, motion, { x: 320 + motion * 10, y: 160 }, 24, 21), true);
    assert.equal(swordTouchesSoul(s, motion, { x: 320 - motion * 18, y: 180 }, 24, 21), true);
    assert.equal(swordTouchesSoul(s, motion, { x: 320, y: 205 }, 24, 21), false);
  }
});
test('a continuous damage-free route exists for both directions at 30, 60 and 144 FPS', () => {
  for (const fps of [30, 60, 144])
    for (const motion of [-1, 1]) {
      const b = createDarkEncounter(),
        hp = freshPartyHP();
      listenInDark(b);
      listenInDark(b);
      listenInDark(b);
      listenInDark(b);
      attackState(b).swords!.motion = motion;
      let age = 0;
      while (b.phase === 'enemy' && age < 13) {
        const wave = Math.min(
          swordSettings.waves - 1,
          Math.max(0, Math.floor((age - swordSettings.warmup - 0.56) / swordSettings.waveInterval) + 1),
        );
        const goal = swordLaneY(
          present(attackState(b).swords),
          [1.5, 2.5, 3.5, 4.5, 2.5, 1.5, 3.5, 2.5][wave],
        );
        b.soul!.y += Math.max(-150 / fps, Math.min(150 / fps, goal - b.soul!.y));
        advanceSnowAttack(b, hp, 1 / fps, () => 0);
        age += 1 / fps;
      }
      assert.equal(b.phase, 'kris');
      assert.deepEqual(hp, freshPartyHP());
    }
});
test('swords deal fifteen damage, Defend halves it, and fallen teammates are skipped', () => {
  for (const defending of [false, true]) {
    const b = createDarkEncounter(),
      hp = freshPartyHP();
    if (defending) {
      defend(b);
      defend(b);
      defend(b);
      defend(b);
    } else {
      listenInDark(b);
      listenInDark(b);
      listenInDark(b);
      listenInDark(b);
    }
    hp.Kris = 0;
    const a = attackState(b).swords;
    a!.motion = -1;
    a!.swords = [{ id: 100, y: b.soul!.y, launch: -167 / swordSettings.speed, active: true, x: 320 }];
    advanceSnowAttack(b, hp, 0.01, () => 0);
    assert.equal(hp.Flowey, 100 - (defending ? 8 : 15));
    assert.equal(hp.Kris, 0);
    advanceSnowAttack(b, hp, 0.05, () => 0);
    assert.equal(hp.Flowey, 100 - (defending ? 8 : 15));
  }
});
test('grazing a real sword grants one TP while direct contact does not', () => {
  for (const gap of [36, 0]) {
    const b = createDarkEncounter(),
      hp = freshPartyHP();
    listenInDark(b);
    listenInDark(b);
    listenInDark(b);
    listenInDark(b);
    attackState(b).swords!.motion = -1;
    attackState(b).swords!.swords = [
      { id: 100, y: b.soul!.y + gap, launch: -167 / swordSettings.speed, active: true, x: 320 },
    ];
    advanceSnowAttack(b, hp, 0.01, () => 0);
    assert.equal(b.tp, gap ? 1 : 0);
    assert.equal(hp.Kris, gap ? 100 : 85);
  }
});
