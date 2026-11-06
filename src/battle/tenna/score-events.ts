import { canPartyAct } from '../shared/availability.ts';
import type { Encounter } from '../shared/types.ts';
export function undyneActive(b: Encounter) {
  return b.kind === 'tenna' && !!b.undyneJoined && !b.undyneLeft && (b.score ?? 0) < 750;
}
export function queueTennaScoreEvent(b: Encounter) {
  if (b.kind !== 'tenna') return false;
  if ((b.score ?? 0) >= 1200) b.tennaHeadGlitch = true;
  if (!canPartyAct(b)) return false;
  const event =
    !b.undyneJoined && (b.score ?? 0) >= 500
      ? 'enter'
      : b.undyneJoined && !b.undyneLeft && (b.score ?? 0) >= 750
        ? 'leave'
        : null;
  if (!event) return false;
  b.guestResumePhase = b.phase;
  b.guestEvent = event;
  b.phase = 'tennaGuest';
  return true;
}
export function completeTennaScoreEvent(b: Encounter) {
  if (b.kind !== 'tenna' || b.phase !== 'tennaGuest') return false;
  if (b.guestEvent === 'enter') b.undyneJoined = true;
  else if (b.guestEvent === 'leave') b.undyneLeft = true;
  b.phase = b.guestResumePhase ?? 'kris';
  b.guestResumePhase = undefined;
  b.guestEvent = null;
  return true;
}
export function addTennaTestingPoints(b: Encounter, points: number) {
  if (b.kind !== 'tenna' || b.phase === 'victory') return false;
  b.score = (b.score ?? 0) + points;
  b.message = `+${points} points for playtesting.`;
  queueTennaScoreEvent(b);
  return true;
}
