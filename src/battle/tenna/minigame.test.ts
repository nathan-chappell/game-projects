import assert from 'node:assert/strict';
import test from 'node:test';
import { freshPartyHP } from '../../game/config.ts';
import { createTennaEncounter } from '../../rooms/backstage/tenna-finale.ts';
import { createDarkEncounter } from '../dark/dark-battle.ts';
import { advanceBattleTime, requestTennaMinigame, finishTennaMinigame, defend } from '../shared/rules.ts';
import {
  advanceShootingMinigame,
  beginTennaMinigame,
  createShootingMinigame,
  galleryWindows,
  minigamePoints,
  shootGallery,
  visibleGalleryTargets,
  moveGalleryAim,
} from './minigame.ts';
function start() {
  const b = createTennaEncounter();
  requestTennaMinigame(b);
  beginTennaMinigame(b, () => 0.37);
  return b;
}
test('Minigame is a free Kris-only Tenna ACT with a protected introduction', () => {
  const b = createTennaEncounter();
  assert.equal(b.tp, 0);
  assert.equal(beginTennaMinigame(b), false);
  assert.equal(requestTennaMinigame(b), true);
  assert.equal(b.phase, 'minigameIntro');
  assert.equal(
    beginTennaMinigame(b, () => 0),
    true,
  );
  assert.equal(b.phase, 'minigame');
  assert.equal(b.tp, 0);
  const other = createTennaEncounter();
  defend(other);
  assert.equal(requestTennaMinigame(other), false);
  assert.equal(requestTennaMinigame(createDarkEncounter()), false);
});
test('unshot enemies and shooting Flowey each add exactly one X; hit enemies do not', () => {
  const m = createShootingMinigame(() => 0.37);
  advanceShootingMinigame(m, 1);
  const first = visibleGalleryTargets(m)[0];
  assert.equal(first.kind, 'enemy');
  assert.equal(shootGallery(m, galleryWindows[first.slot].x, galleryWindows[first.slot].y), true);
  assert.equal(m.misses, 0);
  assert.equal(m.hits, 1);
  advanceShootingMinigame(m, 1.2);
  assert.equal(m.misses, 0);
  advanceShootingMinigame(m, 1);
  assert.equal(m.misses, 1);
  const flowey = visibleGalleryTargets(m).find((t) => t.kind === 'flowey')!;
  assert.ok(flowey);
  const p = galleryWindows[flowey.slot];
  shootGallery(m, p.x, p.y);
  assert.equal(m.misses, 2);
  shootGallery(m, p.x, p.y);
  assert.equal(m.misses, 2);
  advanceShootingMinigame(m, 0.1);
  assert.equal(m.misses, 2);
});
test('perfect shooting awards 100, mistakes reduce it by ten, and scoring never becomes negative', () => {
  for (let x = 0; x <= 12; x++) assert.equal(minigamePoints(x), Math.max(0, 100 - x * 10));
  const b = start(),
    m = b.minigame!,
    hp = freshPartyHP();
  for (const target of m.targets) {
    advanceShootingMinigame(m, target.spawn + 0.2 - m.age);
    if (target.kind === 'enemy') {
      const p = galleryWindows[target.slot];
      shootGallery(m, p.x, p.y);
    }
  }
  assert.equal(m.misses, 0);
  advanceBattleTime(b, 2, hp);
  assert.equal(b.score, 100);
  assert.equal(b.turn, 'Flowey');
  assert.equal(b.minigame, null);
  assert.deepEqual(hp, freshPartyHP());
});
test('each X damages two distinct living teammates only after the round and never selects a downed teammate', () => {
  const b = start(),
    hp = freshPartyHP();
  hp.Flowey = 0;
  hp.Susie = 10;
  b.minigame!.misses = 2;
  assert.equal(hp.Kris, 100);
  assert.equal(hp.Susie, 10);
  finishTennaMinigame(b, hp, () => 0);
  assert.deepEqual(hp, { Kris: 80, Flowey: 0, Susie: 0, Ralsey: 90 });
  assert.equal(b.score, 80);
  assert.equal(b.partyStatus.Susie.mode, 'down');
  assert.equal(b.turn, 'Ralsey');
  assert.equal(finishTennaMinigame(b, hp), false);
  assert.equal(b.score, 80);
});
test('a lone survivor is hit once per X, HP never becomes negative, and invincibility protects the party', () => {
  const b = start(),
    hp = { Kris: 5, Flowey: 0, Susie: 0, Ralsey: 0 };
  b.minigame!.misses = 2;
  finishTennaMinigame(b, hp, () => 0);
  assert.equal(hp.Kris, 0);
  const inv = start(),
    team = freshPartyHP();
  inv.invincible = true;
  inv.minigame!.misses = 5;
  finishTennaMinigame(inv, team);
  assert.deepEqual(team, freshPartyHP());
  assert.equal(inv.score, 50);
});
test('points accumulate beyond 1500 without ending the fight; Xs reset for each minigame', () => {
  const b = start(),
    hp = freshPartyHP();
  b.score = 1490;
  b.minigame!.misses = 1;
  finishTennaMinigame(b, hp, () => 0);
  assert.equal(b.score, 1580);
  assert.equal(b.phase, 'flowey');
  assert.equal(b.enemy.hp, 4000);
  assert.equal(b.minigame, null);
  b.turn = 'Kris';
  b.phase = 'kris';
  assert.equal(requestTennaMinigame(b), true);
  beginTennaMinigame(b, () => 0);
  assert.equal(b.minigame!.misses, 0);
  assert.equal(b.score, 1580);
});
test('keyboard aiming moves around all nine windows', () => {
  const m = createShootingMinigame();
  moveGalleryAim(m, 'ArrowUp');
  assert.equal(m.aim, 1);
  moveGalleryAim(m, 'ArrowLeft');
  assert.equal(m.aim, 0);
  moveGalleryAim(m, 'ArrowLeft');
  assert.equal(m.aim, 2);
  assert.deepEqual(m.cursor, galleryWindows[2]);
});

test('the first minigame waits for Tenna’s speech and later uses start immediately; a fresh fight resets it', () => {
  const b = createTennaEncounter(),
    hp = freshPartyHP();
  requestTennaMinigame(b);
  assert.equal(b.phase, 'minigameIntro');
  assert.equal(b.minigame, undefined);
  assert.equal(b.minigameIntroSeen, undefined);
  beginTennaMinigame(b, () => 0);
  assert.equal(b.minigameIntroSeen, true);
  finishTennaMinigame(b, hp, () => 0);
  b.turn = 'Kris';
  b.phase = 'kris';
  requestTennaMinigame(b);
  assert.equal(b.phase, 'minigame');
  assert.equal(b.minigame!.misses, 0);
  assert.equal(b.score, 100);
  const fresh = createTennaEncounter();
  requestTennaMinigame(fresh);
  assert.equal(fresh.phase, 'minigameIntro');
});
