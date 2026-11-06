import { knightEncounterActive } from '../rooms/post-show/knight-choreography.ts';
import type { Elements } from './dom.ts';
import { present } from './invariants.ts';
import type { GameState } from './types.ts';

interface Dependencies {
  readonly canvas: HTMLCanvasElement;
  readonly state: GameState;
  readonly $: Elements;
  readonly choiceDialogOpen: () => boolean;
  readonly dirKeys: Record<string, string>;
  readonly talk: () => void;
  readonly importantKinds: Set<string>;
  readonly advanceDialogue: () => void;
  readonly closeDialogue: () => void;
  readonly isImportantCutscene: () => boolean;
  readonly skipDialogue: () => void;
  readonly inspectObject: () => void;
  readonly endStroke: () => void;
}

export function createInput(dependencies: Dependencies) {
  const state = dependencies.state;

  function bindGameInput() {
    dependencies.canvas.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (state.mode === 'build' && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          dependencies.$('undoButton').click();
        }
        return;
      }
      if (
        (knightEncounterActive(state) && !state.dialogue) ||
        state.death ||
        state.holeFall ||
        state.padJump ||
        dependencies.choiceDialogOpen() ||
        state.mode !== 'play' ||
        dependencies.$('saveDialog').open ||
        dependencies.$('inventoryDialog').open
      )
        return;
      if (dependencies.dirKeys[e.key]) {
        e.preventDefault();
        state.keys.add(dependencies.dirKeys[e.key]);
      }
      if (['z', 'Z', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) dependencies.talk();
      }
      if (['x', 'X', 'Escape'].includes(e.key)) {
        e.preventDefault();
        if (
          state.dialogue &&
          (dependencies.importantKinds.has(state.dialogue.kind) ||
            ['intro', 'worlds'].includes(state.dialogue.kind ?? ''))
        )
          dependencies.advanceDialogue();
        else dependencies.closeDialogue();
      }
    });
    // Game shortcuts work even when the canvas has not been clicked yet.
    document.addEventListener('keydown', (e) => {
      if (
        !['c', 'C', 'l', 'L', 'f', 'F'].includes(e.key) ||
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.isComposing
      )
        return;
      const typing = (node: EventTarget | null) =>
        node instanceof HTMLElement &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName) ||
          node.isContentEditable ||
          node.closest?.('[contenteditable="true"],[contenteditable=""]'));
      if (
        state.death ||
        state.holeFall ||
        state.padJump ||
        dependencies.choiceDialogOpen() ||
        state.mode !== 'play' ||
        dependencies.$('helpDialog').open ||
        dependencies.$('saveDialog').open ||
        dependencies.$('inventoryDialog').open ||
        typing(e.target) ||
        typing(document.activeElement)
      )
        return;
      e.preventDefault();
      if (e.key.toLowerCase() === 'f') {
        if (
          !state.dialogue &&
          !state.bossEncounter &&
          state.story.emerging < 0 &&
          state.story.discussion < 0 &&
          !dependencies.isImportantCutscene()
        ) {
          dependencies.canvas.focus({ preventScroll: true });
          state.keys.add('sprint');
        }
        return;
      }
      if (e.repeat) return;
      dependencies.canvas.focus({ preventScroll: true });
      if (e.key.toLowerCase() === 'l') dependencies.skipDialogue();
      else dependencies.inspectObject();
    });
    window.addEventListener('keyup', (e) => {
      if (dependencies.dirKeys[e.key]) state.keys.delete(dependencies.dirKeys[e.key]);
      if (e.key.toLowerCase() === 'f') state.keys.delete('sprint');
    });
    window.addEventListener('blur', () => {
      state.keys.clear();
      dependencies.endStroke();
    });
    dependencies.canvas.addEventListener('blur', () => state.keys.clear());
    document.addEventListener('visibilitychange', () => state.keys.clear());
    document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        if (state.mode !== 'play') return;
        e.preventDefault();
        dependencies.canvas.focus({ preventScroll: true });
        b.setPointerCapture(e.pointerId);
        state.keys.add(present(b.dataset.dir));
      });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
        b.addEventListener(event, () => state.keys.delete(present(b.dataset.dir)));
      b.addEventListener('keydown', (e) => {
        if (['Enter', ' '].includes(e.key)) {
          e.preventDefault();
          state.keys.add(present(b.dataset.dir));
        }
      });
      b.addEventListener('keyup', () => state.keys.delete(present(b.dataset.dir)));
      b.addEventListener('blur', () => state.keys.delete(present(b.dataset.dir)));
    });
    const sprintButton = dependencies.$('sprintButton');
    function startSprint(e: PointerEvent | KeyboardEvent) {
      if (
        state.mode !== 'play' ||
        state.bossEncounter ||
        state.dialogue ||
        dependencies.isImportantCutscene() ||
        state.death ||
        state.holeFall ||
        state.padJump ||
        dependencies.choiceDialogOpen() ||
        dependencies.$('helpDialog').open ||
        dependencies.$('saveDialog').open ||
        dependencies.$('inventoryDialog').open
      )
        return;
      e.preventDefault();
      if ('pointerId' in e) {
        dependencies.canvas.focus({ preventScroll: true });
        sprintButton.setPointerCapture(e.pointerId);
      }
      state.keys.add('sprint');
    }
    sprintButton.addEventListener('pointerdown', startSprint);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'] as const)
      sprintButton.addEventListener(event, () => state.keys.delete('sprint'));
    sprintButton.addEventListener('keydown', (e) => {
      if (['Enter', ' '].includes(e.key)) startSprint(e);
    });
    sprintButton.addEventListener('keyup', (e) => {
      if (['Enter', ' '].includes(e.key)) {
        e.preventDefault();
        state.keys.delete('sprint');
      }
    });
  }

  return { bindGameInput };
}
