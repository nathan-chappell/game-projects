import test from 'node:test';
import assert from 'node:assert/strict';
import { pelletsDuration } from '../src/battle-pellets.js';
import { readFileSync } from 'node:fs';
import {
  goalSettings, goalArena, goalPlatforms, goalGroundY, greenGoal, createGoalAttack, goalSpeed, goalSnowballs, touchesGreenGoal,
} from '../src/battle-goal.js';
import {
  createEncounter, startKrisTurn, defend, attackEnemy, friendlynessPellets, skipFallenTurns,
  advanceBattleTime, advanceSnowAttack, moveSoul, isSoulInSnow, soulArena, battleSettings, snowAttackStatus, toggleRepeatAttack,
} from '../src/battle-rules.js';
import { freshPartyHP } from '../src/config.js';

function goalTurn(defending = false) {
  const battle = createEncounter();
  startKrisTurn(battle);
  battle.enemy.hp = 1500;
  (defending ? defend : attackEnemy)(battle);
  (defending ? defend : attackEnemy)(battle);
  return battle;
}

test('half-health attack triggers at 1500 or below once and unlocks stronger attacks afterward', (t) => {
  t.mock.method(Math, 'random', () => 0);
  for (const hp of [1501, 1500, 1499]) {
    const battle = createEncounter();
    startKrisTurn(battle);
    battle.enemy.hp = hp;
    defend(battle);
    assert.equal(battle.phase, 'flowey');
    defend(battle);
    assert.equal(battle.snowAttack.direction, hp <= 1500 ? 'goal' : 'down');
    assert.equal(battle.goalAttackUsed, hp <= 1500);
    if (hp <= 1500) {
      assert.equal(battle.enemyAttackCount, 0);
      startKrisTurn(battle);
      defend(battle);
      defend(battle);
      assert.equal(battle.snowAttack.direction, 'down');
      assert.equal(battle.enemyAttackCount, 1);
    }
  }
  assert.equal(createEncounter().goalAttackUsed, false);
});

test('damage crossing the threshold queues the special after Flowey acts, including Pellets and fallen turns', () => {
  for (const action of ['kris', 'flowey', 'pellets', 'fallen']) {
    const battle = createEncounter(), hp = freshPartyHP();
    startKrisTurn(battle);
    battle.enemy.hp = action === 'kris' || action === 'fallen' ? 1575 : action === 'pellets' ? 1650 : 1580;
    (action === 'kris' || action === 'fallen' ? attackEnemy : defend)(battle);
    assert.equal(battle.phase, 'flowey');
    if (action === 'fallen') {
      hp.Flowey = 0;
      skipFallenTurns(battle, hp);
    } else if (action === 'pellets') {
      battle.tp = 90;
      friendlynessPellets(battle, hp);
      advanceBattleTime(battle,pelletsDuration);
    } else (action === 'flowey' ? attackEnemy : defend)(battle);
    assert.equal(battle.enemy.hp, 1500);
    assert.equal(battle.snowAttack.direction, 'goal');
  }
});

test('special interrupts normal repeat mode and the testing toggle can replay the special', (t) => {
  t.mock.method(Math, 'random', () => 0.25);
  const battle = createEncounter();
  startKrisTurn(battle);
  defend(battle); defend(battle);
  toggleRepeatAttack(battle);
  startKrisTurn(battle);
  battle.enemy.hp = 1500;
  defend(battle); defend(battle);
  assert.equal(battle.snowAttack.direction, 'goal');
  const first = battle.snowAttack.goal;
  first.age = 80;
  startKrisTurn(battle);
  defend(battle); defend(battle);
  assert.equal(battle.snowAttack.direction, 'goal');
  assert.notEqual(battle.snowAttack.goal, first);
  assert.equal(battle.snowAttack.goal.age, 0);
  toggleRepeatAttack(battle);
  startKrisTurn(battle);
  defend(battle); defend(battle);
  assert.equal(battle.snowAttack.direction, 'down');
  assert.equal(battle.enemyAttackCount, 2);
});

test('three packs of three roll on each level, including the new middle packs', () => {
  const attack = createGoalAttack(), before = goalSnowballs(attack);
  assert.equal(before.length, 18);
  for (const lane of ['ground', 'upper']) {
    const balls = before.filter(ball => ball.lane === lane);
    assert.equal(balls.length, 9);
    assert.equal(balls.filter(ball => ball.active && ball.x - ball.radius >= goalArena.x &&
      ball.x + ball.radius <= goalArena.x + goalArena.width).length, 9);
    const middle = balls.slice(3, 6);
    assert.ok(middle.every(ball => ball.x > 250 && ball.x < 400));
    assert.equal(middle[1].x - middle[0].x, goalSettings.ballSpacing);
    assert.equal(middle[2].x - middle[1].x, goalSettings.ballSpacing);
  }
  attack.age = goalSettings.warmup + 0.1;
  goalSnowballs(attack).forEach((ball, index) => {
    if (ball.lane === 'ground') assert.ok(ball.x < before[index].x);
    else assert.ok(ball.x > before[index].x);
  });
  for (const age of [0, 1, 10, 30, 60, 120, 10000]) {
    attack.age = age;
    assert.equal(goalSnowballs(attack).length, 18);
    for (const ball of goalSnowballs(attack)) {
      assert.equal(ball.radius, 14);
      assert.equal(ball.y + ball.radius, ball.lane === 'ground' ? goalGroundY : goalPlatforms[0].y);
      if (ball.active && ball.lane === 'upper')
        assert.ok(ball.x + ball.radius <= goalPlatforms[0].x + goalPlatforms[0].width);
    }
  }
});

test('speed increases every ten active seconds, caps below soul speed, and never teleports at a speed change', () => {
  const attack = createGoalAttack();
  for (const [seconds, speed] of [[0,70], [9.99,70], [10,85], [20,100], [30,115], [40,130], [5000,130]]) {
    attack.age = goalSettings.warmup + seconds;
    assert.equal(goalSpeed(attack), speed);
  }
  assert.ok(goalSettings.maxSpeed < battleSettings.soulSpeed);
  for (const seconds of [10,20,30,40,50]) {
    attack.age = goalSettings.warmup + seconds - 0.001;
    const before = goalSnowballs(attack);
    attack.age += 0.002;
    goalSnowballs(attack).forEach((ball, i) => {
      const difference = Math.abs(ball.x - before[i].x),
        count = ball.lane === 'ground' ? goalSettings.groundCount : goalSettings.upperCount,
        period = goalSettings.groupSpacing * (Math.ceil(count / goalSettings.ballsPerGroup) + 1);
      assert.ok(Math.min(difference, period - difference) <= goalSettings.maxSpeed * 0.002 + 1e-8);
      if (difference > period / 2) {
        const outside = x => x + ball.radius < goalArena.x || x - ball.radius > goalArena.x + goalArena.width;
        assert.equal(outside(before[i].x) && outside(ball.x), true);
      }
    });
  }
});

test('blue soul moves horizontally at normal speed while gravity keeps it on the floor', () => {
  const battle = goalTurn();
  assert.equal(soulArena(battle), goalArena);
  assert.equal(isSoulInSnow(battle), false);
  const before = battle.soul.x;
  moveSoul(battle, new Set(['right']), 0.1);
  assert.equal(battle.soul.x - before, 15);
  moveSoul(battle, new Set(['down', 'right']), 10);
  assert.equal(battle.soul.x, goalArena.x + goalArena.width - goalArena.border - battleSettings.soulWidth / 2);
  assert.equal(battle.soul.y, goalArena.y + goalArena.height - goalArena.border - battleSettings.soulHeight / 2);
});

test('attack never times out; touching the goal ends damage and returns to the surviving party', () => {
  const battle = goalTurn(), hp = freshPartyHP();
  battle.invincible = true;
  advanceSnowAttack(battle, hp, 125, () => 0);
  assert.equal(battle.phase, 'enemy');
  assert.equal(battle.snowAttack.endingAge, null);
  assert.equal(goalSpeed(battle.snowAttack.goal), goalSettings.maxSpeed);
  assert.match(snowAttackStatus(battle), /Jump to green goal.*130 \/ 130/);
  battle.invincible = false;
  battle.soul = { x: greenGoal.x - battleSettings.soulWidth / 2, y: greenGoal.y + greenGoal.height / 2 };
  assert.equal(touchesGreenGoal(battle.soul, battleSettings.soulWidth, battleSettings.soulHeight), true);
  advanceSnowAttack(battle, hp, 0.01, () => 0);
  assert.notEqual(battle.snowAttack.endingAge, null);
  hp.Kris = 0;
  advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.01, () => 0);
  assert.equal(battle.phase, 'flowey');
  assert.equal(battle.snowAttack, null);
  assert.equal(hp.Flowey, 100);
});

test('snowballs deal ten damage to a living teammate, respect cooldown, Defend and invincibility', () => {
  for (const defending of [false,true]) {
    const battle = goalTurn(defending), hp = freshPartyHP();
    hp.Kris = 0;
    battle.snowAttack.goal.age = goalSettings.warmup;
    battle.soul = { ...goalSnowballs(battle.snowAttack.goal)[0] };
    advanceSnowAttack(battle, hp, 0.01, () => 0);
    assert.equal(hp.Kris, 0);
    assert.equal(hp.Flowey, defending ? 95 : 90);
    advanceSnowAttack(battle, hp, 0.05, () => 0);
    assert.equal(hp.Flowey, defending ? 95 : 90);
    battle.invincible = true;
    battle.snowAttack.hitCooldown = 0;
    battle.soul = { ...goalSnowballs(battle.snowAttack.goal)[0] };
    advanceSnowAttack(battle, hp, 0.01, () => 0);
    assert.equal(hp.Flowey, defending ? 95 : 90);
    assert.equal(hp.Susie, 100);
  }
  const battle = goalTurn(), hp = freshPartyHP();
  hp.Kris = 0; hp.Flowey = 5;
  battle.snowAttack.goal.age = goalSettings.warmup;
  battle.soul = { ...goalSnowballs(battle.snowAttack.goal)[0] };
  advanceSnowAttack(battle, hp, 0.01, () => 0);
  assert.equal(hp.Flowey, 0);
});

test('tapping jump makes a short hop, holding jumps higher, and the maximum stays below 66 pixels', () => {
  const heights = [];
  for (const heldFrames of [2, 6, 24]) {
    const battle = goalTurn(), floorY = battle.soul.y;
    let highest = floorY;
    for (let frame = 0; frame < 120; frame++) {
      moveSoul(battle, new Set(frame < heldFrames ? ['up'] : []), 1 / 60);
      highest = Math.min(highest, battle.soul.y);
    }
    heights.push(floorY - highest);
    assert.equal(battle.soul.y, floorY);
    assert.equal(battle.snowAttack.goal.grounded, true);
  }
  assert.ok(heights[0] >= 20 && heights[0] < 30);
  assert.ok(heights[1] > heights[0]);
  assert.ok(heights[2] > heights[1] + 20);
  assert.ok(heights[2] <= 66);
});

test('holding jump cannot fly or jump again in midair, and a fresh ground press starts a new jump', () => {
  const battle = goalTurn(), floorY = battle.soul.y;
  for (let frame = 0; frame < 180; frame++) moveSoul(battle, new Set(['jump']), 1 / 60);
  assert.equal(battle.soul.y, floorY);
  assert.equal(battle.snowAttack.goal.grounded, true);
  moveSoul(battle, new Set(), 1 / 60);
  moveSoul(battle, new Set(['jump']), 1 / 60);
  assert.ok(battle.soul.y < floorY);
  moveSoul(battle, new Set(), 1 / 60);
  const velocity = battle.snowAttack.goal.vy;
  moveSoul(battle, new Set(['jump']), 1 / 60);
  assert.ok(battle.snowAttack.goal.vy > velocity);
});

test('blue soul can jump the rollers and climb both levels without damage at all speed tiers', () => {
  const routes = JSON.parse(readFileSync(new URL('./fixtures/blue-safe-routes.json', import.meta.url), 'utf8'));
  assert.deepEqual(routes.map(route => route.waitSeconds), [0,10,20,30,40,50,120]);
  // Browser frame timestamps include tiny rounding errors; the same inputs must remain safe.
  const cases = routes.flatMap(route => [1 / 60, 1 / 60 + 1e-14].map(dt => ({ route, dt })));
  for (const { route, dt } of cases) {
    const battle = goalTurn(), hp = freshPartyHP();
    assert.equal(battle.invincible, false);
    assert.equal(battle.defending, false);
    let stoodOnStep = false, stoodOnUpper = false;
    for (const [input, frames] of route.commands) {
      const keys = new Set(input ? input.split('+') : []);
      for (let frame = 0; frame < frames; frame++) {
        moveSoul(battle, keys, dt);
        advanceSnowAttack(battle, hp, dt, () => 0);
        const goal = battle.snowAttack.goal;
        if (goal.grounded) {
          stoodOnStep ||= Math.abs(battle.soul.y + battleSettings.soulHeight / 2 - goalPlatforms[1].y) < 1e-6;
          stoodOnUpper ||= Math.abs(battle.soul.y + battleSettings.soulHeight / 2 - goalPlatforms[0].y) < 1e-6;
        }
        assert.deepEqual(hp, freshPartyHP(), `route after waiting ${route.waitSeconds}s must remain avoidable`);
      }
    }
    assert.equal(stoodOnStep, true);
    assert.equal(stoodOnUpper, true);
    assert.notEqual(battle.snowAttack.endingAge, null);
    if (route.waitSeconds >= 40) assert.equal(goalSpeed(battle.snowAttack.goal), 130);
    advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.02, () => 0);
    assert.equal(battle.strongerAttacks, true);
  }
});
