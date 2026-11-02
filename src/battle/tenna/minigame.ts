import { createSurferMinigame } from './surfers.ts';
import type { SurferMinigame } from './surfers.ts';
import type { PartyHP, PartyName } from '../../inventory/types.ts';
import type { Encounter } from '../shared/types.ts';
export const minigameSettings = {
  targets: 12,
  warmup: 0.8,
  interval: 1.1,
  fireDelay: 0.95,
  lifetime: 1.25,
  duration: 14.4,
};
export const galleryWindows = Array.from({ length: 9 }, (_, slot) => ({
  x: 318 + (slot % 3) * 106,
  y: 112 + Math.floor(slot / 3) * 95,
}));
interface Target {
  slot: number;
  kind: 'enemy' | 'flowey';
  spawn: number;
  fired: boolean;
  shot: boolean;
}
export interface ShootingMinigame {
  kind: 'shooting';
  age: number;
  misses: number;
  hits: number;
  targets: Target[];
  aim: number;
  cursor: { x: number; y: number };
  shotFlash: number;
  feedback: string;
  feedbackAge: number;
}
export type TennaMinigame = ShootingMinigame | SurferMinigame;
export const minigamePoints = (misses: number) => Math.max(0, 100 - 10 * misses);
export function createShootingMinigame(random: () => number = Math.random): ShootingMinigame {
  let previous = -1;
  const targets = Array.from({ length: minigameSettings.targets }, (_, i) => {
    const choice = Math.min(7, Math.floor(random() * 8));
    const slot = choice >= previous && previous >= 0 ? choice + 1 : choice;
    previous = slot;
    return {
      slot,
      kind: i % 4 === 2 ? ('flowey' as const) : ('enemy' as const),
      spawn: minigameSettings.warmup + i * minigameSettings.interval,
      fired: false,
      shot: false,
    };
  });
  return {
    kind: 'shooting',
    age: 0,
    misses: 0,
    hits: 0,
    targets,
    aim: 4,
    cursor: { ...galleryWindows[4] },
    shotFlash: 0,
    feedback: 'Shoot enemies. Do not shoot Flowey!',
    feedbackAge: 2,
  };
}
export function beginTennaMinigame(b: Encounter, random: () => number = Math.random) {
  if (b.kind !== 'tenna' || b.phase !== 'minigameIntro') return false;
  b.minigameIntroSeen = true;
  b.phase = 'minigame';
  const count = b.minigameCount ?? 0;
  b.minigame = count % 2 === 0 ? createShootingMinigame(random) : createSurferMinigame();
  b.minigameCount = count + 1;
  return true;
}
export function visibleGalleryTargets(m: ShootingMinigame) {
  return m.targets.filter((t) => !t.shot && m.age >= t.spawn && m.age < t.spawn + minigameSettings.lifetime);
}
function mistake(m: ShootingMinigame, text: string) {
  m.misses++;
  m.feedback = text;
  m.feedbackAge = 0.65;
}
export function shootGallery(m: ShootingMinigame, x = m.cursor.x, y = m.cursor.y) {
  m.cursor = { x, y };
  m.shotFlash = 0.12;
  const target = visibleGalleryTargets(m).find(
    (t) => Math.abs(x - galleryWindows[t.slot].x) <= 31 && Math.abs(y - galleryWindows[t.slot].y) <= 33,
  );
  if (!target) {
    m.feedback = 'Miss!';
    m.feedbackAge = 0.3;
    return false;
  }
  target.shot = true;
  if (target.kind === 'flowey') mistake(m, 'Do not shoot Flowey!');
  else {
    m.hits++;
    m.feedback = 'Hit!';
    m.feedbackAge = 0.3;
  }
  return true;
}
export function moveGalleryAim(m: ShootingMinigame, key: string) {
  const row = Math.floor(m.aim / 3),
    col = m.aim % 3;
  const nextRow = (row + (key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0) + 3) % 3;
  const nextCol = (col + (key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0) + 3) % 3;
  m.aim = nextRow * 3 + nextCol;
  m.cursor = { ...galleryWindows[m.aim] };
}
export function advanceShootingMinigame(m: ShootingMinigame, dt: number) {
  m.age += dt;
  m.shotFlash = Math.max(0, m.shotFlash - dt);
  m.feedbackAge = Math.max(0, m.feedbackAge - dt);
  for (const t of m.targets)
    if (t.kind === 'enemy' && !t.shot && !t.fired && m.age >= t.spawn + minigameSettings.fireDelay) {
      t.fired = true;
      mistake(m, 'Enemy shot you!');
    }
  return m.age >= minigameSettings.duration;
}
export function settleTennaMinigame(b: Encounter, hp: PartyHP, random: () => number = Math.random) {
  const m = b.minigame;
  if (!m) return null;
  const points = m.kind === 'surf' ? m.points : minigamePoints(m.misses),
    damage: Partial<Record<PartyName, number>> = {};
  if (m.kind === 'shooting' && !b.invincible)
    for (let miss = 0; miss < m.misses; miss++) {
      const living = (['Kris', 'Flowey', 'Susie', 'Ralsey'] as const).filter((name) => hp[name] > 0);
      for (let pick = 0; pick < 2 && living.length; pick++) {
        const index = Math.min(living.length - 1, Math.floor(random() * living.length)),
          name = living.splice(index, 1)[0];
        const lost = Math.min(10, hp[name]);
        hp[name] -= lost;
        damage[name] = (damage[name] ?? 0) + lost;
      }
    }
  b.score = Math.max(0, (b.score ?? 0) + points);
  b.minigame = null;
  return { points, damage };
}
