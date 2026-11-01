import { readFileSync } from 'node:fs';
import { integer, record } from '../../src/world/validation.ts';
interface Route {
  commands: [string, number][];
}
interface BattleRoute extends Route {
  pattern: number;
  buffed: boolean;
  seed: number;
}
interface BlueRoute extends Route {
  waitSeconds: number;
}
function commands(value: unknown): value is [string, number][] {
  return (
    Array.isArray(value) &&
    value.every(
      (command: unknown) =>
        Array.isArray(command) &&
        command.length === 2 &&
        typeof command[0] === 'string' &&
        integer(command[1]) &&
        command[1] >= 0,
    )
  );
}
export function readBattleRoutes(): BattleRoute[] {
  const data: unknown = JSON.parse(
    readFileSync(new URL('./battle-safe-routes.json', import.meta.url), 'utf8'),
  );
  const valid = (value: unknown): value is BattleRoute =>
    record(value) &&
    integer(value.pattern) &&
    typeof value.buffed === 'boolean' &&
    integer(value.seed) &&
    commands(value.commands);
  if (!Array.isArray(data) || !data.every(valid)) throw new Error('Invalid battle-route fixture');
  return data;
}
export function readBlueRoutes(): BlueRoute[] {
  const data: unknown = JSON.parse(readFileSync(new URL('./blue-safe-routes.json', import.meta.url), 'utf8'));
  const valid = (value: unknown): value is BlueRoute =>
    record(value) && integer(value.waitSeconds) && commands(value.commands);
  if (!Array.isArray(data) || !data.every(valid)) throw new Error('Invalid blue-route fixture');
  return data;
}
