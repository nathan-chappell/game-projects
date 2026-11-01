import assert from 'node:assert/strict';
import test from 'node:test';
import { readBattleRoutes } from '../../../tests/fixtures/routes.ts';
import { freshPartyHP } from '../../game/config.ts';
import { advanceSnowAttack, attackEnemy, createEncounter, moveSoul, startKrisTurn } from './rules.ts';
import { battleSettings } from './settings.ts';
import { attackState } from './test-state.ts';

// Routes were checked with extra projectile clearance, then replayed here through
// real movement and damage. They use only cardinal movement and waits, below full speed.
const routes = readBattleRoutes();

for (const buffed of [false, true]) {
  test(`${buffed ? 'buffed' : 'normal'} attacks all have damage-free routes without Defend or invincibility`, () => {
    const cases = routes.filter((route) => route.buffed === buffed);
    assert.deepEqual([...new Set(cases.map((route) => route.pattern))].sort(), [0, 1, 2, 3, 4]);
    for (const route of cases) {
      const battle = createEncounter(),
        hp = freshPartyHP();
      startKrisTurn(battle);
      battle.enemyAttackCount = battle.strongerAttackCount = route.pattern;
      battle.strongerAttacks = route.buffed;
      attackEnemy(battle);
      attackEnemy(battle);
      let rng = route.seed;
      const random = () => {
        rng ^= rng << 13;
        rng ^= rng >>> 17;
        rng ^= rng << 5;
        return (rng >>> 0) / 4294967296;
      };
      assert.equal(battle.invincible, false);
      assert.equal(battle.defending, false);
      for (const [direction, frames] of route.commands) {
        const keys = new Set(direction === 'wait' ? [] : [direction]);
        for (let frame = 0; frame < frames; frame++) {
          moveSoul(battle, keys, 1 / 60);
          advanceSnowAttack(battle, hp, 1 / 60, random);
        }
      }
      assert.deepEqual(
        hp,
        freshPartyHP(),
        `attack ${route.pattern + 1}, seed ${route.seed} must be avoidable`,
      );
      assert.notEqual(attackState(battle).endingAge, null);
      advanceSnowAttack(battle, hp, battleSettings.snowEndPause + 0.02, random);
      assert.equal(battle.phase, 'kris');
    }
  });
}

test('five-ball waves are staggered so a whole row cannot arrive as a solid wall', () => {
  for (const index of [0, 1]) {
    const battle = createEncounter(),
      hp = freshPartyHP();
    startKrisTurn(battle);
    battle.strongerAttacks = true;
    battle.strongerAttackCount = index;
    attackEnemy(battle);
    attackEnemy(battle);
    advanceSnowAttack(battle, hp, battleSettings.snowStartDelay + 0.01, () => 0.5);
    assert.equal(attackState(battle).balls.length, 5);
    const delayed = attackState(battle).balls.filter((ball) => ball.delay! > 0);
    assert.equal(delayed.length, 2);
    const axis = index === 0 ? 'y' : 'x',
      before = delayed.map((ball) => ball[axis]);
    advanceSnowAttack(battle, hp, 0.2, () => 0.5);
    assert.deepEqual(
      delayed.map((ball) => ball[axis]),
      before,
    );
    advanceSnowAttack(battle, hp, 0.3, () => 0.5);
    assert.ok(delayed.every((ball, i) => ball[axis] > before[i]));
  }
});
