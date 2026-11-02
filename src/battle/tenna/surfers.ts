export const surferSettings = {
  duration: 15,
  speed: 300,
  playerX: 140,
  waterY: 320,
  gravity: 1000,
  jumpSpeed: 390,
};
interface Rock {
  x: number;
  height: number;
  hit: boolean;
}
interface Coin {
  x: number;
  y: number;
  purple: boolean;
  collected: boolean;
}
interface WaterPlatform {
  x: number;
  y: number;
  width: number;
  landed: boolean;
}
export interface SurferMinigame {
  steps: WaterPlatform[];
  platform: WaterPlatform;
  onPlatform: boolean;
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
  const rocks = Array.from({ length: 13 }, (_, i) => i)
    .filter((i) => i < 5 || i > 8)
    .map((i) => ({
      x: surferSettings.playerX + (1.4 + i * 1.05) * surferSettings.speed,
      height: [30, 36, 38, 32, 34, 30, 36, 38, 32, 36, 40, 32, 38][i],
      hit: false,
    }));
  const platform = {
    x: surferSettings.playerX + 8.8 * surferSettings.speed,
    y: surferSettings.waterY - 132,
    width: 160,
    landed: false,
  };
  const steps = [7, 7.9].map((time, i) => ({
    x: surferSettings.playerX + time * surferSettings.speed,
    y: surferSettings.waterY - 44 * (i + 1),
    width: 160,
    landed: false,
  }));
  const coins: Coin[] = rocks.flatMap((r) => [
    { x: r.x - 40, y: surferSettings.waterY - 24, purple: false, collected: false },
    { x: r.x + 40, y: surferSettings.waterY - 65, purple: false, collected: false },
  ]);
  for (const step of steps)
    for (const offset of [-42, 0, 42])
      coins.push({ x: step.x + offset, y: step.y - 24, purple: false, collected: false });
  coins.push({ x: platform.x - 20, y: platform.y - 32, purple: true, collected: false });
  return {
    kind: 'surf',
    platform,
    steps,
    onPlatform: false,
    age: 0,
    misses: 0,
    points: 0,
    feetY: surferSettings.waterY,
    velocity: 0,
    rocks,
    coins,
    coinsCollected: 0,
    purpleCollected: false,
    feedback: 'Jump up the water steps to Flowey’s coin!',
    feedbackAge: 2,
  };
}
export function jumpSurfer(m: SurferMinigame) {
  if (
    m.age >= surferSettings.duration ||
    (m.feetY < surferSettings.waterY - 0.01 && !m.onPlatform) ||
    m.velocity !== 0
  )
    return false;
  m.onPlatform = false;
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
    const previousFeetY = m.feetY;
    for (const surface of [...m.steps, m.platform]) surface.x -= surferSettings.speed * step;
    m.feetY += m.velocity * step + 0.5 * surferSettings.gravity * step * step;
    m.velocity += surferSettings.gravity * step;
    // Platforms and the stone cap only catch downward landings. The support
    // column has no side/underside collision and never causes crash damage.
    const landing = [...m.steps, m.platform]
      .sort((a, b) => a.y - b.y)
      .find((surface) => {
        const over = Math.abs(surface.x - surferSettings.playerX) < surface.width / 2 + 8;
        return (
          over &&
          ((m.onPlatform && Math.abs(previousFeetY - surface.y) < 0.01) ||
            (m.velocity >= 0 && previousFeetY <= surface.y && m.feetY >= surface.y))
        );
      });
    if (landing) {
      m.feetY = landing.y;
      m.velocity = 0;
      m.onPlatform = true;
      landing.landed = true;
    } else m.onPlatform = false;
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
        (!c.purple || (m.onPlatform && Math.abs(m.feetY - m.platform.y) < 0.01)) &&
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
