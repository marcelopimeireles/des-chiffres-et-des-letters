import { strict as assert } from 'node:assert';
import test from 'node:test';
import { LetterRoundStore, LETTER_PLAY_SECONDS, LETTER_REVEAL_MS } from './letterRounds';

test('round store preserves language, tiles and server deadline', () => {
  const store = new LetterRoundStore(() => 1000);
  const choices = Array(10).fill('vowel');
  const round = store.create(choices, 'en');
  assert.equal(round.language, 'en');
  assert.equal(round.letters.length, 10);
  assert.equal(round.drawId.length, 36);
  assert.deepEqual(store.get(round.drawId)?.letters, round.letters);
  assert.equal(round.deadlineAt, 1000 + LETTER_REVEAL_MS + LETTER_PLAY_SECONDS * 1000);
  choices[0] = 'consonant';
  assert.equal(store.get(round.drawId)?.choices[0], 'vowel');
});

test('a submitted word finishes round and cannot score twice', () => {
  let now = 1000;
  const store = new LetterRoundStore(() => now);
  const round = store.create(Array(10).fill('vowel'), 'pt');
  assert.equal(store.isFinished(round), false);
  assert.equal(store.complete(round, 'ação', 4), true);
  assert.equal(store.complete(round, 'outra', 5), false);
  assert.deepEqual(round.answer, { word: 'ação', score: 4 });
});

test('expired deadlines reject scoring and reveal solutions', () => {
  let now = 1000;
  const store = new LetterRoundStore(() => now);
  const round = store.create(Array(10).fill('consonant'), 'fr');
  now = round.deadlineAt;
  assert.equal(store.isFinished(round), true);
  assert.equal(store.complete(round, 'mot', 3), false);
});

test('inactive draws expire from memory', () => {
  let now = 0;
  const store = new LetterRoundStore(() => now, 500);
  const round = store.create(Array(10).fill('consonant'), 'pt');
  now = 501;
  assert.equal(store.get(round.drawId), undefined);
});
