import { strict as assert } from 'node:assert';
import test from 'node:test';
import { DuelRoundStore } from './duels';
import { FinaleRoundStore } from './finale';

test('anagram duel hides answer until solved and rejects invalid guesses', () => {
  let now = 100;
  const store = new DuelRoundStore(() => now, () => 0);
  const duel = store.create('anagram', 'fr');
  assert.equal(duel.kind, 'anagram');
  assert.ok(duel.letters);
  assert.equal(store.reveal(duel), null);
  assert.deepEqual(store.submit(duel, '123'), { valid: false, reason: 'invalid_format', score: 0 });
  assert.equal(store.submit(duel, duel.expected).valid, true);
  assert.equal(store.reveal(duel)?.score, 8);
  assert.throws(() => store.submit(duel, duel.expected), /duel_finished/);
});

test('mental duel validates numeric result and server deadline', () => {
  let now = 100;
  const store = new DuelRoundStore(() => now, () => 0);
  const duel = store.create('mental', 'en');
  assert.deepEqual(duel.operands, [12, 2]);
  assert.equal(store.submit(duel, '999').reason, 'wrong_answer');
  assert.equal(store.submit(duel, '14').score, 8);
  const another = store.create('mental', 'fr');
  now = another.deadlineAt;
  assert.equal(store.isFinished(another), true);
  assert.equal(store.reveal(another)?.score, 0);
  assert.throws(() => store.submit(another, '14'), /duel_finished/);
});

test('finale contains eight solvable ten-letter anagrams and scores each once', () => {
  let now = 100;
  const store = new FinaleRoundStore(() => now, () => 0);
  const round = store.create('fr');
  assert.equal(round.items.length, 8);
  assert.equal(store.reveal(round), null);
  for (let index = 0; index < 8; index++) {
    const item = store.current(round)!;
    assert.equal(item.index, index);
    assert.equal(item.letters.length, 10);
    assert.equal(store.submit(round, index, 'notaword').valid, false);
    const accepted = store.submit(round, index, round.items[index].target);
    assert.equal(accepted.valid, true);
    assert.equal(accepted.score, (index + 1) * 10);
  }
  assert.equal(store.isFinished(round), true);
  assert.equal(store.current(round), null);
  assert.equal(store.reveal(round)?.words.length, 8);
  assert.throws(() => store.submit(round, 7, 'test'), /finale_inactive/);
});

test('finale skips unsolved words and timeouts preserve only earned points', () => {
  let now = 100;
  const store = new FinaleRoundStore(() => now, () => 0);
  const round = store.create('en');
  store.skip(round, 0);
  assert.equal(round.currentIndex, 1);
  assert.equal(round.score, 0);
  now = round.deadlineAt;
  assert.equal(store.isFinished(round), true);
  assert.equal(store.reveal(round)?.words[0].score, 0);
  assert.throws(() => store.skip(round, 1), /finale_inactive/);
});
