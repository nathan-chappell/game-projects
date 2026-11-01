import { present } from '../../game/invariants.ts';
import type { Encounter } from './types.ts';
// Access through a function after an action so TypeScript does not retain an
// earlier null-state narrowing across that action's mutation.
export const attackState = (battle: Encounter) => present(battle.snowAttack);
