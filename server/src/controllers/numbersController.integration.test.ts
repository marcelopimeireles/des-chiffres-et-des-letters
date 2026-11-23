import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import app from '../app';
import { numberRoundStore } from '../domain/numberRounds';

test('numbers API prevents early spoilers and duplicate scoring', async () => {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}/api/game/numbers`;
  const headers = { 'Content-Type': 'application/json' };
  try {
    let response = await fetch(`${url}/draw`, {
      method: 'POST', headers, body: JSON.stringify({ largeCount: 2 })
    });
    assert.equal(response.status, 200);
    const draw = await response.json() as { drawId: string; numbers: number[]; targetNumber: number };
    assert.equal(draw.numbers.filter(n => n >= 25).length, 2);
    const round = numberRoundStore.get(draw.drawId);
    assert.ok(round);
    round.numbers = [10, 5, 8, 3, 2, 1];
    round.targetNumber = 117;

    response = await fetch(`${url}/${draw.drawId}/solutions`);
    assert.equal(response.status, 409);

    response = await fetch(`${url}/validate`, {
      method: 'POST', headers, body: JSON.stringify({
        drawId: draw.drawId, expression: '10/3'
      })
    });
    assert.equal(response.status, 200);
    const invalid = await response.json() as { valid: boolean; score: number };
    assert.equal(invalid.valid, false);
    assert.equal(invalid.score, 0);

    response = await fetch(`${url}/validate`, {
      method: 'POST', headers, body: JSON.stringify({
        drawId: draw.drawId, expression: '(10+5)*8-3'
      })
    });
    assert.equal(response.status, 200);
    const accepted = await response.json() as {
      valid: boolean; score: number; exact: boolean; solution: { distance: number }
    };
    assert.equal(accepted.valid, true);
    assert.equal(accepted.score, 10);
    assert.equal(accepted.exact, true);
    assert.equal(accepted.solution.distance, 0);

    response = await fetch(`${url}/validate`, {
      method: 'POST', headers, body: JSON.stringify({
        drawId: draw.drawId, expression: '(10+5)*8-3'
      })
    });
    assert.equal(response.status, 409);

    response = await fetch(`${url}/${draw.drawId}/solutions`);
    assert.equal(response.status, 200);
    const revealed = await response.json() as { score: number; solution: { distance: number } };
    assert.equal(revealed.score, 10);
    assert.equal(revealed.solution.distance, 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('numbers API enforces integer largeCount and server deadlines', async () => {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}/api/game/numbers`;
  const headers = { 'Content-Type': 'application/json' };
  try {
    let response = await fetch(`${url}/draw`, {
      method: 'POST', headers, body: JSON.stringify({ largeCount: 5 })
    });
    assert.equal(response.status, 400);
    response = await fetch(`${url}/draw`, {
      method: 'POST', headers, body: JSON.stringify({ largeCount: 0 })
    });
    const draw = await response.json() as { drawId: string };
    const round = numberRoundStore.get(draw.drawId);
    assert.ok(round);
    round.deadlineAt = Date.now() - 1;
    response = await fetch(`${url}/validate`, {
      method: 'POST', headers, body: JSON.stringify({
        drawId: draw.drawId, expression: '1+2'
      })
    });
    assert.equal(response.status, 409);
    response = await fetch(`${url}/${draw.drawId}/solutions`);
    assert.equal(response.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
