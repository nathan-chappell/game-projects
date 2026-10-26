# Lenny, try a tiny code change

Your game already has lots of ideas in it. Learning a little code lets you change how those ideas work, as well as changing rooms in Build. You don't need to memorize the whole game.

There are three main kinds of files:

- **HTML** lists what's on the page: a button, a heading, a menu.
- **CSS** describes how the page looks: colors, sizes, and spacing.
- **JavaScript** describes what happens: moving, talking, healing, and saving.

Vite is a helper that combines these files into the game you open. Nate can help you run `npm run dev` to start it.

## First experiment: walking speed

Open `src/config.js` and find:

```js
const movementSpeed = 135;
```

`movementSpeed` is a name for the number `135`. This number means pixels moved in one second. Try changing **135 to 150**, save the file, and walk around. Does Kris feel a little faster? Change it back whenever you want.

The `const` word means this named setting won't be reassigned while the game runs. You can still edit the number in the source file and restart the game.

## A value that changes while you play

In `src/game.js`, you'll see things like:

```js
state.player.x;
```

`state` is the game's notebook. `player` is a group of facts about Kris, and `x` is his position from left to right. A bigger `x` moves him farther right. `y` is his position from top to bottom.

The game changes these values as you walk. You don't have to change them by hand.

## A function is a recipe

This is a small example, not code you need to paste:

```js
function sayHello() {
  console.log('Hello, Lenny!');
}

sayHello();
```

The first part names the recipe. `sayHello()` runs it. `console.log` puts a message in the browser's developer console. In the game, recipes have names such as `drawPlayer` or `takeTreeCandy`.

## Files can share recipes

The small `src/main.js` file says:

```js
import { startGame } from './game.js';
startGame();
```

`import` means “use this from another file.” In `game.js`, `export` makes the recipe available to other files. This lets us keep related code together instead of putting everything in one enormous file.

## Another experiment: a button color

In `styles.css`, find:

```css
--accent: #d3bcff;
```

Try `#7fe4cf` instead. Open Build and look at the buttons. The letters and numbers after `#` describe a color. Save the file to see your change, then try going back to the old color.

## How to explore without getting lost

1. Change **one thing** at a time.
2. Guess what it will do before you play.
3. Try it and compare your guess with what happened.
4. If it doesn't work, undo that edit. An error message is a clue, not a sign that you can't do this.

Lines beginning with `//` are comments for people reading JavaScript. The game skips them. We've left comments near useful settings and important rules.

Keep using Build for room edits. Existing Build saves take priority over the starter rooms in `world.js`, so changing a starter room won't erase a room you've already edited. Keep a downloaded Build backup too.

When you're ready to share a code change, ask Nate to help run `npm run build`. The new playable copy appears in `exports/`. You don't need to edit the generated files.
