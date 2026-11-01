import { buildKey } from '../game/config.ts';
import { validBuild } from '../world/validation.ts';

export function readSavedBuild(storage?: Pick<Storage, 'getItem'>) {
  try {
    const build: unknown = JSON.parse((storage ?? localStorage).getItem(buildKey) ?? 'null');
    return validBuild(build) ? build : null;
  } catch {
    return null;
  }
}
