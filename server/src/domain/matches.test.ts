import { strict as assert } from 'node:assert';
import test from 'node:test';
import { LetterRoundStore } from './letterRounds';
import { NumberRoundStore } from './numberRounds';
import { SoloMatchStore } from './matches';
import { DuelRoundStore } from './duels';
import { FinaleRoundStore } from './finale';

test('match alternates letter and number rounds and scores only verified answers', () => {
  let now = 100;
  const letters = new LetterRoundStore(() => now);
  const numbers = new NumberRoundStore(() => now, () => 0);
  const store = new SoloMatchStore(letters, numbers, () => now, 3600000,
    new DuelRoundStore(() => now, () => 0), new FinaleRoundStore(() => now, () => 0));
  const created = store.create({ language: 'pt', largeCount: 2 });
  assert.equal(created.status, 'playing');
  assert.equal(created.current?.kind, 'letters');
  assert.equal(created.current?.letters?.length, 10);
  assert.equal(created.history.length, 0);
  assert.equal(store.next(created.matchId), 'active');

  const first = letters.get(created.current!.drawId)!;
  assert.equal(letters.complete(first, 'casa', 4), true);
  store.markResolved(first.drawId);
  const ready = store.get(created.matchId)!;
  assert.equal(ready.status, 'review');
  assert.equal(ready.totalScore, 4);
  assert.equal(ready.history[0].answer, 'casa');
  const second = store.next(created.matchId);
  assert.notEqual(second, 'missing');
  assert.notEqual(second, 'active');
  if (second === 'missing' || second === 'active') throw new Error('No next round');
  assert.equal(second.current?.kind, 'numbers');
  const numeric = numbers.get(second.current!.drawId)!;
  assert.equal(numbers.complete(numeric, '75 + 25', 100, 10), true);
  store.markResolved(numeric.drawId);
  assert.equal(store.get(created.matchId)?.totalScore, 14);

  // Play the seven remaining stages as time-outs, without awarding points.
  let current = store.next(created.matchId);
  for (let i = 2; i < 9; i++) {
    assert.equal(typeof current, 'object');
    if (typeof current === 'string') throw new Error('No round');
    assert.equal(current.current?.kind, i < 6 ? (i % 2 === 0 ? 'letters' : 'numbers') : i < 8 ? 'duel' : 'final');
    now = current.current!.deadlineAt + 1;
    current = store.next(created.matchId);
  }
  if (typeof current === 'string') throw new Error('No match');
  assert.equal(current.status, 'finished');
  assert.equal(current.current, null);
  assert.equal(current.history.length, 9);
  assert.equal(current.totalScore, 14);
  assert.equal(current.history.filter(item => item.score === 0).length, 7);
});

test('match history is frozen server-side, and expired matches cannot be resumed', () => {
  let now = 0;
  const letters = new LetterRoundStore(() => now);
  const numbers = new NumberRoundStore(() => now, () => 0);
  const store = new SoloMatchStore(letters, numbers, () => now, 1000);
  const current = store.create({ language: 'en', largeCount: 1 });
  assert.equal(current.totalScore, 0);
  now = 1001;
  assert.equal(store.get(current.matchId), undefined);
  assert.equal(store.next(current.matchId), 'missing');
});

test('two duel types and eight-word finale contribute server-verified points to the match', () => {
  let now = 100;
  const letters = new LetterRoundStore(() => now);
  const numbers = new NumberRoundStore(() => now, () => 0);
  const duels = new DuelRoundStore(() => now, () => 0);
  const finals = new FinaleRoundStore(() => now, () => 0);
  const store = new SoloMatchStore(letters, numbers, () => now, 3600000, duels, finals);
  let match = store.create({ language: 'fr', largeCount: 2 });
  for (let i = 0; i < 6; i++) {
    now = match.current!.deadlineAt + 1;
    const next = store.next(match.matchId);
    if (typeof next === 'string') throw new Error('Cannot advance');
    match = next;
  }
  assert.equal(match.current?.kind, 'duel');
  assert.equal(match.current?.duelKind, 'anagram');
  const anagram = duels.get(match.current!.drawId)!;
  assert.equal(duels.submit(anagram, anagram.expected).score, 8);
  store.markResolved(anagram.drawId);
  assert.equal(store.get(match.matchId)?.totalScore, 8);
  let next = store.next(match.matchId);
  if (typeof next === 'string') throw new Error('Cannot advance');
  match = next;
  assert.equal(match.current?.duelKind, 'mental');
  const mental = duels.get(match.current!.drawId)!;
  assert.equal(duels.submit(mental, mental.expected).score, 8);
  store.markResolved(mental.drawId);
  next = store.next(match.matchId);
  if (typeof next === 'string') throw new Error('Cannot advance');
  match = next;
  assert.equal(match.current?.kind, 'final');
  assert.equal(match.current?.finaleIndex, 0);
  const final = finals.get(match.current!.drawId)!;
  for (let index = 0; index < 8; index++) {
    const answer = finals.submit(final, index, final.items[index].target);
    assert.equal(answer.valid, true);
    const snapshot = store.get(match.matchId);
    if (index < 7) assert.equal(snapshot?.status, 'playing');
  }
  store.markResolved(final.drawId);
  assert.equal(store.get(match.matchId)?.status, 'review');
  assert.equal(store.get(match.matchId)?.totalScore, 96);
  next = store.next(match.matchId);
  if (typeof next === 'string') throw new Error('Cannot finish');
  assert.equal(next.status, 'finished');
  assert.equal(next.history.length, 9);
});
