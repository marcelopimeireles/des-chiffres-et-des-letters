import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeededRandom, isValidSeed } from './random';

test('seeded random produces the same sequence for the same seed', () => {
  const first = createSeededRandom('round-42');
  const second = createSeededRandom('round-42');
  assert.deepEqual(
    Array.from({ length: 8 }, () => first()),
    Array.from({ length: 8 }, () => second())
  );
});

test('seed validation rejects empty and oversized values', () => {
  assert.equal(isValidSeed(''), false);
  assert.equal(isValidSeed('round-42'), true);
  assert.equal(isValidSeed('x'.repeat(129)), false);
});
