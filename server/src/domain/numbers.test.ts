import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  applyOperation, drawNumbers, parseNumbersExpression, scoreNumbers, solveNumbers
} from './numbers';

test('parser honors parentheses and precedence and used tiles', () => {
  const tiles = [10, 5, 8, 3, 2, 1];
  assert.equal(parseNumbersExpression('(10 + 5) * 8 - 3', tiles), 117);
  assert.equal(parseNumbersExpression('10 + 5 * 8', tiles), 50);
  assert.equal(parseNumbersExpression('8 × 5 + 10', tiles), 50);
  assert.equal(parseNumbersExpression('10 ÷ (5 - 3)', tiles), 5);
  assert.throws(() => parseNumbersExpression('10 + 10', tiles));
  assert.throws(() => parseNumbersExpression('10 + alert(1)', tiles));
  assert.throws(() => parseNumbersExpression('10 +', tiles));
});

test('all intermediate arithmetic must stay positive integer, with exact division', () => {
  const tiles = [10, 5, 8, 3, 2, 1];
  assert.throws(() => parseNumbersExpression('5 / 2', tiles), /exacte/);
  assert.throws(() => parseNumbersExpression('2 - 5', tiles), /strictement positif/);
  assert.throws(() => parseNumbersExpression('10 - 10', [10, 10, 2, 1, 3, 5]));
  assert.equal(applyOperation(75, 25, '/'), 3);
  assert.throws(() => applyOperation(2, 3, '/'));
});

test('solver finds valid exact result, honors tile usage and intermediate rules', () => {
  const tiles = [10, 5, 8, 3, 2, 1];
  const solved = solveNumbers(tiles, 117);
  assert.equal(solved.exact, true);
  assert.equal(solved.value, 117);
  assert.equal(solved.distance, 0);
  assert.equal(parseNumbersExpression(solved.expression, tiles), 117);
  assert.ok(solved.usedTiles.length <= 6);
  assert.ok(solved.steps.every(step => Number.isInteger(step.result) && step.result > 0));
});

test('solver provides nearest approximation when no exact result exists', () => {
  const tiles = [1, 1, 1, 1, 1, 1];
  const solved = solveNumbers(tiles, 999);
  assert.equal(solved.exact, false);
  assert.equal(solved.value, 9);
  assert.equal(solved.distance, 990);
  assert.equal(parseNumbersExpression(solved.expression, tiles), solved.value);
});

test('solver treats duplicate physical tiles distinctly', () => {
  const tiles = [10, 10, 2, 2, 1, 1];
  const solved = solveNumbers(tiles, 20);
  assert.equal(solved.value, 20);
  assert.equal(parseNumbersExpression(solved.expression, tiles), 20);
});

test('provisional score bands and plate distribution', () => {
  assert.equal(scoreNumbers(0), 10);
  assert.equal(scoreNumbers(1), 7);
  assert.equal(scoreNumbers(5), 7);
  assert.equal(scoreNumbers(6), 5);
  assert.equal(scoreNumbers(10), 5);
  assert.equal(scoreNumbers(11), 0);
  for (const count of [0, 1, 2, 3, 4]) {
    const tiles = drawNumbers(count, () => 0);
    assert.equal(tiles.length, 6);
    assert.equal(tiles.filter(n => n >= 25).length, count);
    for (let small = 1; small <= 10; small++) {
      assert.ok(tiles.filter(n => n === small).length <= 2);
    }
  }
  assert.throws(() => drawNumbers(5));
});
