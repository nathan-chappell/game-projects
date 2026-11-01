import frightenedURL from '../assets/noelle-frightened.png?inline';
import { rescueDialogue, isBattleBlackout, rescueVisibleText, rescueIsTyping } from './battle-aftermath.js';
import { createBattleCharacterSprites } from './battle-character-sprites.js';
import { isProceedScene, proceedDialogue } from './battle-proceed.js';

// Use the same dialogue box as ordinary conversations without pausing the scene's animation.
export function createBattleDialogue(state, $) {
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 88;
  const ctx = canvas.getContext('2d'), sprites = createBattleCharacterSprites(ctx, () => true);
  ctx.imageSmoothingEnabled = false;
  const noelle = new Image(); noelle.src = frightenedURL;
  noelle.onload = () => { if ($('dialogue').dataset.battleScene) sync(); };

  function sync() {
    const encounter = state.bossEncounter, root = $('dialogue');
    if ((encounter?.phase !== 'rescue' && !proceedDialogue(encounter)) || isBattleBlackout(encounter) || state.dialogue || state.death) {
      if (root.dataset.battleScene) {
        delete root.dataset.battleScene;
        root.classList.remove('battle-dialogue', 'symbol-portrait', 'text-only');
        root.hidden = !state.dialogue;
        if (!state.dialogue) $('speakerPortrait').textContent = '';
      }
      return;
    }
    const proceeding = isProceedScene(encounter),
      stage = encounter.rescue?.stage, line = proceeding ? proceedDialogue(encounter) : rescueDialogue(encounter),
      speaker = line?.speaker || (['strike','arrival'].includes(stage) ? 'Noelle' : 'Ralsey');
    root.dataset.battleScene = 'true';
    root.classList.add('battle-dialogue'); root.hidden = false;
    root.classList.toggle('text-only', proceeding);
    root.classList.toggle('symbol-portrait', ['Ralsey', 'Narrator'].includes(speaker));
    $('speakerName').textContent = speaker;
    if (proceeding) $('speakerPortrait').replaceChildren();
    else if (speaker === 'Ralsey' || speaker === 'Narrator') {
      $('speakerPortrait').textContent = speaker === 'Ralsey' ? '♧' : '◇';
      $('speakerPortrait').style.color = speaker === 'Ralsey' ? '#99dfb5' : '#d1ccdc';
    } else $('speakerPortrait').replaceChildren(canvas);
    ctx.clearRect(0,0,96,88);
    if (speaker === 'Noelle') {
      if (!proceeding && noelle.complete && noelle.naturalWidth) ctx.drawImage(noelle,0,8,96,72);
    } else if (!['Ralsey', 'Narrator'].includes(speaker)) sprites.portrait(speaker, !!line?.angry);
    $('dialogueText').textContent = '* ' + (line ? proceeding ? line.text : rescueVisibleText(encounter) : (['strike','arrival'].includes(stage) ? '...'
      : stage === 'heal' ? 'A warm light surrounds Noelle.' : 'Noelle runs from the battle.'));
    $('dialogueNext').textContent = (line ? rescueIsTyping(encounter)
      ? '...' : 'C / Z / Enter or click to continue ▾' : '...') + ' · I. C. · cannot skip';
  }
  return { sync };
}
