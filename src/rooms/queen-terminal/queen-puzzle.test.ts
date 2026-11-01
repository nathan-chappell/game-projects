import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceQueenPuzzle,
  createQueenPuzzle,
  pressQueenTile,
  queenKeyPath,
  startQueenDemo,
} from './queen-puzzle.ts';
import { queenCode, queenLetters } from './queen-room.ts';
test('Queen demonstrates the glitch, wrong code and disappearing text before accepting input', () => {
  const p = createQueenPuzzle();
  startQueenDemo(p);
  assert.equal(p.mode, 'glitch');
  advanceQueenPuzzle(p, 1);
  assert.equal(p.mode, 'demoWrong');
  advanceQueenPuzzle(p, 1.2);
  assert.equal(p.mode, 'demoClear');
  advanceQueenPuzzle(p, 0.6);
  assert.equal(p.mode, 'ready');
  startQueenDemo(p);
  assert.equal(p.mode, 'ready');
});
test('the full code can be entered along a continuous walk without accidental neighboring letters', () => {
  const p = createQueenPuzzle(true);
  let previous;
  for (const [x, y] of queenKeyPath) {
    const point = { x: 194 + x * 36, y: 186 + y * 36 };
    if (previous)
      for (let i = 1; i <= 18; i++)
        pressQueenTile(
          p,
          {
            x: previous.x + ((point.x - previous.x) * i) / 18,
            y: previous.y + ((point.y - previous.y) * i) / 18,
          },
          queenLetters,
        );
    else pressQueenTile(p, point, queenLetters);
    const input = p.input;
    for (let i = 0; i < 60; i++) pressQueenTile(p, point, queenLetters);
    assert.equal(p.input, input);
    previous = point;
  }
  assert.equal(p.input, queenCode);
  assert.equal(p.mode, 'correct');
  assert.equal(advanceQueenPuzzle(p, 1.2), 'success');
  assert.equal(advanceQueenPuzzle(p, 2), null);
});
test('wrong entries clear after feedback without repeatedly pressing a held tile', () => {
  const p = createQueenPuzzle(true),
    point = { x: 230, y: 186 };
  pressQueenTile(p, point, queenLetters);
  assert.equal(p.mode, 'wrong');
  advanceQueenPuzzle(p, 1);
  pressQueenTile(p, point, queenLetters);
  assert.equal(p.input, '');
  assert.equal(p.mode, 'ready');
});
