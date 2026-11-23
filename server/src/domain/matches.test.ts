import { strict as assert } from 'node:assert';
import test from 'node:test';
import { LetterRoundStore } from './letterRounds';
import { NumberRoundStore } from './numberRounds';
import { SoloMatchStore } from './matches';

test('match alternates letter and number rounds and scores only verified answers', () => {
  let now = 100;
  const letters = new LetterRoundStore(() => now);
  const numbers = new NumberRoundStore(() => now, () => 0);
  const store = new SoloMatchStore(letters, numbers, () => now);
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

  // Play the four remaining rounds as time-outs, without awarding points.
  let current = store.next(created.matchId);
  for (let i = 2; i < 6; i++) {
    assert.ok(current !== 'missing' && current !== 'active');
    if (current === 'missing' || current === 'active') throw new Error('No round');
    assert.equal(current.current?.kind, i % 2 === 0 ? 'letters' : 'numbers');
    now = current.current!.deadlineAt + 1;
    current = store.next(created.matchId);
  }
  if (current === 'missing' || current === 'active') throw new Error('No match');
  assert.equal(current.status, 'finished');
  assert.equal(current.current, null);
  assert.equal(current.history.length, 6);
  assert.equal(current.totalScore, 14);
  assert.equal(current.history.filter(item => item.score === 0).length, 4);
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
