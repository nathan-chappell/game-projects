import assert from 'node:assert/strict';
import test from 'node:test';
import { buildKey, keyName } from '../game/config.ts';
import { defaults } from '../rooms/castle/starter.ts';
import { readInitialProject } from './initial-project.ts';

const store = (data: Record<string, string>): Pick<Storage, 'getItem'> => ({
  getItem: (key) => data[key] ?? null,
});

test('newer browser projects win, and dedicated Build saves take final priority', () => {
  const embedded = defaults();
  embedded.updatedAt = 20;
  embedded.rooms[0].name = 'Embedded';
  const stored = defaults();
  stored.updatedAt = 30;
  stored.rooms[0].name = 'Stored';
  const build = defaults();
  build.updatedAt = 10;
  build.rooms[0].name = 'Dedicated Build';
  assert.equal(
    readInitialProject(JSON.stringify(embedded), store({ [keyName]: JSON.stringify(stored) })).rooms[0].name,
    'Stored',
  );
  assert.equal(
    readInitialProject(
      JSON.stringify(embedded),
      store({
        [keyName]: JSON.stringify(stored),
        [buildKey]: JSON.stringify({
          format: 'little-lantern-build',
          version: 1,
          savedAt: 1,
          project: build,
        }),
      }),
    ).rooms[0].name,
    'Dedicated Build',
  );
  stored.updatedAt = 20;
  assert.equal(
    readInitialProject(JSON.stringify(embedded), store({ [keyName]: JSON.stringify(stored) })).rooms[0].name,
    'Embedded',
  );
});

test('malformed or unavailable browser storage never prevents loading the embedded world', () => {
  const embedded = defaults();
  embedded.rooms[0].name = 'Offline world';
  const unavailable = {
    getItem: () => {
      throw new Error('storage denied');
    },
  };
  assert.equal(readInitialProject(JSON.stringify(embedded), unavailable).rooms[0].name, 'Offline world');
  assert.equal(
    readInitialProject(JSON.stringify(embedded), store({ [keyName]: 'broken', [buildKey]: '[]' })).rooms[0]
      .name,
    'Offline world',
  );
  assert.equal(readInitialProject('invalid', unavailable).rooms[0].name, 'The Waking Chamber');
});
