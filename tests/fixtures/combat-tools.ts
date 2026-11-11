// Automation-only state setup; this module is never imported by the game.
import type { Encounter } from '../../src/battle/shared/types.ts';
import { canPartyAct, canControlSoul } from '../../src/battle/shared/availability.ts';
import { beginEnemyAttack } from '../../src/battle/shared/rules.ts';
import { gainBattleTP } from '../../src/battle/shared/resources.ts';
import { battleSettings } from '../../src/battle/shared/settings.ts';
import { queueTennaScoreEvent } from '../../src/battle/tenna/score-events.ts';
import { tennaEndingPhases } from '../../src/battle/tenna/ending.ts';
export function toggleRepeatAttack(encounter: Encounter | null) {
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  if (encounter.snowAttack?.direction === 'snowgrave' || encounter.finalAttackComplete) return false;
  encounter.repeatAttack = !encounter.repeatAttack;
  encounter.message = encounter.repeatAttack
    ? 'Repeat attack ON. Finish Kris and Flowey’s turns to replay the same attack.'
    : 'Repeat attack OFF. Noelle will continue to the next attack.';
  return true;
}
export function toggleInvincibility(encounter: Encounter | null) {
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  encounter.invincible = !encounter.invincible;
  if (encounter.snowAttack) {
    encounter.snowAttack.hitCooldown = 0;
    encounter.snowAttack.contactFlash = 0;
    encounter.snowAttack.contactAge = 0;
    encounter.snowAttack.contactCooldown = 0;
    encounter.snowAttack.inSnow = false;
  }
  encounter.message = `Invincibility ${encounter.invincible ? 'ON' : 'OFF'}.`;
  return true;
}
export function toggleFastKill(encounter: Encounter | null) {
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  encounter.fastKill = !encounter.fastKill;
  encounter.message = `Fast kill ${encounter.fastKill ? 'ON. Attacks deal 1,000 damage.' : 'OFF. Normal damage restored.'}`;
  return true;
}
export function fillTPForTesting(encounter: Encounter | null) {
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  gainBattleTP(encounter, battleSettings.maxTP, 'test');
  encounter.message = 'TP filled to 100% for playtesting.';
  return true;
}
export function requestSpecialAttack(encounter: Encounter | null) {
  if (['dark', 'tenna', 'knights', 'vessel'].includes(encounter?.kind ?? '')) return false;
  if (!encounter || (!canPartyAct(encounter) && !canControlSoul(encounter))) return false;
  if (encounter.snowAttack?.direction === 'snowgrave' || encounter.finalAttackComplete) return false;
  encounter.repeatAttack = false;
  if (canControlSoul(encounter)) {
    beginEnemyAttack(encounter, 'goal', 'Special attack started for playtesting.');
  } else {
    encounter.specialAttackQueued = true;
    encounter.message =
      'Special attack queued. Finish the party’s turns, then reach the green goal to unlock buffed attacks.';
  }
  return true;
}

export function addTennaTestingPoints(b: Encounter, points: number) {
  if (b.kind !== 'tenna' || b.phase === 'victory' || tennaEndingPhases.includes(b.phase)) return false;
  b.score = (b.score ?? 0) + points;
  b.message = `+${points} points for playtesting.`;
  queueTennaScoreEvent(b);
  return true;
}
