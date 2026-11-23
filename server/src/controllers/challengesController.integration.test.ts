import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import app from '../app';
import { duelRoundStore } from '../domain/duels';
import { finaleRoundStore } from '../domain/finale';

test('HTTP duel challenge is secret before finish and cannot be scored twice', async () => {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/game`;
  const headers = { 'Content-Type': 'application/json' };
  const post = (url: string, body: unknown) => fetch(`${base}${url}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  try {
    let response = await post('/duels/draw', { kind: 'mental', language: 'en' });
    assert.equal(response.status, 201);
    const view = await response.json() as { drawId: string; challenge: string; expected?: string; finished: boolean };
    assert.equal(view.expected, undefined);
    assert.equal(view.finished, false);
    const round = duelRoundStore.get(view.drawId)!;
    assert.ok(round.expected);
    response = await fetch(`${base}/duels/${view.drawId}/solution`);
    assert.equal(response.status, 409);
    response = await post('/duels/validate', { drawId: view.drawId, answer: 'abc' });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { valid: boolean }).valid, false);
    response = await post('/duels/validate', { drawId: view.drawId, answer: round.expected });
    assert.equal(response.status, 200);
    const accepted = await response.json() as { valid: boolean; score: number };
    assert.equal(accepted.valid, true);
    assert.equal(accepted.score, 8);
    response = await post('/duels/validate', { drawId: view.drawId, answer: round.expected });
    assert.equal(response.status, 409);
    response = await fetch(`${base}/duels/${view.drawId}/solution`);
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { answer: string }).answer, round.expected);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('HTTP finale reveals only current anagram and scores skipping and answers sequentially', async () => {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/game`;
  const headers = { 'Content-Type': 'application/json' };
  const post = (url: string, body: unknown) => fetch(`${base}${url}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  try {
    let response = await post('/finale/draw', { language: 'pt' });
    assert.equal(response.status, 201);
    const created = await response.json() as {
      drawId: string; totalItems: number; current: { index: number; letters: string[] };
      items?: unknown; target?: string
    };
    assert.equal(created.totalItems, 8);
    assert.equal(created.items, undefined);
    assert.equal(created.target, undefined);
    assert.equal(created.current.index, 0);
    assert.equal(created.current.letters.length, 10);
    const round = finaleRoundStore.get(created.drawId)!;
    response = await fetch(`${base}/finale/${created.drawId}/solutions`);
    assert.equal(response.status, 409);
    response = await post('/finale/validate', {
      drawId: created.drawId, index: 1, word: round.items[1].target
    });
    assert.equal(response.status, 409);
    response = await post('/finale/skip', { drawId: created.drawId, index: 0 });
    assert.equal(response.status, 200);
    response = await post('/finale/validate', {
      drawId: created.drawId, index: 1, word: round.items[1].target
    });
    assert.equal(response.status, 200);
    const accepted = await response.json() as { valid: boolean; score: number; currentIndex: number };
    assert.equal(accepted.valid, true);
    assert.equal(accepted.score, 10);
    assert.equal(accepted.currentIndex, 2);
    for (let i = 2; i < 8; i++) {
      response = await post('/finale/skip', { drawId: created.drawId, index: i });
      assert.equal(response.status, 200);
    }
    response = await fetch(`${base}/finale/${created.drawId}/solutions`);
    assert.equal(response.status, 200);
    const summary = await response.json() as { score: number; words: { answer: string | null }[] };
    assert.equal(summary.score, 10);
    assert.equal(summary.words.length, 8);
    assert.equal(summary.words[0].answer, null);
    assert.ok(summary.words[1].answer);
    response = await post('/finale/skip', { drawId: created.drawId, index: 7 });
    assert.equal(response.status, 409);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
