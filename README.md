# Little Lantern

Lenny's adventure and room builder, written in plain JavaScript. Vite runs the development server and bundles the game for Sites and offline downloads. No framework or TypeScript is needed.

## Run it

Use Node.js **20.19+ or 22.12+**. The computer's installed Node 22.13 works.

```sh
npm install
npm run dev
```

Open **http://localhost:8082/**. Save a source file and Vite refreshes the game. Keep this terminal open while developing; stop it with Ctrl+C.

## Build and check

```sh
npm run build
npm test
```

The build creates:

- `dist/index.html`: the complete game, ready for static hosting with Sites.
- `exports/LittleLantern-Offline.html`: the same game as one playable HTML file.
- `exports/LittleLantern-Offline.zip`: a ZIP containing that HTML file.

`dist/` is generated and ignored by Git. The downloadable copies in `exports/` are kept in Git because this project already distributes them that way. Don't edit either output by hand; edit the source and rebuild.

After stopping the development server, `npm run preview` serves the built game at the same local address.

## Where things live

| File                           | What it does                                                  |
| ------------------------------ | ------------------------------------------------------------- |
| `index.html`                   | Page structure, buttons, menus, and the canvas                |
| `styles.css`                   | Colors, spacing, and phone layout                             |
| `src/main.js`                  | Starts the game and loads the styles                          |
| `src/config.js`                | Tile names, movement speed, HP, and healing-item settings     |
| `src/world.js`                 | Room layouts, validation, and upgrades for older saved worlds |
| `src/game.js`                  | Game state, movement, dialogue, saving, and story scenes      |
| `src/editor.js`                | Build tools, object editing, layers, and Undo                 |
| `src/sprites.js`               | Character, tree, and door drawings                            |
| `src/particles.js`             | Drifting particles and glitch pillars                         |
| `src/battle-rules.js`          | Attack damage, TP, turns, healing, and Proceed rules          |
| `src/battle-controls.js`       | Battle buttons, canvas taps, and keyboard controls            |
| `src/battle-unused-effects.js` | Archived soul and snowflake drawings for future attacks       |
| `src/battle.js`                | The Noelle encounter's appearance and HP cards                |
| `src/export-game.js`           | The in-game **Download game** button                          |
| `assets/`                      | Original image files used by the game                         |
| `scripts/build.js`             | Uses Vite to make the self-contained HTML and ZIP             |

There is deliberately one shared `state` object inside `startGame()`. The editor and drawing helpers receive it as an argument, so they see the same changing values. Room data stays separate from the code that draws it. There are no circular module imports.

## Saving and exporting

**Save build** keeps edited rooms in browser storage. Save points keep adventure progress in three separate slots. These storage names and data formats have been preserved so existing saves continue to load.

The **Download game** button includes the player's current Build edits. In a built or downloaded game, it copies the bundled page. During development, a small Vite-only endpoint builds the current source in a separate process before exporting it. This keeps the published site completely static and avoids copying incomplete module code into an offline file.

Browser storage belongs to a particular browser and address. A save at the published URL is separate from one at `localhost:8082`. Use **Download backup** / **Restore backup** to move Build edits. Do not clear storage to test a code change; use a separate browser profile if you need a fresh game.

## Sites

The existing Sites checkout is `../LittleLantern-Site`. Its `.openai/hosting.json` serves the `dist` directory and keeps the existing Site identity and access policy.

Build here first, then copy the generated `dist/` contents into that checkout's `dist/` before using the normal Sites source-helper and publishing workflow. A normal local build does not publish or change the other checkout. The deployed address stays the same, so updates keep that browser's saves.

## For Lenny

Start with [START-HERE.md](START-HERE.md). You don't need to understand every file to make a useful change. Try one small edit, play with it, and see what happened.

Vite reference: [getting started](https://vite.dev/guide/) and [building for production](https://vite.dev/guide/build.html).

## Battle work in progress

Kris acts first. Attack deals 75 HP to the 1,000-HP unknown enemy; Defend halves future projectile damage, and Item uses one carried healing item on an available teammate. SPARE stays frozen. Each successful action hands over to Flowey. Flowey’s actions, enemy attack patterns, and TP gains are still to be defined.

Proceed costs 100% TP on each of three separate Kris turns. Each use briefly shows the supplied memory image; after the third, Noelle disappears. `startKrisTurn` and `addTP` are hooks for the future turns, not player shortcuts. Completed encounters are included in normal adventure saves; older saves remain compatible.
