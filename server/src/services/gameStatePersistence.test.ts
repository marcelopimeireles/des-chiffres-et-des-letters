import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import {
  mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import app from '../app';
import { LetterRoundStore } from '../domain/letterRounds';
import { NumberRoundStore } from '../domain/numberRounds';
import { DuelRoundStore } from '../domain/duels';
import { FinaleRoundStore } from '../domain/finale';
import { SoloMatchStore } from '../domain/matches';
import {
  disableGameStatePersistence, enableGameStatePersistence,
  GameStatePersistence, RuntimeGameStores
} from './gameStatePersistence';

function fixtures(clock: () => number): RuntimeGameStores {
  const letters = new LetterRoundStore(clock);
  const numbers = new NumberRoundStore(clock, () => 0);
  const duels = new DuelRoundStore(clock, () => 0);
  const finals = new FinaleRoundStore(clock, () => 0);
  const matches = new SoloMatchStore(
    letters, numbers, clock, 60 * 60 * 1000, duels, finals
  );
  return { letters, numbers, duels, finals, matches };
}

test('atomic snapshot restores a running match and four game engines without resetting the deadline', () => {
  let now = Date.now();
  const folder = mkdtempSync(join(tmpdir(), 'game-state-'));
  const path = join(folder, 'runtime', 'game-state.json');
  try {
    const original = fixtures(() => now);
    const match = original.matches.create({ language: 'fr', largeCount: 2 });
    const first = original.letters.get(match.current!.drawId)!;
    assert.equal(original.letters.complete(first, 'amour', 5), true);
    original.matches.markResolved(first.drawId);
    const next = original.matches.next(match.matchId);
    if (typeof next === 'string') throw new Error('Missing next round');
    const active = original.numbers.get(next.current!.drawId)!;
    const previousDeadline = active.deadlineAt;

    const duel = original.duels.create('mental', 'en');
    assert.equal(original.duels.submit(duel, duel.expected).score, 8);
    const finale = original.finals.create('pt');
    original.finals.skip(finale, 0);
    assert.equal(finale.currentIndex, 1);

    const persistence = new GameStatePersistence(path, original);
    persistence.save();
    assert.equal(readdirSync(join(folder, 'runtime')).length, 1);
    const stored = JSON.parse(readFileSync(path, 'utf8')) as {
      version: number; matches: unknown[]; finals: unknown[]
    };
    assert.equal(stored.version, 1);
    assert.equal(stored.matches.length, 1);
    assert.equal(stored.finals.length, 1);

    // Simulates a newly launched Express process with empty domain stores.
    const restarted = fixtures(() => now);
    const resumed = new GameStatePersistence(path, restarted);
    assert.equal(resumed.load(), true);
    const snapshot = restarted.matches.get(match.matchId)!;
    assert.equal(snapshot.status, 'playing');
    assert.equal(snapshot.current?.drawId, active.drawId);
    assert.equal(snapshot.current?.deadlineAt, previousDeadline);
    assert.equal(snapshot.totalScore, 5);
    assert.equal(snapshot.history[0].answer, 'amour');

    const numeric = restarted.numbers.get(active.drawId)!;
    assert.equal(restarted.numbers.complete(numeric, '1 + 2', 3, 7), true);
    // The draw→match callback index must also survive the restart.
    restarted.matches.markResolved(numeric.drawId);
    assert.equal(restarted.matches.get(match.matchId)?.totalScore, 12);
    assert.equal(restarted.matches.get(match.matchId)?.status, 'review');
    assert.equal(restarted.duels.get(duel.drawId)?.answer, duel.expected);
    assert.equal(restarted.duels.get(duel.drawId)?.score, 8);
    assert.equal(restarted.finals.get(finale.drawId)?.currentIndex, 1);

    // Once the real deadline has passed, a restarted server must not
    // restart the countdown or award any additional points.
    const third = fixtures(() => now);
    resumed.save();
    now = previousDeadline + 1;
    const afterDeadline = new GameStatePersistence(path, third);
    assert.equal(afterDeadline.load(), true);
    assert.equal(third.numbers.get(active.drawId)?.deadlineAt, previousDeadline);
    assert.equal(third.numbers.isFinished(third.numbers.get(active.drawId)!), true);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('expired draws are pruned on restore while unexpired match history survives', () => {
  let now = Date.now();
  const folder = mkdtempSync(join(tmpdir(), 'game-expiry-'));
  const file = join(folder, 'game.json');
  try {
    const original = fixtures(() => now);
    const match = original.matches.create({ language: 'en', largeCount: 0 });
    const round = original.letters.get(match.current!.drawId)!;
    assert.equal(original.letters.complete(round, 'word', 4), true);
    original.matches.markResolved(round.drawId);
    new GameStatePersistence(file, original).save();
    now += 6 * 60 * 1000;
    const restarted = fixtures(() => now);
    new GameStatePersistence(file, restarted).load();
    assert.equal(restarted.letters.get(round.drawId), undefined);
    assert.equal(restarted.matches.get(match.matchId)?.totalScore, 4);
    assert.equal(restarted.matches.get(match.matchId)?.history[0].answer, 'word');
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('corrupted or unknown schema aborts restore instead of silently wiping scores', () => {
  const folder = mkdtempSync(join(tmpdir(), 'game-corrupt-'));
  const file = join(folder, 'game.json');
  const original = fixtures(Date.now);
  const match = original.matches.create({ language: 'en', largeCount: 2 });
  try {
    new GameStatePersistence(file, original).save();
    const valid = readFileSync(file, 'utf8');
    assert.ok(valid.includes(match.matchId));
    const target = fixtures(Date.now);
    writeFileSync(file, valid.replace('"version":1', '"version":999'));
    assert.throws(() => new GameStatePersistence(file, target).load(), /Unsupported/);
    assert.equal(target.matches.get(match.matchId), undefined);
    writeFileSync(file, '{"version":1,"matches":');
    assert.throws(() => new GameStatePersistence(file, target).load(), SyntaxError);
    assert.ok(readFileSync(file, 'utf8').includes('"matches"'));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('Express persists a created match before returning HTTP 201', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'game-http-'));
  const file = join(folder, 'server-state.json');
  const server = createServer(app);
  try {
    enableGameStatePersistence(file);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/api/game/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'pt', largeCount: 2 })
    });
    assert.equal(response.status, 201);
    const created = await response.json() as { matchId: string };
    const persisted = JSON.parse(readFileSync(file, 'utf8')) as {
      version: number; matches: { matchId: string }[]
    };
    assert.equal(persisted.version, 1);
    assert.ok(persisted.matches.some(item => item.matchId === created.matchId));
    assert.equal(readdirSync(folder).filter(item => item.endsWith('.tmp')).length, 0);
  } finally {
    disableGameStatePersistence();
    if (server.listening) {
      await new Promise<void>((resolve, reject) =>
        server.close(error => error ? reject(error) : resolve())
      );
    }
    rmSync(folder, { recursive: true, force: true });
  }
});
