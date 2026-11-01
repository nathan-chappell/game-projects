import { miniSwordHazards } from '../dark/mini-swords.ts';
import { swordTouchesSoul } from '../dark/swords.ts';
import { warningSwordTouches } from '../dark/warning-swords.ts';
import { crossingHazards, crossingSettings } from '../noelle/crossing.ts';
import { goalSettings, goalSnowballs } from '../noelle/goal.ts';
import { cubeTouchesSoul, orbitHazards, orbitSettings } from '../noelle/orbit.ts';
import { snowgraveFrame, snowgraveTouchesSoul } from '../noelle/snowgrave.ts';
import { noteTouches } from '../tenna/saxophones.ts';
import type { battleSettings } from './settings.ts';
import type { Arena, Encounter, Snowball } from './types.ts';

// Proximity drives both the persistent halo and the shared half-second TP timer.
export function isGrazingHazard(encounter: Encounter, settings: typeof battleSettings, arena: Arena) {
  const snow = encounter.snowAttack,
    soul = encounter.soul;
  if (encounter.phase !== 'enemy' || !snow || !soul || snow.endingAge !== null) return false;
  const { soulWidth: width, soulHeight: height, grazeDistance: margin } = settings,
    hazards = [];
  const circle = (ball: Pick<Snowball, 'x' | 'y' | 'hit'>, radius: number) => {
    const dx = Math.max(0, Math.abs(ball.x - soul.x) - width / 2),
      dy = Math.max(0, Math.abs(ball.y - soul.y) - height / 2),
      distance = dx * dx + dy * dy;
    hazards.push({ hit: distance <= radius * radius, near: !ball.hit && distance <= (radius + margin) ** 2 });
  };
  if (snow.direction === 'saxophones') {
    for (const n of snow.saxophones.notes)
      hazards.push({
        hit: noteTouches(n, soul, width, height),
        near: noteTouches(n, soul, width, height, margin),
      });
  } else if (snow.direction === 'dark') {
    if (snow.warningSwords)
      hazards.push({
        hit: warningSwordTouches(snow.warningSwords, soul, width, height),
        near: warningSwordTouches(snow.warningSwords, soul, width, height, margin),
      });
    hazards.push(...miniSwordHazards(snow.miniSwords, soul, width, height, margin));
    for (const ball of snow.balls) circle(ball, ball.radius ?? settings.snowballRadius);
    if (snow.swords)
      for (const sword of snow.swords.swords)
        hazards.push({
          hit: swordTouchesSoul(sword, snow.swords.motion, soul, width, height),
          near: swordTouchesSoul(sword, snow.swords.motion, soul, width, height, margin),
        });
  } else if (snow.direction === 'down' || snow.direction === 'right') {
    for (const ball of snow.balls) {
      if (!((ball.delay ?? 0) > 1e-9)) circle(ball, settings.snowballRadius);
    }
    // The safe rectangle shrinks only at the growing bank. Its other edges are
    // the fixed snow borders, using the same surfaces as snow damage detection.
    const { x, y, size, border } = arena,
      rim = settings.snowBorderDepth,
      bank = Math.max(rim, snow.height),
      left = x + border + rim,
      top = y + border + rim,
      right = x + size - border - (snow.direction === 'right' ? bank : rim),
      bottom = y + size - border - (snow.direction === 'down' ? bank : rim),
      clearance = Math.min(
        soul.x - width / 2 - left,
        right - soul.x - width / 2,
        soul.y - height / 2 - top,
        bottom - soul.y - height / 2,
      );
    hazards.push({ hit: clearance < 0, near: clearance <= margin });
  } else if (snow.direction === 'orbit' && snow.orbit.age >= orbitSettings.warmup) {
    const { cube, balls } = orbitHazards(snow.orbit);
    hazards.push({
      hit: cubeTouchesSoul(cube, soul, width, height),
      near: cubeTouchesSoul(cube, soul, width + margin * 2, height + margin * 2),
    });
    balls.forEach((ball) => circle(ball, orbitSettings.ballRadius));
  } else if (snow.direction === 'crossing' && snow.crossing.age >= crossingSettings.warmup) {
    const { large, small, spinning } = crossingHazards(snow.crossing, arena);
    large.forEach((ball) => circle(ball, crossingSettings.largeRadius));
    small.forEach((ball) => circle(ball, crossingSettings.smallRadius));
    spinning.forEach((ball) => circle(ball, crossingSettings.spinnerRadius));
  } else if (snow.direction === 'goal' && snow.goal.age >= goalSettings.warmup) {
    goalSnowballs(snow.goal).forEach((ball) => {
      if (ball.active) circle(ball, ball.radius);
    });
  } else if (snow.direction === 'snowgrave') {
    const spell = snow.snowgrave,
      frame = snowgraveFrame(spell);
    if (frame.stage === 'eruption')
      hazards.push({
        hit: snowgraveTouchesSoul(spell, soul, width, height),
        near: snowgraveTouchesSoul(spell, soul, width + margin * 2, height + margin * 2),
      });
  }
  return !hazards.some((hazard) => hazard.hit) && hazards.some((hazard) => hazard.near);
}

export function advanceGrazing(
  encounter: Encounter,
  settings: typeof battleSettings,
  arena: Arena,
  dt: number,
) {
  const snow = encounter.snowAttack;
  if (!snow) return 0;
  snow.grazeActive = isGrazingHazard(encounter, settings, arena);
  snow.grazeCooldown = Math.max(0, snow.grazeCooldown - dt);
  if (!snow.grazeActive || snow.grazeCooldown > 1e-9) return 0;
  // One award across all nearby hazards; changing objects or briefly stepping
  // away cannot bypass the cooldown. The same object can keep awarding TP.
  snow.grazeCooldown = settings.grazeInterval;
  return 1;
}
