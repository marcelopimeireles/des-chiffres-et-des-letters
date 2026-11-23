import { strict as assert } from 'node:assert';
import test from 'node:test';
import { drawLetters, isLetterChoices, shuffle, LetterKind } from './letters';

test('validates exactly ten vowel/consonant choices', () => {
  assert.equal(isLetterChoices(Array(10).fill('vowel')), true);
  assert.equal(isLetterChoices(Array(9).fill('vowel')), false);
  assert.equal(isLetterChoices([...Array(9).fill('vowel'), 'invalid']), false);
  assert.equal(isLetterChoices('vowel'), false);
});

test('draw follows the selected letter kinds', () => {
  const result = drawLetters(['vowel', 'consonant', 'vowel'], () => 0);
  assert.deepEqual(result, ['A', 'B', 'A']);
});

test('shuffle preserves the pool without mutating it', () => {
  const input: LetterKind[] = ['vowel', 'consonant', 'vowel'];
  const output = shuffle(input, () => 0);
  assert.equal(output.length, input.length);
  assert.deepEqual([...output].sort(), [...input].sort());
  assert.deepEqual(input, ['vowel', 'consonant', 'vowel']);
});
