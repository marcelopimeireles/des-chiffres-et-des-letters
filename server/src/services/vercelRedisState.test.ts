import { strict as assert } from 'node:assert';
import test from 'node:test';
import { LetterRoundStore } from '../domain/letterRounds';
import { NumberRoundStore } from '../domain/numberRounds';
import { DuelRoundStore } from '../domain/duels';
import { FinaleRoundStore } from '../domain/finale';
import { SoloMatchStore } from '../domain/matches';
import { RuntimeGameStores } from './gameStatePersistence';
import { RedisCommand, RedisGameState } from './vercelRedisState';

const makeStores = (now: () => number): RuntimeGameStores => {
  const letters = new LetterRoundStore(now);
  const numbers = new NumberRoundStore(now, () => 0);
  const duels = new DuelRoundStore(now, () => 0);
  const finals = new FinaleRoundStore(now, () => 0);
  const matches = new SoloMatchStore(letters, numbers, now, 3600000, duels, finals);
  return { letters, numbers, duels, finals, matches };
};

function fakeRedis(now: () => number): RedisCommand {
  const values = new Map<string, { value: string; expires: number }>();
  const get = (key: string) => {
    const entry = values.get(key);
    if (!entry) return null;
    if (now() >= entry.expires) {
      values.delete(key);
      return null;
    }
    return entry.value;
  };
  return async (...args) => {
    const [cmd, ...params] = args;
    if (cmd === 'GET') return get(String(params[0]));
    if (cmd === 'SET') {
      const key = String(params[0]);
      const [value, op, ttl, nx] = params.slice(1);
      if (nx === 'NX' && get(key) !== null) return null;
      const expiry = op === 'PX' ? now() + Number(ttl) : Infinity;
      values.set(key, { value: String(value), expires: expiry });
      return 'OK';
    }
    if (cmd === 'EVAL') {
      const [script, count] = params;
      if (Number(count) === 2) {
        const lockKey = String(params[2]);
        const stateKey = String(params[3]);
        const token = String(params[4]);
        if (get(lockKey) !== token) return 0;
        values.set(stateKey, {
          value: String(params[5]),
          expires: now() + Number(params[6]) * 1000
        });
        return 1;
      }
      if (Number(count) === 1 && String(script).includes('DEL')) {
        const key = String(params[2]);
        if (get(key) !== String(params[3])) return 0;
        values.delete(key);
        return 1;
      }
    }
    throw new Error('Unsupported fake Redis command: ' + JSON.stringify(args));
  };
}

test('Redis state preserves authoritative score, deadline and draw-to-match association', async () => {
  let time = Date.now();
  const now = () => time;
  const redis = fakeRedis(now);
  const storeA = makeStores(now);
  const storageA = new RedisGameState(redis, 'test:state', storeA, now);
  const token = await storageA.acquire();
  await storageA.load();
  const match = storeA.matches.create({language:'fr',largeCount:2});
  const first = storeA.letters.get(match.current!.drawId)!;
  assert.equal(storeA.letters.complete(first, 'amour', 5), true);
  storeA.matches.markResolved(first.drawId);
  const next = storeA.matches.next(match.matchId);
  if (typeof next === 'string') throw new Error('Invalid next round');
  const deadlineAt = next.current!.deadlineAt;
  await storageA.save(token);
  await storageA.release(token);

  const storeB = makeStores(now);
  const storageB = new RedisGameState(redis, 'test:state', storeB, now);
  const tokenB = await storageB.acquire();
  await storageB.load();
  const resumed = storeB.matches.get(match.matchId)!;
  assert.equal(resumed.totalScore, 5);
  assert.equal(resumed.current?.deadlineAt, deadlineAt);
  const numeric = storeB.numbers.get(resumed.current!.drawId)!;
  assert.equal(storeB.numbers.complete(numeric, '1+2', 3, 7), true);
  storeB.matches.markResolved(numeric.drawId);
  assert.equal(storeB.matches.get(match.matchId)?.totalScore, 12);
  await storageB.save(tokenB);
  await storageB.release(tokenB);

  time = deadlineAt + 1;
  const storeC = makeStores(now);
  const storageC = new RedisGameState(redis, 'test:state', storeC, now);
  const tokenC = await storageC.acquire();
  await storageC.load();
  assert.equal(storeC.numbers.isFinished(storeC.numbers.get(numeric.drawId)!), true);
  assert.equal(storeC.matches.get(match.matchId)?.totalScore, 12);
  await storageC.release(tokenC);
});

test('expired Redis lock cannot overwrite newer state', async () => {
  let time = Date.now();
  const now = () => time;
  const redis = fakeRedis(now);
  const storesA = makeStores(now);
  const instanceA = new RedisGameState(redis,'test:race',storesA,now);
  const leaseA = await instanceA.acquire();
  await instanceA.load();
  storesA.matches.create({language:'en',largeCount:0});
  time += 45001; // 45s lock expires while the function is still working

  const storesB = makeStores(now);
  const instanceB = new RedisGameState(redis,'test:race',storesB,now);
  const leaseB = await instanceB.acquire();
  await instanceB.load();
  const newer = storesB.matches.create({language:'fr',largeCount:0});
  await instanceB.save(leaseB);
  await instanceB.release(leaseB);
  await assert.rejects(() => instanceA.save(leaseA), /lock expired/);

  const storesC = makeStores(now);
  const instanceC = new RedisGameState(redis,'test:race',storesC,now);
  const leaseC = await instanceC.acquire();
  await instanceC.load();
  assert.ok(storesC.matches.get(newer.matchId));
  await instanceC.release(leaseC);
});

test('Redis lock is exclusive while active and aborts on contention', async () => {
  let time = Date.now();
  const now = () => time;
  const redis = fakeRedis(now);
  const store = makeStores(now);
  const locker = new RedisGameState(redis,'test:lock',store,now,async ms => { time += ms; });
  const lease = await locker.acquire();
  await assert.rejects(() => locker.acquire(), /busy/);
  await locker.release(lease);
  const next = await locker.acquire();
  assert.ok(next !== lease);
  await locker.release(next);
});
