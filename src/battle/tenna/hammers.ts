export const hammerSettings = { duration: 15, speed: 330, hammerSpeed: 700, interval: 0.48 };
export const hammerLanes = [162, 260, 358];
export interface HammerMinigame {
  kind: 'hammers';
  age: number;
  misses: number;
  points: number;
  aimKeys: string[];
  cooldown: number;
  cursor: { x: number; y: number };
  tvs: { x: number; lane: number; flowey: boolean; resolved: boolean; spawn: number }[];
  hammers: { x: number; y: number; vx: number; vy: number; age: number }[];
  feedback: string;
  feedbackAge: number;
}
export function createHammerMinigame(random: () => number = Math.random): HammerMinigame {
  const tvs: HammerMinigame['tvs'] = [];
  let spawn = 0.8;
  while (spawn < hammerSettings.duration - 2) {
    const previous = tvs.at(-1);
    let lane = Math.min(2, Math.floor(random() * 3));
    if (previous?.flowey && lane === previous.lane) lane = (lane + 1) % 3;
    const flowey = tvs.length % 4 === 2;
    tvs.push({ x: 665, lane, flowey, resolved: false, spawn });
    // Give Flowey a clear wake so the next target is never hidden behind him.
    spawn += flowey ? 1.05 : hammerSettings.interval;
  }
  return {
    kind: 'hammers',
    age: 0,
    misses: 0,
    points: 0,
    aimKeys: [],
    cooldown: 0,
    tvs,
    cursor: { x: 400, y: 260 },
    hammers: [],
    feedback: 'Aim at Tenna TVs. Do not hit Flowey!',
    feedbackAge: 2,
  };
}
export function setHammerAimKey(m: HammerMinigame, key: string, held: boolean) {
  key = key.toLowerCase() === 'a' ? 'ArrowLeft' : key.toLowerCase() === 'd' ? 'ArrowRight' : key;
  m.aimKeys = m.aimKeys.filter((k) => k !== key);
  if (held && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) m.aimKeys.push(key);
}
export function throwHammer(m: HammerMinigame, y?: number, x = m.cursor.x) {
  if (m.age >= hammerSettings.duration || m.cooldown > 0) return false;
  if (y !== undefined) m.cursor = { x, y };
  const startY = 260,
    dx = m.cursor.x - 126,
    dy = m.cursor.y - startY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  m.hammers.push({
    x: 126,
    y: startY,
    vx: (dx / distance) * hammerSettings.hammerSpeed,
    vy: (dy / distance) * hammerSettings.hammerSpeed,
    age: 0,
  });
  m.cooldown = 0.22;
  return true;
}
export function hammerTVScale(x: number) {
  return 0.65 + Math.max(0, Math.min(1, (665 - x) / 565)) * 0.85;
}
export function advanceHammers(m: HammerMinigame, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return m.age >= hammerSettings.duration;
  const elapsed = Math.min(dt, Math.max(0, hammerSettings.duration - m.age));
  const steps = Math.max(1, Math.ceil(elapsed * 120)),
    step = elapsed / steps;
  for (let i = 0; i < steps; i++) {
    const horizontal = Number(m.aimKeys.includes('ArrowRight')) - Number(m.aimKeys.includes('ArrowLeft'));
    const vertical = Number(m.aimKeys.includes('ArrowDown')) - Number(m.aimKeys.includes('ArrowUp'));
    const aimSpeed = 300 / Math.max(1, Math.hypot(horizontal, vertical));
    m.cursor.x = Math.max(30, Math.min(610, m.cursor.x + horizontal * aimSpeed * step));
    m.cursor.y = Math.max(120, Math.min(380, m.cursor.y + vertical * aimSpeed * step));
    const previous = m.age;
    m.age += step;
    m.cooldown = Math.max(0, m.cooldown - step);
    m.feedbackAge = Math.max(0, m.feedbackAge - step);
    for (const h of m.hammers) {
      h.x += h.vx * step;
      h.y += h.vy * step;
      h.age += step;
    }
    for (const tv of m.tvs) {
      if (tv.resolved || m.age < tv.spawn) continue;
      tv.x -= hammerSettings.speed * (m.age - Math.max(previous, tv.spawn));
      const hammer = m.hammers.find(
        (h) =>
          Math.abs(h.y - hammerLanes[tv.lane]) < 26 * hammerTVScale(tv.x) &&
          Math.abs(h.x - tv.x) < 32 * hammerTVScale(tv.x),
      );
      if (hammer) {
        m.hammers.splice(m.hammers.indexOf(hammer), 1);
        tv.resolved = true;
        if (tv.flowey) {
          m.misses++;
          m.feedback = 'Flowey TV! X';
        } else {
          m.points += 5;
          m.feedback = 'Tenna TV! +5';
        }
        m.feedbackAge = 0.7;
      } else if (!tv.flowey && tv.x <= 136) {
        tv.resolved = true;
        m.misses++;
        m.feedback = 'TV hit Susie! X';
        m.feedbackAge = 0.7;
      } else if (tv.x < 55) tv.resolved = true;
    }
    m.hammers = m.hammers.filter((h) => h.x > -30 && h.x < 690 && h.y > -30 && h.y < 510);
  }
  if (m.age + 1e-8 >= hammerSettings.duration) {
    m.age = hammerSettings.duration;
    return true;
  }
  return false;
}
