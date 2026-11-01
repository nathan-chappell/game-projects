import { H, tiles, W } from '../game/config.ts';
import type { BuildSave, GlitchPoint, Npc, PlacedObject, Point, Project, Tree } from './types.ts';

export const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);
export const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
export const validColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const strings = (value: unknown, limit: number, length: number): value is string[] =>
  Array.isArray(value) &&
  value.length <= limit &&
  value.every((line) => typeof line === 'string' && line.length <= length);
const range = (value: unknown, max: number): value is number => integer(value) && value >= 0 && value < max;
export const validPoint = (value: unknown): value is Point =>
  record(value) && range(value.x, W) && range(value.y, H);
export const objectFields = [
  'npcs',
  'trees',
  'savePoints',
  'spikes',
  'jumpPads',
  'particlePoints',
  'glitchPoints',
] as const;
export const objectLayer = (object: PlacedObject) => object.renderLayer || 'normal';
export const validDrawStyle = (value: unknown): value is Pick<PlacedObject, 'renderLayer'> =>
  record(value) &&
  (value.renderLayer === undefined ||
    (typeof value.renderLayer === 'string' && ['normal', 'back', 'ground'].includes(value.renderLayer)));
export const validGlitchStyle = (value: unknown): value is GlitchPoint =>
  record(value) &&
  (value.shape === undefined || value.shape === 'pillar') &&
  (value.height === undefined || (integer(value.height) && value.height >= 1 && value.height <= 12)) &&
  (value.width === undefined || (integer(value.width) && value.width >= 1 && value.width <= 4));
const optionalPoints = (value: unknown, limit: number): value is PlacedObject[] | undefined =>
  value === undefined || (Array.isArray(value) && value.length <= limit && value.every(validPoint));
export const validTreeStyle = (value: unknown): value is Tree =>
  record(value) &&
  ['candy', 'tpElixirs'].every((key) => value[key] === undefined || range(value[key], 7)) &&
  ['canopyColor', 'accentColor', 'trunkColor'].every(
    (key) => value[key] === undefined || validColor(value[key]),
  );
export function validNpcs(value: unknown): value is Npc[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.length <= 24 &&
      new Set(value.map((n) => (record(n) ? n.id : undefined))).size === value.length &&
      value.every(
        (n: unknown) =>
          record(n) &&
          validPoint(n) &&
          typeof n.id === 'string' &&
          n.id.length <= 80 &&
          typeof n.sprite === 'string' &&
          ['frog', 'tenna', 'queen', 'jackenstein'].includes(n.sprite) &&
          typeof n.name === 'string' &&
          n.name.length > 0 &&
          n.name.length <= 32 &&
          strings(n.speech, 100, 1200) &&
          n.speech.length > 0,
      ))
  );
}
/** Validate serialized input before it enters the mutable runtime model. Keep legacy optional fields optional. */
export function validProject(value: unknown): value is Project {
  if (
    !record(value) ||
    value.version !== 2 ||
    value.id !== 'two-worlds-castle-v1' ||
    !finite(value.updatedAt) ||
    !Array.isArray(value.rooms) ||
    value.rooms.length < 2 ||
    value.rooms.length > 27
  )
    return false;
  const roomCount = value.rooms.length;
  return value.rooms.every((r: unknown) => {
    if (!record(r)) return false;
    return (
      objectFields.every(
        (field) => r[field] === undefined || (Array.isArray(r[field]) && r[field].every(validDrawStyle)),
      ) &&
      (r.glitchPoints === undefined ||
        (Array.isArray(r.glitchPoints) && r.glitchPoints.every(validGlitchStyle))) &&
      ['hideGoldenDoor', 'hideHole'].every((key) => r[key] === undefined || typeof r[key] === 'boolean') &&
      (r.backgroundColor === undefined || validColor(r.backgroundColor)) &&
      (r.jumpPads === undefined ||
        (Array.isArray(r.jumpPads) &&
          r.jumpPads.length <= W * H &&
          r.jumpPads.every(
            (pad: unknown) =>
              record(pad) &&
              validPoint(pad) &&
              range(pad.targetX, W) &&
              range(pad.targetY, H) &&
              (pad.targetRoom !== undefined || pad.x !== pad.targetX || pad.y !== pad.targetY) &&
              (pad.targetRoom === undefined || range(pad.targetRoom, roomCount)) &&
              (pad.launchX === undefined || range(pad.launchX, W)) &&
              (pad.launchY === undefined || range(pad.launchY, H)),
          ))) &&
      optionalPoints(r.spikes, W * H) &&
      (r.tileColors === undefined ||
        (record(r.tileColors) &&
          Object.keys(r.tileColors).length <= W * H &&
          Object.entries(r.tileColors).every(
            ([key, color]) => /^\d{1,2},\d{1,2}$/.test(key) && validColor(color),
          ))) &&
      (r.trees === undefined || (optionalPoints(r.trees, 48) && r.trees.every(validTreeStyle))) &&
      optionalPoints(r.particlePoints, W * H) &&
      optionalPoints(r.glitchPoints, W * H) &&
      optionalPoints(r.savePoints, W * H) &&
      validNpcs(r.npcs) &&
      typeof r.name === 'string' &&
      r.name.length <= 32 &&
      typeof r.theme === 'string' &&
      ['room', 'garden', 'castle', 'dark'].includes(r.theme) &&
      Array.isArray(r.map) &&
      r.map.length === H &&
      r.map.every(
        (row: unknown) => Array.isArray(row) && row.length === W && row.every((t) => range(t, tiles.length)),
      ) &&
      validPoint(r.spawn) &&
      validPoint(r.flowey) &&
      strings(r.dialogue, 100, 1200) &&
      integer(r.target) &&
      r.target >= -1 &&
      r.target < roomCount &&
      (!r.doorLinks ||
        (record(r.doorLinks) &&
          Object.entries(r.doorLinks).every(([key, v]) => /^\d+,\d+$/.test(key) && range(v, roomCount))))
    );
  });
}
export const validBuild = (value: unknown): value is BuildSave =>
  record(value) &&
  value.format === 'little-lantern-build' &&
  value.version === 1 &&
  finite(value.savedAt) &&
  validProject(value.project);
