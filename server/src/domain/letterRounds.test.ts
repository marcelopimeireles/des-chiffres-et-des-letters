import { strict as assert } from 'node:assert';
import test from 'node:test';
import { LetterRoundStore } from './letterRounds';

test('round store preserves language and tiles on the server', () => {
  const store = new LetterRoundStore(() => 1000);
  const choices = Array(10).fill('vowel');
  const round = store.create(choices, 'en');
  assert.equal(round.language, 'en');
  assert.equal(round.letters.length, 10);
  assert.equal(round.drawId.length, 36);
  assert.deepEqual(store.get(round.drawId)?.letters, round.letters);
  choices[0] = 'consonant';
  assert.equal(store.get(round.drawId)?.choices[0], 'vowel');
});

test('expired draws cannot be retrieved', () => {
  let now = 0;
  const store = new LetterRoundStore(() => now, 500);
  const round = store.create(Array(10).fill('consonant'), 'pt');
  now = 501;
  assert.equal(store.get(round.drawId), undefined);
});
