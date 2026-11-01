import type { GameState, UndoEntry } from '../game/types.ts';
import { clone } from '../world/clone.ts';

export function rememberProject(state: Pick<GameState, 'project' | 'roomIndex' | 'undoStack'>): void {
  state.undoStack.push({ project: clone(state.project), roomIndex: state.roomIndex });
  if (state.undoStack.length > 25) state.undoStack.shift();
}

/** Undo must not replace a newer adventure saved after its save star was removed. */
export function restoreLinkedSaves(slots: unknown[], removed: NonNullable<UndoEntry['removedSaves']>): void {
  for (const saved of removed) if (slots[saved.index] === null) slots[saved.index] = saved.slot;
}
