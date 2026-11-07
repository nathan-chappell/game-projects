import { createKnightSwords } from '../knights/swords.ts';
import { createUndyneAttack } from '../tenna/undyne.ts';
import { createTvBolts } from '../tenna/tv-bolts.ts';
import { createMiniSwords } from '../dark/mini-swords.ts';
import { createSwordAttack } from '../dark/swords.ts';
import { createWarningSwords } from '../dark/warning-swords.ts';
import { createCrossingAttack } from '../noelle/crossing.ts';
import { createGoalAttack } from '../noelle/goal.ts';
import { createOrbitAttack } from '../noelle/orbit.ts';
import { createSnowgraveAttack } from '../noelle/snowgrave.ts';
import { createSaxAttack } from '../tenna/saxophones.ts';
import type { Arena, Attack, AttackBase, AttackDirection } from './types.ts';

/** Construct a complete variant so rules and drawing share the same geometry. */
export function createAttackState(
  direction: AttackDirection,
  grazeTP: number,
  buffed: boolean,
  arena: Arena,
  nextWaveIn: number,
  darkPattern = 0,
): Attack {
  const base: AttackBase = {
    direction,
    grazeTP,
    buffed,
    pathAge: 0,
    height: 0,
    balls: [],
    impacts: [],
    waves: 0,
    nextWaveIn,
    hitCooldown: 0,
    contactAge: 0,
    contactCooldown: 0,
    inSnow: false,
    contactFlash: 0,
    endingAge: null,
    grazeActive: false,
    grazeCooldown: 0,
  };
  switch (direction) {
    case 'knightSwords':
      return { ...base, direction, knightSwords: createKnightSwords(arena) };
    case 'orbit':
      return { ...base, direction, orbit: createOrbitAttack(buffed ? 'buffed' : 'normal') };
    case 'crossing':
      return { ...base, direction, crossing: createCrossingAttack(buffed) };
    case 'goal':
      return { ...base, direction, goal: createGoalAttack() };
    case 'snowgrave':
      return { ...base, direction, snowgrave: createSnowgraveAttack() };
    case 'undyne':
      return { ...base, direction, undyne: createUndyneAttack(arena) };
    case 'tvBolts':
      return { ...base, direction, tvBolts: createTvBolts(arena) };
    case 'saxophones':
      return { ...base, direction, saxophones: createSaxAttack(arena) };
    case 'dark': {
      // Preserve this construction order: the sword direction consumes randomness.
      const swords = createSwordAttack(arena);
      let miniSwords = createMiniSwords(arena, darkPattern === 1);
      const warningSwords = darkPattern === 2 ? createWarningSwords(arena) : undefined;
      if (warningSwords) miniSwords = warningSwords.minis;
      return { ...base, direction, darkPattern, swords, miniSwords, warningSwords };
    }
    default:
      return { ...base, direction };
  }
}
