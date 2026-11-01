import { maxHP } from '../../game/config.ts';
import { present } from '../../game/invariants.ts';
import type { PartyHP } from '../../inventory/types.ts';
import type { Encounter } from '../shared/types.ts';

export const rescueSettings: Record<string, number> = {
  slash: 2,
  strike: 3,
  arrival: 0.85,
  heal: 1.8,
  escape: 1.4,
  battleEnd: 1,
  healedHP: 150,
};
export const rescueTextSpeeds: Record<string, number | undefined> = {
  ralseyWarning1: 24,
  ralseyWarning2: 10,
  refused: 24,
};

export function isRescueImportant(encounter: Encounter | null): boolean {
  return !!encounter?.rescue && ['rescue', 'kris', 'aftermath'].includes(encounter.phase);
}

export function rescueVisibleText(encounter: Encounter | null) {
  if (!encounter) return '';
  const line = rescueDialogue(encounter);
  if (!line) return '';
  return rescueTextSpeeds[present(encounter.rescue).stage]
    ? line.text.slice(0, Math.floor((present(encounter.rescue).textShown || 0) + 1e-9))
    : line.text;
}

export function rescueIsTyping(encounter: Encounter | null) {
  if (!encounter) return false;
  const line = rescueDialogue(encounter);
  return (
    !!line &&
    !!rescueTextSpeeds[present(encounter.rescue).stage] &&
    (present(encounter.rescue).textShown || 0) < line.text.length
  );
}
export function isSlashScreen(encounter: Encounter | null): boolean {
  return (
    encounter?.phase === 'rescue' &&
    encounter.rescue?.stage === 'strike' &&
    encounter.rescue.age < rescueSettings.slash
  );
}
export function isBattleEndScreen(encounter: Encounter | null): boolean {
  return encounter?.phase === 'rescue' && encounter.rescue?.stage === 'battleEnd';
}
export function isBattleBlackout(encounter: Encounter | null): boolean {
  return isSlashScreen(encounter) || isBattleEndScreen(encounter);
}
export const rescueConversation = [
  { speaker: 'Ralsey', text: 'Kris... she could barely stand. Why did you swing again?', angry: true },
  { speaker: 'Kris', text: 'She tried to freeze us.' },
  { speaker: 'Ralsey', text: 'The fight was over! You saw how hurt she was!', angry: true },
  { speaker: 'Kris', text: 'We thought she would attack again.' },
  {
    speaker: 'Ralsey',
    text: 'Then let me talk to her! You cannot solve everything with your sword!',
    angry: true,
  },
  { speaker: 'Ralsey', text: 'I trusted you, Kris. I need you to understand why I am angry.', angry: true },
  { speaker: 'Flowey', text: 'Noelle attacked first.' },
];

export const afterBattleConversation = [
  { speaker: 'Ralsey', text: 'Why did you try to attack me?' },
  { speaker: 'Kris', text: "... you won't understand." },
  { speaker: 'Susie', text: 'KRIS! WHAT THE $%#? WAS THAT!?!?' },
  { speaker: 'Kris', text: '...' },
];

export function isRalseyChoice(encounter: Encounter | null): boolean {
  return encounter?.phase === 'kris' && encounter.rescue?.stage === 'ralseyChoice';
}

function readyRalseyChoice(encounter: Encounter) {
  encounter.phase = 'kris';
  encounter.turn = 'Kris';
  encounter.screen = 'menu';
  encounter.selectedAction = 'attack';
  setStage(encounter, 'ralseyChoice');
}

export function attemptRalseyAttack(encounter: Encounter) {
  if (!isRalseyChoice(encounter)) return false;
  present(encounter.rescue).ralseyAttempts++;
  encounter.phase = 'rescue';
  encounter.turn = null;
  encounter.hitAge = null;
  setStage(
    encounter,
    present(encounter.rescue).ralseyAttempts === 1
      ? 'ralseyWarning1'
      : present(encounter.rescue).ralseyAttempts === 2
        ? 'ralseyWarning2'
        : 'refused',
  );
  return true;
}

export function healAfterSnowgrave(encounter: Encounter | null, partyHP?: PartyHP) {
  if (
    !encounter?.finalAttackComplete ||
    encounter.snowgravePartyHealed ||
    !Number.isFinite(partyHP?.Kris) ||
    !Number.isFinite(partyHP?.Flowey)
  )
    return false;
  for (const name of ['Kris', 'Flowey'] as const)
    present(partyHP)[name] = Math.min(maxHP, present(partyHP)[name] + 50);
  encounter.snowgravePartyHealed = true;
  return true;
}

export function rescueDialogue(encounter: Encounter | null) {
  if (encounter?.phase !== 'rescue') return null;
  switch (present(encounter.rescue).stage) {
    case 'question':
      return { speaker: 'Ralsey', text: 'Kris! What are you doing?!', angry: true };
    case 'release':
      return { speaker: 'Ralsey', text: 'Noelle, go! I will keep you safe.' };
    case 'talk':
      return rescueConversation[present(encounter.rescue).line];
    case 'ralseyWarning1':
      return { speaker: 'Ralsey', text: 'Wh-what ar-are you doing?' };
    case 'ralseyWarning2':
      return { speaker: 'Ralsey', text: "Kr-Kris?! You c-ca-can't do th-that to me?" };
    case 'refused':
      return { speaker: 'Narrator', text: 'but Kris refused' };
    default:
      return null;
  }
}

function setStage(encounter: Encounter, stage: string) {
  present(encounter.rescue).stage = stage;
  present(encounter.rescue).age = 0;
  present(encounter.rescue).textShown = 0;
  const line = rescueDialogue(encounter);
  encounter.message = line
    ? `${line.speaker}: ${rescueVisibleText(encounter)}`
    : ({
        strike: 'Kris strikes. Noelle falls to the ground.',
        arrival: 'Ralsey jumps into the battle!',
        heal: 'Ralsey casts healing magic on Noelle.',
        escape: 'Noelle escapes while Ralsey stands between her and Kris.',
        done: 'Noelle escaped.',
        ralseyChoice: 'Only ATTACK remains. Ralsey stands in front of Kris.',
        ended: 'but Kris refused',
        battleEnd: '',
      }[stage] ?? '');
}

export function beginRescue(encounter: Encounter) {
  encounter.phase = 'rescue';
  encounter.turn = null;
  encounter.screen = 'menu';
  encounter.enemy.hp = 0;
  encounter.hitAge = 0;
  encounter.hitActor = 'Kris';
  encounter.hitDamage = 1;
  encounter.repeatAttack = false;
  encounter.specialAttackQueued = false;
  encounter.rescue = { stage: 'strike', age: 0, line: 0, ralseyAttempts: 0 };
  setStage(encounter, 'strike');
}

export function advanceRescueDialogue(encounter: Encounter) {
  if (!rescueDialogue(encounter)) return false;
  const scene = encounter.rescue;
  if (rescueIsTyping(encounter)) return false;
  if (present(scene).stage === 'question') setStage(encounter, 'heal');
  else if (present(scene).stage === 'release') setStage(encounter, 'escape');
  else if (['ralseyWarning1', 'ralseyWarning2'].includes(present(scene).stage)) readyRalseyChoice(encounter);
  else if (present(scene).stage === 'refused') {
    setStage(encounter, 'battleEnd');
  } else if (present(scene).stage === 'talk') {
    if (++present(scene).line < rescueConversation.length) setStage(encounter, 'talk');
    else readyRalseyChoice(encounter);
  }
  return true;
}

export function advanceRescueTime(encounter: Encounter, dt: number) {
  if (encounter?.phase !== 'rescue' || !Number.isFinite(dt) || dt <= 0) return false;
  const scene = encounter.rescue,
    duration = rescueSettings[present(scene).stage];
  const line = rescueDialogue(encounter),
    textSpeed = rescueTextSpeeds[present(scene).stage];
  if (line && textSpeed) {
    const before = Math.floor((present(scene).textShown || 0) + 1e-9);
    present(scene).textShown = Math.min(line.text.length, (present(scene).textShown || 0) + dt * textSpeed);
    if (Math.abs(present(present(scene).textShown) - line.text.length) < 1e-9)
      present(scene).textShown = line.text.length;
    encounter.message = `${line.speaker}: ${rescueVisibleText(encounter)}`;
    return before !== Math.floor(present(present(scene).textShown) + 1e-9);
  }
  if (!duration) return false;
  const wasSlashScreen = isSlashScreen(encounter);
  present(scene).age = Math.min(duration, present(scene).age + dt);
  if (Math.abs(present(scene).age - rescueSettings.slash) < 1e-9) present(scene).age = rescueSettings.slash;
  if (present(scene).age < duration - 1e-9) return wasSlashScreen !== isSlashScreen(encounter);
  if (present(scene).stage === 'strike') setStage(encounter, 'arrival');
  else if (present(scene).stage === 'arrival') setStage(encounter, 'question');
  else if (present(scene).stage === 'heal') {
    encounter.enemy.hp = rescueSettings.healedHP;
    setStage(encounter, 'release');
  } else if (present(scene).stage === 'escape') {
    encounter.enemy.visible = false;
    encounter.noelleEscaped = true;
    setStage(encounter, 'talk');
  } else if (present(scene).stage === 'battleEnd') {
    setStage(encounter, 'ended');
    encounter.phase = 'aftermath';
  }
  return true;
}
