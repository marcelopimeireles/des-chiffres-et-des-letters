import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import app from '../app';
import { letterRoundStore } from '../domain/letterRounds';
import { numberRoundStore } from '../domain/numberRounds';

test('solo match API connects validated rounds with server-scored history', async () => {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/game`;
  const headers = { 'Content-Type': 'application/json' };
  const post = async (path: string, body: unknown = {}) => fetch(`${base}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  try {
    let response = await post('/matches', { language: 'xx', largeCount: 2 });
    assert.equal(response.status, 400);

    response = await post('/matches', { language: 'en', largeCount: 1 });
    assert.equal(response.status, 201);
    let match = await response.json() as {
      matchId: string; status: string; currentIndex: number;
      totalScore: number; history: { score: number }[];
      current: { kind: string; drawId: string } | null
    };
    assert.equal(match.current?.kind, 'letters');
    const firstDraw = match.current!.drawId;
    response = await post(`/matches/${match.matchId}/next`);
    assert.equal(response.status, 409);

    const letter = letterRoundStore.get(firstDraw)!;
    letter.letters = ['C','A','T','E','R','S','O','N','L','I'];
    response = await post('/letters/validate', { drawId: firstDraw, word: 'cat' });
    assert.equal(response.status, 200);
    const accepted = await response.json() as { valid: boolean; score: number };
    assert.equal(accepted.valid, true);
    assert.equal(accepted.score, 3);

    response = await fetch(`${base}/matches/${match.matchId}`);
    match = await response.json();
    assert.equal(match.status, 'review');
    assert.equal(match.totalScore, 3);

    response = await post(`/matches/${match.matchId}/next`);
    assert.equal(response.status, 200);
    match = await response.json();
    assert.equal(match.current?.kind, 'numbers');
    const numeric = numberRoundStore.get(match.current!.drawId)!;
    numeric.numbers = [10,5,8,3,2,1];
    numeric.targetNumber = 117;
    response = await post('/numbers/validate', {
      drawId: numeric.drawId, expression: '(10+5)*8-3'
    });
    assert.equal(response.status, 200);
    const score = await response.json() as { valid: boolean; score: number };
    assert.equal(score.valid, true);
    assert.equal(score.score, 10);

    response = await fetch(`${base}/matches/${match.matchId}`);
    match = await response.json();
    assert.equal(match.totalScore, 13);
    assert.equal(match.history.length, 2);
    assert.equal(match.currentIndex, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
