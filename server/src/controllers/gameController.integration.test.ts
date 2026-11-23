import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import app from '../app';
import { letterRoundStore } from '../domain/letterRounds';

test('letters API hides solutions, awards points once, then reveals solutions', async () => {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    const round = letterRoundStore.create(Array(10).fill('vowel'), 'en');
    round.letters = ['C','A','T','E','R','S','O','N','L','I'];
    const base = `http://127.0.0.1:${port}/api/game/letters`;
    let response = await fetch(`${base}/${round.drawId}/solutions`);
    assert.equal(response.status, 409);

    response = await fetch(`${base}/validate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawId: round.drawId, word: 'cat' })
    });
    assert.equal(response.status, 200);
    const result = await response.json() as { valid: boolean; score: number; solutions: { bestLength: number } };
    assert.equal(result.valid, true);
    assert.equal(result.score, 3);
    assert.ok(result.solutions.bestLength >= 3);

    response = await fetch(`${base}/validate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawId: round.drawId, word: 'cat' })
    });
    assert.equal(response.status, 409);

    response = await fetch(`${base}/${round.drawId}/solutions`);
    assert.equal(response.status, 200);
    const solutions = await response.json() as { score: number; bestWords: string[] };
    assert.equal(solutions.score, 3);
    assert.ok(solutions.bestWords.length > 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
