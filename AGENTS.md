# Working on Little Lantern

## Project

Little Lantern is a plain JavaScript canvas adventure with a room editor. Vite serves development builds; the packaging script produces a self-contained offline game. Keep the existing JavaScript/ES-module approach. Read `README.md` for the current story, controls, and development workflow.

## Commands

- Use Node.js 20.19+ or 22.12+ and install dependencies with `npm install`.
- `npm run dev` serves the game at `http://localhost:8082/`.
- `npm test` runs the Node test suite.
- `npm run build` generates `dist/index.html` and the tracked offline HTML/ZIP in `exports/`.
- `node scripts/build.js --stdout` builds to stdout without replacing the distributed exports.
- Run `git diff --check` before committing.

When working from WSL, use the installed Windows Node/npm if the local dependencies were installed on Windows. Do not replace dependencies or stop an existing development server just to switch environments.

## Code organization

- `src/game.js` owns the shared runtime state, story transitions, dialogue, and save/load integration.
- `src/world.js` owns room data, validation, and upgrades for older Builds. Room-specific modules hold layouts and conversations.
- `src/battle-rules.js` owns battle turns, actions, damage, TP, and encounter transitions. Keep encounter-specific behavior scoped to its `kind`.
- Attack modules hold timing and collision geometry; drawing modules render them. Share geometry between visible hazards, damage detection, and grazing.
- `src/battle-controls.js` connects buttons, keyboard, and canvas input to the same battle rules.
- `src/renderer.js`, `src/sprites.js`, and drawing modules render the game. Keep new visual work consistent with its pixel-art style.
- `src/config.js` defines shared items and settings. Both exploration and battle inventory must use the same item definitions.
- Keep source assets and their generation prompts in `assets/`. Preserve intentionally archived attack versions in `archive/`.

## Preserve player work and saves

- Preserve the user's cumulative changes, edited rooms, inventory, and story progress. Do not reset builds or clear browser storage to test changes.
- Test browser flows in an isolated browser context/profile.
- Make world upgrades idempotent and preserve custom Build edits and room connections.
- New saved story fields must be optional for old saves and wired into validation, saving, loading, and adventure restart defaults.
- Verify one-time rewards cannot be collected again after consumption, re-entry, or save/load.
- Keep Noelle, the dark Jackenstein encounter, and Tenna's Finale separate. New boss behavior must not trigger another boss's cutscenes or attack patterns.
- Preserve existing shortcuts unless the user requests a change; consult the README for their current mapping.

## Validation and delivery

- Add or update focused tests for meaningful gameplay changes: damage/cooldowns, turns, encounter transitions, item consumption, save compatibility, and reachable dodge gaps.
- For attack changes, check that visuals match hitboxes, downed teammates are excluded from damage, and attacks end cleanly. Check timing at multiple frame rates when relevant.
- For UI/visual changes, inspect the running game and exercise the actual controls when browser tools are available. Do not claim browser verification unless performed.
- Run the relevant tests and build before delivery. Regenerate tracked `exports/` with the build when preparing a distributed update; never hand-edit generated output. Keep `dist/` and `node_modules/` out of Git.
- Update the README when controls, story progression, or developer workflows change.
- Commit and push when requested. Publishing the hosted Site is a separate operation; a local build or Git push does not deploy it.
