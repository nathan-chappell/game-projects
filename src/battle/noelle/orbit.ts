import type { Point } from '../../world/types.ts';
// The fourth attack's moving box and orbit geometry are shared by drawing and collisions.
export const orbitSettings = {
  duration: 16,
  warmup: 0.8,
  boxSize: 180,
  boxVelocityX: 60,
  boxVelocityY: -42,
  cubeSize: 54,
  cubeDamage: 10,
  ballRadius: 9,
  ballDamage: 10,
};

export const orbitArena = { x: 60, y: 18, width: 520, height: 266, border: 4 };

// Keep the original pattern available for a later attack; normal play uses fewer snowballs.
export const orbitPatterns = {
  normal: [
    { count: 4, rx: 96, ry: 72, speed: 0.65, offset: 0.2 },
    { count: 6, rx: 245, ry: 108, speed: 0.4, offset: 0.1 },
  ],
  hard: [
    { count: 6, rx: 96, ry: 72, speed: 0.65, offset: 0.2 },
    { count: 12, rx: 245, ry: 108, speed: 0.4, offset: 0.1 },
  ],
};

export function createOrbitAttack(variant: 'normal' | 'hard' | 'buffed' = 'normal') {
  return {
    variant,
    cubeDamage: variant === 'hard' ? 50 : orbitSettings.cubeDamage,
    age: 0,
    box: {
      x: orbitArena.x + (orbitArena.width - orbitSettings.boxSize) / 2,
      y: orbitArena.y + (orbitArena.height - orbitSettings.boxSize) / 2,
      size: orbitSettings.boxSize,
      border: 4,
      vx: orbitSettings.boxVelocityX,
      vy: orbitSettings.boxVelocityY,
    },
  };
}

function bounce(position: number, velocity: number, dt: number, min: number, max: number) {
  let next = position + velocity * dt;
  while (next < min || next > max) {
    if (next < min) {
      next = min + (min - next);
      velocity = Math.abs(velocity);
    } else {
      next = max - (next - max);
      velocity = -Math.abs(velocity);
    }
  }
  return [next, velocity];
}

export function advanceOrbitBox(orbit: ReturnType<typeof createOrbitAttack>, soul: Point, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const beforeAge = Math.max(0, orbit.age - orbitSettings.warmup);
  orbit.age = Math.min(orbitSettings.duration, orbit.age + dt);
  const movingTime = Math.max(0, orbit.age - orbitSettings.warmup) - beforeAge;
  if (movingTime <= 0) return;
  const box = orbit.box,
    oldX = box.x,
    oldY = box.y;
  [box.x, box.vx] = bounce(
    box.x,
    box.vx,
    movingTime,
    orbitArena.x + orbitArena.border,
    orbitArena.x + orbitArena.width - orbitArena.border - box.size,
  );
  [box.y, box.vy] = bounce(
    box.y,
    box.vy,
    movingTime,
    orbitArena.y + orbitArena.border,
    orbitArena.y + orbitArena.height - orbitArena.border - box.size,
  );
  soul.x += box.x - oldX;
  soul.y += box.y - oldY;
}

export function orbitHazards(orbit: ReturnType<typeof createOrbitAttack>) {
  const age = Math.max(0, orbit.age - orbitSettings.warmup),
    x = orbitArena.x + orbitArena.width / 2,
    y = orbitArena.y + orbitArena.height / 2,
    balls = [];
  for (const ring of orbitPatterns[orbit.variant === 'buffed' ? 'hard' : orbit.variant] ||
    orbitPatterns.normal) {
    for (let i = 0; i < ring.count; i++) {
      const angle = ring.offset + age * ring.speed + (i * Math.PI * 2) / ring.count;
      balls.push({ x: x + Math.cos(angle) * ring.rx, y: y + Math.sin(angle) * ring.ry });
    }
  }
  return { cube: { x, y, size: orbitSettings.cubeSize, angle: age * 0.55 }, balls };
}

export function cubeTouchesSoul(
  cube: { x: number; y: number; size: number; angle: number },
  soul: Point,
  soulWidth: number,
  soulHeight: number,
) {
  const c = Math.cos(cube.angle),
    s = Math.sin(cube.angle),
    dx = soul.x - cube.x,
    dy = soul.y - cube.y,
    half = cube.size / 2,
    halfWidth = soulWidth / 2,
    halfHeight = soulHeight / 2;
  for (const [ax, ay] of [
    [1, 0],
    [0, 1],
    [c, s],
    [-s, c],
  ]) {
    const distance = Math.abs(dx * ax + dy * ay),
      soulProjection = halfWidth * Math.abs(ax) + halfHeight * Math.abs(ay),
      cubeProjection = half * (Math.abs(c * ax + s * ay) + Math.abs(-s * ax + c * ay));
    if (distance > soulProjection + cubeProjection) return false;
  }
  return true;
}
