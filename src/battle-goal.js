// Half-health challenge: a blue soul jumps over rollers and climbs to the green goal.
export const goalSettings = {
  threshold: 1500,
  warmup: 1.2,
  damage: 10,
  ballRadius: 14,
  upperRadius: 14,
  groundCount: 9,
  upperCount: 9,
  ballSpacing: 30,
  ballsPerGroup: 3,
  groupSpacing: 156,
  startSpeed: 70,
  speedStep: 15,
  speedInterval: 10,
  maxSpeed: 130,
  gravity: 600,
  jumpSpeed: 280,
  jumpReleaseSpeed: 125,
  coyoteSeconds: 0.1,
  jumpBufferSeconds: 0.12,
};

export const goalArena = { x: 60, y: 18, width: 520, height: 266, border: 4 };
export const goalPlatforms = [
  { x: 76, y: 188, width: 432, height: 8 },
  { x: 526, y: 220, width: 42, height: 8 },
];
export const goalGroundY = goalArena.y + goalArena.height - goalArena.border;
export const greenGoal = { x: 78, y: 151, width: 28, height: 34 };

export function createGoalAttack() {
  return { age: 0, vy: 0, grounded: true, jumpHeld: false, jumpBuffer: 0, coyoteTime: 0 };
}

export function goalSpeed(attack) {
  const activeAge = Math.max(0, attack.age - goalSettings.warmup);
  return Math.min(goalSettings.maxSpeed,
    goalSettings.startSpeed + Math.floor((activeAge + 1e-9) / goalSettings.speedInterval) * goalSettings.speedStep);
}

function travelDistance(age) {
  let remaining = Math.max(0, age - goalSettings.warmup), distance = 0;
  for (let speed = goalSettings.startSpeed; speed < goalSettings.maxSpeed; speed += goalSettings.speedStep) {
    const seconds = Math.min(remaining, goalSettings.speedInterval);
    distance += seconds * speed;
    remaining -= seconds;
  }
  return distance + remaining * goalSettings.maxSpeed;
}

export function goalSnowballs(attack) {
  const distance = travelDistance(attack.age), balls = [];
  for (const lane of ['ground', 'upper']) {
    const lower = lane === 'ground', radius = lower ? goalSettings.ballRadius : goalSettings.upperRadius,
      count = lower ? goalSettings.groundCount : goalSettings.upperCount,
      min = (lower ? goalArena.x : goalPlatforms[0].x) - radius - 40,
      // One empty group slot gives the player a longer landing gap between cycles.
      period = goalSettings.groupSpacing * (Math.ceil(count / goalSettings.ballsPerGroup) + 1),
      first = lower ? 160 : 122, direction = lower ? -1 : 1;
    for (let i = 0; i < count; i++) {
      const offset = Math.floor(i / goalSettings.ballsPerGroup) * goalSettings.groupSpacing +
        (i % goalSettings.ballsPerGroup) * goalSettings.ballSpacing;
      const travel = first - min + offset + direction * distance;
      const x = min + ((travel % period) + period) % period;
      balls.push({
        pass: Math.floor(travel / period),
        x,
        y: (lower ? goalGroundY : goalPlatforms[0].y) - radius,
        radius, lane, angle: direction * distance / radius,
        active: lower || (x >= goalPlatforms[0].x - radius && x <= goalPlatforms[0].x + goalPlatforms[0].width - radius),
      });
    }
  }
  return balls;
}

export function moveBlueSoul(attack, soul, keys, dt, width = 24, height = 21, speed = 150) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const jumping = keys.has('up') || keys.has('jump');
  if (jumping && !attack.jumpHeld) attack.jumpBuffer = goalSettings.jumpBufferSeconds;
  if (!jumping && attack.jumpHeld && attack.vy < -goalSettings.jumpReleaseSpeed)
    attack.vy = -goalSettings.jumpReleaseSpeed;
  attack.jumpHeld = jumping;
  const steps = Math.max(1, Math.ceil(dt * 120 - 1e-9)), step = dt / steps,
    dx = Number(keys.has('right')) - Number(keys.has('left')),
    halfWidth = width / 2, halfHeight = height / 2,
    floor = { x:goalArena.x, y:goalGroundY, width:goalArena.width };
  for (let i = 0; i < steps; i++) {
    attack.coyoteTime = attack.grounded ? goalSettings.coyoteSeconds : Math.max(0, attack.coyoteTime - step);
    if (attack.jumpBuffer > 0 && attack.coyoteTime > 0) {
      attack.vy = -goalSettings.jumpSpeed;
      attack.grounded = false;
      attack.coyoteTime = 0;
      attack.jumpBuffer = 0;
    }
    attack.jumpBuffer = Math.max(0, attack.jumpBuffer - step);
    soul.x = Math.max(goalArena.x + goalArena.border + halfWidth,
      Math.min(goalArena.x + goalArena.width - goalArena.border - halfWidth, soul.x + dx * speed * step));
    const previousBottom = soul.y + halfHeight;
    soul.y += attack.vy * step + goalSettings.gravity * step * step / 2;
    attack.vy += goalSettings.gravity * step;
    attack.grounded = false;
    if (attack.vy >= 0) {
      const landing = [...goalPlatforms, floor].filter(platform =>
        soul.x + halfWidth > platform.x && soul.x - halfWidth < platform.x + platform.width &&
        previousBottom <= platform.y + 1e-7 && soul.y + halfHeight >= platform.y - 1e-7)
        .sort((a,b) => a.y - b.y)[0];
      if (landing) {
        soul.y = landing.y - halfHeight;
        attack.vy = 0;
        attack.grounded = true;
      }
    }
    const ceiling = goalArena.y + goalArena.border + halfHeight;
    if (soul.y < ceiling) {
      soul.y = ceiling;
      attack.vy = Math.max(0, attack.vy);
    }
  }
}

export function touchesGreenGoal(soul, width, height) {
  return soul.x + width / 2 >= greenGoal.x && soul.x - width / 2 <= greenGoal.x + greenGoal.width &&
    soul.y + height / 2 >= greenGoal.y && soul.y - height / 2 <= greenGoal.y + greenGoal.height;
}
