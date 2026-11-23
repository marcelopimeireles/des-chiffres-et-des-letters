import { strict as assert } from 'node:assert';
import test from 'node:test';
import { NumberRoundStore, NUMBER_PLAY_SECONDS } from './numberRounds';

test('rounds persist immutable draw values and server deadline', () => {
  const store = new NumberRoundStore(() => 1000, () => 0);
  const round = store.create(2);
  assert.equal(round.numbers.length, 6);
  assert.equal(round.largeCount, 2);
  assert.equal(round.targetNumber, 101);
  assert.equal(round.deadlineAt, 1000 + NUMBER_PLAY_SECONDS * 1000);
  assert.deepEqual(store.get(round.drawId)?.numbers, round.numbers);
});

test('rounds can score only once, and late answers cannot score', () => {
  let time = 100;
  const store = new NumberRoundStore(() => time, () => 0);
  const round = store.create(0);
  assert.equal(store.complete(round, '1+2', 3, 5), true);
  assert.equal(store.complete(round, '1+2', 3, 5), false);
  const second = store.create(0);
  time = second.deadlineAt;
  assert.equal(store.complete(second, '1+2', 3, 5), false);
});

test('rounds expire from memory', () => {
  let time = 0;
  const store = new NumberRoundStore(() => time, () => 0, 500);
  const round = store.create(3);
  time = 501;
  assert.equal(store.get(round.drawId), undefined);
});
