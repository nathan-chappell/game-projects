import { keyName } from '../game/config.ts';
import { defaults } from '../rooms/castle/starter.ts';
import type { Project } from '../world/types.ts';
import { upgradeProject } from '../world/upgrades.ts';
import { validProject } from '../world/validation.ts';
import { readSavedBuild } from './build.ts';

/** A dedicated Build wins over embedded/downloaded data and adventure snapshots. */
export function readInitialProject(embedded: string, storage?: Pick<Storage, 'getItem'>): Project {
  let project = defaults();
  try {
    const parsed: unknown = JSON.parse(embedded);
    if (validProject(parsed)) project = parsed;
  } catch {
    /* A missing embedded project starts a fresh world. */
  }
  try {
    const stored: unknown = JSON.parse((storage ?? localStorage).getItem(keyName) ?? 'null');
    if (validProject(stored) && stored.updatedAt > project.updatedAt) project = stored;
  } catch {
    /* File URLs may not provide storage; offline play still works. */
  }
  const build = readSavedBuild(storage);
  if (build) project = build.project;
  return upgradeProject(project);
}
