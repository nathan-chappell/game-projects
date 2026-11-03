export const hammerSettings = { duration: 15, speed: 205, hammerSpeed: 540, interval: 0.65 };
export const hammerLanes = [162, 260, 358];
export interface HammerMinigame {
  kind: 'hammers';
  age: number;
  misses: number;
  points: number;
  lane: number;
  cooldown: number;
  tvs: { x: number; lane: number; flowey: boolean; resolved: boolean; spawn: number }[];
  hammers: { x: number; lane: number; age: number }[];
  feedback: string;
  feedbackAge: number;
}
export function createHammerMinigame(random: () => number = Math.random): HammerMinigame {
  return {
    kind: 'hammers',
    age: 0,
    misses: 0,
    points: 0,
    lane: 1,
    cooldown: 0,
    tvs: Array.from({ length: 18 }, (_, i) => ({
      x: 665,
      lane: Math.min(2, Math.floor(random() * 3)),
      flowey: i % 4 === 2,
      resolved: false,
      spawn: 0.8 + i * hammerSettings.interval,
    })),
    hammers: [],
    feedback: 'Hit Tenna TVs! Dodge Flowey TVs!',
    feedbackAge: 2,
  };
}
export function moveHammerLane(m: HammerMinigame, key: string) {
  m.lane = Math.max(0, Math.min(2, m.lane + (key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0)));
}
export function throwHammer(m: HammerMinigame, y?: number) {
  if (m.age >= hammerSettings.duration || m.cooldown > 0) return false;
  if (y !== undefined)
    m.lane = hammerLanes.reduce(
      (best, lane, i) => (Math.abs(lane - y) < Math.abs(hammerLanes[best] - y) ? i : best),
      0,
    );
  m.hammers.push({ x: 126, lane: m.lane, age: 0 });
  m.cooldown = 0.28;
  return true;
}
export function advanceHammers(m: HammerMinigame, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return m.age >= hammerSettings.duration;
  const elapsed = Math.min(dt, Math.max(0, hammerSettings.duration - m.age));
  const steps = Math.max(1, Math.ceil(elapsed * 120)),
    step = elapsed / steps;
  for (let i = 0; i < steps; i++) {
    const previous = m.age;
    m.age += step;
    m.cooldown = Math.max(0, m.cooldown - step);
    m.feedbackAge = Math.max(0, m.feedbackAge - step);
    for (const h of m.hammers) {
      h.x += hammerSettings.hammerSpeed * step;
      h.age += step;
    }
    for (const tv of m.tvs) {
      if (tv.resolved || m.age < tv.spawn) continue;
      tv.x -= hammerSettings.speed * (m.age - Math.max(previous, tv.spawn));
      const hammer = m.hammers.find((h) => h.lane === tv.lane && Math.abs(h.x - tv.x) < 36);
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
      } else if (Math.abs(tv.x - 100) < 29 && tv.lane === m.lane) {
        tv.resolved = true;
        m.misses++;
        m.feedback = 'TV hit Susie! X';
        m.feedbackAge = 0.7;
      } else if (tv.x < 55) tv.resolved = true;
    }
    m.hammers = m.hammers.filter((h) => h.x < 690);
  }
  if (m.age + 1e-8 >= hammerSettings.duration) {
    m.age = hammerSettings.duration;
    return true;
  }
  return false;
}
