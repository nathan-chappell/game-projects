import { markVesselAttackCleared, pauseClearedVesselBattle } from '../vessel/progression.ts';
import { starBombSettings } from '../vessel/star-bombs.ts';
import { advanceVesselRain, vesselRainSettings } from '../vessel/sword-rain.ts';
import { advanceAimedSwords } from '../knights/aimed-swords.ts';
import { advanceCrossingSwords, crossingSwordTouches } from '../knights/crossing-swords.ts';
import { advanceKnightSwords, knightSwordSettings } from '../knights/swords.ts';
import { hitOpposingKnight, knightProjectileRules } from '../knights/projectiles.ts';
import { advanceUndyneAttack, undyneSettings } from '../tenna/undyne.ts';
import { advanceTvBolts, boltTouches, tvBoltSettings } from '../tenna/tv-bolts.ts';
import { present } from '../../game/invariants.ts';
import type { PartyHP } from '../../inventory/types.ts';
import type { Point } from '../../world/types.ts';
import { advanceMiniSwords, miniSwordHazards } from '../dark/mini-swords.ts';
import { advanceSwords, swordSettings, swordTouchesSoul } from '../dark/swords.ts';
import { advanceWarningSwords, warningSwordTouches } from '../dark/warning-swords.ts';
import { crossingHazards, crossingSettings } from '../noelle/crossing.ts';
import { goalSettings, goalSnowballs, goalSpeed, touchesGreenGoal } from '../noelle/goal.ts';
import { advanceOrbitBox, cubeTouchesSoul, orbitHazards, orbitSettings } from '../noelle/orbit.ts';
import {
  snowgraveDuration,
  snowgraveFrame,
  snowgraveSettings,
  snowgraveTouchesSoul,
} from '../noelle/snowgrave.ts';
import { advanceSaxAttack, noteTouches, saxRimTouches, saxSettings } from '../tenna/saxophones.ts';
import { battlePartyNames } from './availability.ts';
import { bossAttackDamage, projectileDamage, gainBattleTP } from './resources.ts';
import { battleArena, battleSettings } from './settings.ts';
import type { Encounter, Snowball } from './types.ts';
interface Dependencies {
  readonly constrainSoul: (encounter: Encounter) => void;
  readonly isSoulInSnow: (encounter: Encounter) => boolean;
  readonly damageLivingTeammate: (
    encounter: Encounter,
    partyHP: PartyHP,
    amount: number,
    source: string,
    random: () => number,
  ) => boolean;
  readonly startKrisTurn: (encounter: Encounter, partyHP?: PartyHP | undefined) => boolean;
  readonly skipFallenTurns: (encounter: Encounter, partyHP: PartyHP) => boolean;
}
export function createAttackRunner(dependencies: Dependencies) {
  function snowballTouchesSoul(ball: Snowball, soul: Point, radius = battleSettings.snowballRadius) {
    const dx = Math.max(0, Math.abs(ball.x - soul.x) - battleSettings.soulWidth / 2),
      dy = Math.max(0, Math.abs(ball.y - soul.y) - battleSettings.soulHeight / 2);
    return dx * dx + dy * dy <= radius ** 2;
  }
  function advanceSnowContact(encounter: Encounter, partyHP: PartyHP, dt: number, random: () => number) {
    const snow = present(encounter.snowAttack),
      path = snow.direction === 'path';
    // A moving path edge can alternate safe/snowy several times while a direction
    // is held. Crossing that edge must not reset the time between damage ticks.
    if (path) snow.contactCooldown = Math.max(0, snow.contactCooldown - dt);
    if (!dependencies.isSoulInSnow(encounter)) {
      snow.contactAge = 0;
      snow.inSnow = false;
      return false;
    }
    const entering = !snow.inSnow;
    snow.inSnow = true;
    snow.contactAge += dt;
    if (path) {
      if (snow.contactCooldown > 1e-9) return false;
    } else if (!entering) {
      if (snow.contactAge < battleSettings.snowContactInterval - 1e-9) return false;
      snow.contactAge = Math.max(0, snow.contactAge - battleSettings.snowContactInterval);
    }
    const damage = bossAttackDamage(
      encounter,
      snow.direction === 'path' ? battleSettings.snowPathDamage : battleSettings.snowContactDamage,
    );
    if (!dependencies.damageLivingTeammate(encounter, partyHP, damage, 'the snow', random)) return false;
    if (path) snow.contactCooldown = battleSettings.snowContactInterval;
    snow.contactFlash = 0.3;
    return true;
  }
  function stepSnowAttack(encounter: Encounter, partyHP: PartyHP, dt: number, random: () => number) {
    const snow = present(encounter.snowAttack),
      soul = present(encounter.soul);
    if (snow.direction === 'vesselRain') {
      snow.hitCooldown = Math.max(0, snow.hitCooldown - dt);
      const finished = advanceVesselRain(snow.vesselRain, dt, soul, random);
      let changed = false;
      if (snow.hitCooldown <= 1e-9) {
        const hit = snow.vesselRain.swords.find((sword) =>
          crossingSwordTouches(sword, soul, battleSettings.soulWidth, battleSettings.soulHeight),
        );
        if (hit) {
          changed = dependencies.damageLivingTeammate(
            encounter,
            partyHP,
            projectileDamage(
              encounter,
              hit.kind === 'mini'
                ? hit.red
                  ? starBombSettings.damage
                  : vesselRainSettings.miniDamage
                : vesselRainSettings.fallingDamage,
            ),
            hit.kind === 'mini' ? 'a mini sword' : 'a sword',
            random,
          );
          snow.hitCooldown = vesselRainSettings.hitCooldown;
        }
      }
      if (finished && battlePartyNames(encounter).some((name) => partyHP[name] > 0)) {
        markVesselAttackCleared(encounter);
        dependencies.startKrisTurn(encounter, partyHP);
        dependencies.skipFallenTurns(encounter, partyHP);
        pauseClearedVesselBattle(encounter);
        return true;
      }
      return changed;
    }
    if (
      snow.direction === 'knightSwords' ||
      snow.direction === 'knightCrossing' ||
      snow.direction === 'knightAimed'
    ) {
      snow.hitCooldown = Math.max(0, snow.hitCooldown - dt);
      const alive = (owner: 'roaring' | 'kaizo') => (encounter.knightEnemies?.[owner].hp ?? 0) > 0;
      const result =
        snow.direction === 'knightAimed'
          ? advanceAimedSwords(snow.knightAimed, dt, alive, soul)
          : snow.direction === 'knightCrossing'
            ? advanceCrossingSwords(snow.knightCrossing, dt, alive, soul)
            : advanceKnightSwords(snow.knightSwords, dt, alive, soul);
      let changed = false;
      if (snow.hitCooldown <= 0) {
        const hit =
          snow.direction === 'knightAimed'
            ? snow.knightAimed.swords.find((sword) =>
                crossingSwordTouches(sword, soul, battleSettings.soulWidth, battleSettings.soulHeight),
              )
            : snow.direction === 'knightCrossing'
              ? snow.knightCrossing.swords.find((sword) =>
                  crossingSwordTouches(sword, soul, battleSettings.soulWidth, battleSettings.soulHeight),
                )
              : (snow.knightSwords.swords.find(
                  (sword) =>
                    !sword.hitOpponent &&
                    swordTouchesSoul(
                      sword,
                      sword.owner === 'roaring' ? 1 : -1,
                      soul,
                      battleSettings.soulWidth,
                      battleSettings.soulHeight,
                    ),
                ) ??
                snow.knightSwords.minis.find((sword) =>
                  crossingSwordTouches(sword, soul, battleSettings.soulWidth, battleSettings.soulHeight),
                ));
        if (hit) {
          changed = dependencies.damageLivingTeammate(
            encounter,
            partyHP,
            projectileDamage(encounter, knightProjectileRules[hit.owner].partyDamage),
            hit.owner === 'roaring' ? 'Roaring Knight’s sword' : 'Kaizo Knight’s sword',
            random,
          );
          snow.hitCooldown = knightSwordSettings.hitCooldown;
        }
      }
      for (const sword of result.arrived) changed = hitOpposingKnight(encounter, sword) > 0 || changed;
      if (encounter.knightEnemies && Object.values(encounter.knightEnemies).every((enemy) => enemy.hp <= 0)) {
        encounter.phase = 'victory';
        encounter.turn = null;
        encounter.soul = encounter.snowAttack = null;
        encounter.message = 'Both knights are down.';
        return true;
      }
      if (result.finished) {
        dependencies.startKrisTurn(encounter, partyHP);
        dependencies.skipFallenTurns(encounter, partyHP);
        return true;
      }
      return changed;
    }
    if (snow.direction === 'undyne') {
      snow.hitCooldown = Math.max(0, snow.hitCooldown - dt);
      const result = advanceUndyneAttack(snow.undyne, dt);
      let changed = false;
      if (result.blocked) {
        gainBattleTP(encounter, result.blocked * snow.grazeTP, 'block');
        changed = true;
      }
      if (result.hits && snow.hitCooldown <= 0) {
        changed =
          dependencies.damageLivingTeammate(
            encounter,
            partyHP,
            projectileDamage(encounter, undyneSettings.damage),
            'Undyne’s spear',
            random,
          ) || changed;
        snow.hitCooldown = 0.5;
      }
      if (result.finished) {
        dependencies.startKrisTurn(encounter, partyHP);
        dependencies.skipFallenTurns(encounter, partyHP);
        return true;
      }
      return changed;
    }
    if (snow.direction === 'tvBolts') {
      snow.hitCooldown = Math.max(0, snow.hitCooldown - dt);
      const finished = advanceTvBolts(snow.tvBolts, dt, random);
      let changed = false;
      if (snow.hitCooldown <= 0 && snow.tvBolts.bolts.some((b) => boltTouches(b, soul))) {
        changed = dependencies.damageLivingTeammate(
          encounter,
          partyHP,
          projectileDamage(encounter, tvBoltSettings.damage),
          'a TV bolt',
          random,
        );
        snow.hitCooldown = tvBoltSettings.hitCooldown;
      }
      if (finished) {
        dependencies.startKrisTurn(encounter, partyHP);
        dependencies.skipFallenTurns(encounter, partyHP);
        return true;
      }
      return changed;
    }
    if (snow.direction === 'saxophones') {
      snow.hitCooldown = Math.max(0, snow.hitCooldown - dt);
      const finished = advanceSaxAttack(snow.saxophones, dt);
      let changed = false;
      if (
        snow.hitCooldown <= 0 &&
        (snow.saxophones.notes.some((n) => noteTouches(n, soul)) || saxRimTouches(snow.saxophones, soul))
      ) {
        changed = dependencies.damageLivingTeammate(
          encounter,
          partyHP,
          projectileDamage(encounter, saxSettings.damage),
          'a musical note',
          random,
        );
        snow.hitCooldown = saxSettings.hitCooldown;
      }
      if (finished) {
        dependencies.startKrisTurn(encounter, partyHP);
        dependencies.skipFallenTurns(encounter, partyHP);
        return true;
      }
      return changed;
    }
    if (snow.direction === 'dark') {
      snow.hitCooldown = Math.max(0, snow.hitCooldown - dt);
      const minisFinished =
        snow.darkPattern === 2
          ? advanceWarningSwords(present(snow.warningSwords), dt, soul)
          : advanceMiniSwords(snow.miniSwords, dt);
      const finished = snow.darkPattern === 0 ? advanceSwords(snow.swords, dt) : minisFinished;
      let changed = false;
      if (
        snow.hitCooldown <= 0 &&
        ((snow.warningSwords &&
          warningSwordTouches(
            snow.warningSwords,
            soul,
            battleSettings.soulWidth,
            battleSettings.soulHeight,
          )) ||
          snow.swords.swords.some((s) =>
            swordTouchesSoul(
              s,
              snow.swords.motion,
              soul,
              battleSettings.soulWidth,
              battleSettings.soulHeight,
            ),
          ) ||
          miniSwordHazards(snow.miniSwords, soul, battleSettings.soulWidth, battleSettings.soulHeight).some(
            (h) => h.hit,
          ))
      ) {
        changed = dependencies.damageLivingTeammate(
          encounter,
          partyHP,
          projectileDamage(encounter, swordSettings.damage),
          'a sword',
          random,
        );
        snow.hitCooldown = swordSettings.hitCooldown;
      }
      if (finished) {
        dependencies.startKrisTurn(encounter, partyHP);
        dependencies.skipFallenTurns(encounter, partyHP);
        return true;
      }
      return changed;
    }
    const { x, y, size, border } = battleArena,
      innerSize = size - border * 2,
      horizontal = snow.direction === 'right',
      farEdge = (horizontal ? x : y) + size - border,
      radius = battleSettings.snowballRadius;
    snow.hitCooldown = Math.max(0, snow.hitCooldown - dt);
    snow.contactFlash = Math.max(0, snow.contactFlash - dt);
    snow.impacts = snow.impacts.filter((impact) => (impact.age += dt) < 0.35);
    if (snow.endingAge !== null) {
      snow.endingAge += dt;
      if (snow.endingAge >= battleSettings.snowEndPause) {
        dependencies.startKrisTurn(encounter, partyHP);
        dependencies.skipFallenTurns(encounter, partyHP);
        return true;
      }
      return false;
    }
    if (snow.direction === 'snowgrave') {
      const spell = snow.snowgrave,
        before = snowgraveFrame(spell),
        previousSecond = Math.ceil(snowgraveDuration - spell.age);
      spell.age = Math.min(snowgraveDuration, spell.age + dt);
      if (spell.age >= snowgraveDuration - 1e-9) {
        dependencies.startKrisTurn(encounter, partyHP);
        dependencies.skipFallenTurns(encounter, partyHP);
        return true;
      }
      let changed = false;
      if (
        snow.hitCooldown <= 0 &&
        snowgraveTouchesSoul(spell, soul, battleSettings.soulWidth, battleSettings.soulHeight)
      ) {
        changed = dependencies.damageLivingTeammate(
          encounter,
          partyHP,
          projectileDamage(encounter, snowgraveSettings.damage),
          'Snowgrave',
          random,
        );
        snow.hitCooldown = snowgraveSettings.hitCooldown;
      }
      const after = snowgraveFrame(spell);
      return (
        changed ||
        before.stage !== after.stage ||
        before.index !== after.index ||
        Math.ceil(snowgraveDuration - spell.age) !== previousSecond
      );
    }
    if (snow.direction === 'goal') {
      const goal = snow.goal,
        previousSpeed = goalSpeed(goal);
      goal.age += dt;
      if (touchesGreenGoal(soul, battleSettings.soulWidth, battleSettings.soulHeight)) {
        snow.endingAge = 0;
        encounter.message = 'You reached the green marker! Your turn is next.';
        return true;
      }
      let changed = false;
      if (
        goal.age >= goalSettings.warmup &&
        snow.hitCooldown <= 0 &&
        goalSnowballs(goal).some((ball) => ball.active && snowballTouchesSoul(ball, soul, ball.radius))
      ) {
        changed = dependencies.damageLivingTeammate(
          encounter,
          partyHP,
          projectileDamage(encounter, goalSettings.damage),
          'a snowball',
          random,
        );
        snow.hitCooldown = battleSettings.soulHitCooldown;
      }
      return changed || goalSpeed(goal) !== previousSpeed;
    }
    if (snow.direction === 'crossing') {
      const crossing = snow.crossing,
        previousSecond = Math.ceil(crossingSettings.duration - crossing.age);
      crossing.age = Math.min(crossingSettings.duration, crossing.age + dt);
      if (crossing.age >= crossingSettings.duration) {
        snow.endingAge = 0;
        encounter.message = 'The snowballs stop. Your turn is next.';
        return true;
      }
      let changed = false;
      if (crossing.age >= crossingSettings.warmup && snow.hitCooldown <= 0) {
        const { large, small, spinning } = crossingHazards(crossing, battleArena),
          hit =
            large.some((ball) => snowballTouchesSoul(ball, soul, crossingSettings.largeRadius)) ||
            small.some((ball) => snowballTouchesSoul(ball, soul, crossingSettings.smallRadius)) ||
            spinning.some((ball) => snowballTouchesSoul(ball, soul, crossingSettings.spinnerRadius));
        if (hit) {
          changed = dependencies.damageLivingTeammate(
            encounter,
            partyHP,
            projectileDamage(encounter, bossAttackDamage(encounter, crossingSettings.damage)),
            'a snowball',
            random,
          );
          snow.hitCooldown = battleSettings.soulHitCooldown;
        }
      }
      return changed || Math.ceil(crossingSettings.duration - crossing.age) !== previousSecond;
    }
    if (snow.direction === 'orbit') {
      const orbit = snow.orbit,
        previousSecond = Math.ceil(orbitSettings.duration - orbit.age);
      advanceOrbitBox(orbit, soul, dt);
      dependencies.constrainSoul(encounter);
      if (orbit.age >= orbitSettings.duration) {
        snow.endingAge = 0;
        encounter.message = 'The ice stops spinning. Your turn is next.';
        return true;
      }
      let changed = false;
      if (orbit.age >= orbitSettings.warmup && snow.hitCooldown <= 0) {
        const { cube, balls } = orbitHazards(orbit),
          hitCube = cubeTouchesSoul(cube, soul, battleSettings.soulWidth, battleSettings.soulHeight),
          hitBall =
            !hitCube && balls.some((ball) => snowballTouchesSoul(ball, soul, orbitSettings.ballRadius));
        if (hitCube || hitBall) {
          changed = dependencies.damageLivingTeammate(
            encounter,
            partyHP,
            projectileDamage(
              encounter,
              bossAttackDamage(encounter, hitCube ? orbit.cubeDamage : orbitSettings.ballDamage),
            ),
            hitCube ? 'the ice cube' : 'an orbiting snowball',
            random,
          );
          snow.hitCooldown = battleSettings.soulHitCooldown;
          if (battlePartyNames(encounter).every((name) => partyHP[name] <= 0)) return changed;
        }
      }
      return (
        advanceSnowContact(encounter, partyHP, dt, random) ||
        changed ||
        Math.ceil(orbitSettings.duration - orbit.age) !== previousSecond
      );
    }
    if (snow.direction === 'path') {
      const previousSecond = Math.ceil(battleSettings.snowPathDuration - snow.pathAge);
      snow.pathAge = Math.min(battleSettings.snowPathDuration, snow.pathAge + dt);
      if (snow.pathAge >= battleSettings.snowPathDuration) {
        snow.endingAge = 0;
        encounter.message = 'The snow clears. Your turn is next.';
        return true;
      }
      return (
        advanceSnowContact(encounter, partyHP, dt, random) ||
        Math.ceil(battleSettings.snowPathDuration - snow.pathAge) !== previousSecond
      );
    }
    if (!snow.balls.length) {
      snow.nextWaveIn -= dt;
      if (snow.nextWaveIn <= 1e-9) {
        snow.waves++;
        const count = snow.buffed ? 5 : 3;
        snow.balls = Array.from({ length: count }, (_, lane) => {
          const offset = border + radius + ((lane + 0.2 + random() * 0.6) / count) * (innerSize - radius * 2);
          return {
            grazeLane: lane,
            x: horizontal ? x - radius - 8 : x + offset,
            y: horizontal ? y + offset : y - radius - 8,
            velocity: battleSettings.snowballSpeed,
            delay: snow.buffed && lane % 2 ? battleSettings.strongerWaveStagger : 0,
            hit: false,
          };
        });
      }
    }
    let changed = false;
    const hadBalls = snow.balls.length > 0;
    const falling = [];
    for (const ball of snow.balls) {
      if ((ball.delay ?? 0) > 1e-9) {
        ball.delay = Math.max(0, (ball.delay ?? 0) - dt);
        falling.push(ball);
        continue;
      }
      ball.velocity = Number(ball.velocity) + battleSettings.snowballGravity * dt;
      if (horizontal) ball.x += Number(ball.velocity) * dt;
      else ball.y += Number(ball.velocity) * dt;
      if (!ball.hit && snow.hitCooldown <= 0 && snowballTouchesSoul(ball, soul)) {
        if (
          dependencies.damageLivingTeammate(
            encounter,
            partyHP,
            projectileDamage(encounter, bossAttackDamage(encounter, battleSettings.snowballDamage)),
            'a snowball',
            random,
          )
        ) {
          ball.hit = true;
          snow.hitCooldown = battleSettings.soulHitCooldown;
          changed = true;
          if (battlePartyNames(encounter).every((name) => partyHP[name] <= 0)) return true;
        }
      }
      if (
        (horizontal ? ball.x : ball.y) + radius >=
        farEdge - Math.max(snow.height, battleSettings.snowBorderDepth)
      ) {
        snow.height = Math.min(innerSize / 2, snow.height + battleSettings.snowballPileHeight);
        snow.impacts.push({ x: ball.x, y: ball.y, age: 0 });
        changed = true;
      } else falling.push(ball);
    }
    snow.balls = falling;
    dependencies.constrainSoul(encounter);
    if (hadBalls && !snow.balls.length) snow.nextWaveIn = battleSettings.snowWaveDelay;
    if (snow.height >= innerSize / 2) {
      snow.balls = [];
      snow.endingAge = 0;
      encounter.message = 'The box is half full. The snowfall stops.';
      changed = true;
    } else changed = advanceSnowContact(encounter, partyHP, dt, random) || changed;
    return changed;
  }
  return { stepSnowAttack };
}
