export const surferSettings = {
  duration: 15,
  speed: 220,
  playerX: 140,
  waterY: 320,
  gravity: 1000,
  jumpSpeed: 390,
};
interface Rock {
  x: number;
  height: number;
  hit: boolean;
  flowey: boolean;
}
interface Coin {
  x: number;
  y: number;
  purple: boolean;
  collected: boolean;
}
export interface SurferMinigame {
  kind: 'surf';
  age: number;
  misses: number;
  points: number;
  feetY: number;
  velocity: number;
  rocks: Rock[];
  coins: Coin[];
  coinsCollected: number;
  purpleCollected: boolean;
  feedback: string;
  feedbackAge: number;
}
export function createSurferMinigame(): SurferMinigame {
  const rocks = Array.from({ length: 9 }, (_, i) => ({
    x: 680 + (-0.5 + i * 1.4) * surferSettings.speed,
    height: [30, 36, 38, 32, 40, 34, 30, 38, 32][i],
    hit: false,
    flowey: i === 4,
  }));
  const coins: Coin[] = rocks.flatMap((r) => [
    { x: r.x - 40, y: surferSettings.waterY - 24, purple: false, collected: false },
    { x: r.x + 40, y: surferSettings.waterY - 65, purple: false, collected: false },
  ]);
  const flower = rocks[4];
  coins.push({ x: flower.x, y: surferSettings.waterY - flower.height - 42, purple: true, collected: false });
  return {
    kind: 'surf',
    age: 0,
    misses: 0,
    points: 0,
    feetY: surferSettings.waterY,
    velocity: 0,
    rocks,
    coins,
    coinsCollected: 0,
    purpleCollected: false,
    feedback: 'Jump over rocks and collect coins!',
    feedbackAge: 2,
  };
}
export function jumpSurfer(m: SurferMinigame) {
  if (m.age >= surferSettings.duration || m.feetY < surferSettings.waterY - 0.01 || m.velocity !== 0)
    return false;
  m.velocity = -surferSettings.jumpSpeed;
  return true;
}
export function advanceSurfer(m: SurferMinigame, dt: number) {
  if (m.age >= surferSettings.duration) return true;
  if (!Number.isFinite(dt) || dt <= 0) return m.age >= surferSettings.duration;
  const elapsed = Math.min(dt, Math.max(0, surferSettings.duration - m.age)),
    steps = Math.max(1, Math.ceil(elapsed * 120)),
    step = elapsed / steps;
  for (let i = 0; i < steps; i++) {
    m.age = Math.min(surferSettings.duration, m.age + step);
    m.feedbackAge = Math.max(0, m.feedbackAge - step);
    m.feetY += m.velocity * step + 0.5 * surferSettings.gravity * step * step;
    m.velocity += surferSettings.gravity * step;
    if (m.feetY >= surferSettings.waterY) {
      m.feetY = surferSettings.waterY;
      m.velocity = 0;
    }
    for (const r of m.rocks) {
      r.x -= surferSettings.speed * step;
      if (
        !r.hit &&
        Math.abs(r.x - surferSettings.playerX) < 31 &&
        m.feetY > surferSettings.waterY - r.height + 4
      ) {
        r.hit = true;
        m.misses++;
        m.points -= 10;
        m.feedback = 'CRASH! -10 points';
        m.feedbackAge = 0.8;
      }
    }
    for (const c of m.coins) {
      c.x -= surferSettings.speed * step;
      if (
        !c.collected &&
        Math.abs(c.x - surferSettings.playerX) < 23 &&
        c.y >= m.feetY - 53 &&
        c.y <= m.feetY + 8
      ) {
        c.collected = true;
        m.points += c.purple ? 10 : 5;
        m.coinsCollected++;
        if (c.purple) m.purpleCollected = true;
        m.feedback = c.purple ? 'Flowey: Here! A purple coin! +10' : '+5 points';
        m.feedbackAge = c.purple ? 1.4 : 0.5;
      }
    }
  }
  if (m.age + 1e-8 >= surferSettings.duration) {
    m.age = surferSettings.duration;
    return true;
  }
  return false;
}
