import { createEncounter, startKrisTurn } from '../../battle/shared/rules.ts';
export const finaleConversation = [
  {
    speaker: 'Tenna',
    text: 'Splendid! Both Physical challenges are complete! Welcome back, my favourite contestants!',
  },
  { speaker: 'Tenna', text: 'Now for the FINALE!!! Your final challenge is... fighting ME!' },
  { speaker: 'Susie', text: 'Seriously? We came here for help!' },
  {
    speaker: 'Tenna',
    text: 'And what better way to help than with one last spectacular show? Get ready for TV TIME!!!',
  },
];
export function createTennaEncounter() {
  const b = createEncounter();
  b.kind = 'tenna';
  b.score = 0;
  b.enemy.name = 'Tenna';
  b.enemy.hp = b.enemy.maxHP = 4000;
  startKrisTurn(b);
  b.message = 'The Finale begins! Tenna takes the stage.';
  return b;
}
