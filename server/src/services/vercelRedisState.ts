import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import {
  clearGameState, globalStores, hydrateGameState,
  RuntimeGameStores, serializeGameState
} from './gameStatePersistence';

type RedisValue = string | number | null;
export type RedisCommand = (...args: Array<string | number>) => Promise<RedisValue>;

const WRITE_IF_OWNER = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('SET', KEYS[2], ARGV[2], 'EX', tonumber(ARGV[3]))
  return 1
end
return 0
`;
const RELEASE_IF_OWNER = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

export function makeUpstashCommand(url: string, token: string): RedisCommand {
  if (!/^https:\/\//.test(url) || !token) {
    throw new Error('Upstash Redis requires an HTTPS REST URL and write token.');
  }
  const endpoint = url.replace(/\/+$/, '');
  return async (...args: Array<string | number>): Promise<RedisValue> => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(7000)
    });
    const payload = await response.json() as { result?: RedisValue; error?: string };
    if (!response.ok || payload.error) {
      throw new Error(`Redis command failed: ${payload.error || response.status}`);
    }
    return payload.result ?? null;
  };
}

/**
 * A distributed, expiring mutex serializes full-snapshot read/modify/write
 * across Vercel function instances. Lua commits only if the lock is still ours.
 * A lost lease fails closed rather than overwriting a newer state.
 *
 * This is appropriate for low-volume MVP use, not a high-traffic game backend.
 */
export class RedisGameState {
  private readonly lockKey: string;
  constructor(
    private readonly command: RedisCommand,
    private readonly stateKey: string,
    private readonly stores: RuntimeGameStores = globalStores,
    private readonly now: () => number = Date.now,
    private readonly pause: (ms: number) => Promise<void> =
      ms => new Promise(resolve => setTimeout(resolve, ms))
  ) {
    this.lockKey = stateKey + ':lock';
  }

  async acquire(): Promise<string> {
    const token = randomUUID();
    const deadline = this.now() + 5500;
    do {
      // TTL prevents a crashed function from leaving a permanent lock.
      const result = await this.command('SET', this.lockKey, token, 'PX', 45000, 'NX');
      if (result === 'OK') return token;
      if (this.now() >= deadline) break;
      await this.pause(75);
    } while (this.now() < deadline);
    throw new Error('Game store is busy; retry.');
  }

  async load(): Promise<void> {
    const raw = await this.command('GET', this.stateKey);
    if (raw === null) {
      clearGameState(this.stores);
    } else if (typeof raw === 'string') {
      hydrateGameState(raw, this.stores);
    } else {
      throw new Error('Unexpected Redis snapshot format.');
    }
  }

  async save(token: string): Promise<void> {
    const snapshot = serializeGameState(this.stores);
    const result = await this.command(
      'EVAL', WRITE_IF_OWNER, 2, this.lockKey, this.stateKey,
      token, snapshot, 7200
    );
    if (result !== 1) {
      throw new Error('Game store lock expired before commit.');
    }
  }

  async release(token: string): Promise<void> {
    await this.command('EVAL', RELEASE_IF_OWNER, 1, this.lockKey, token);
  }
}

function runtimeRedisKey(): string {
  const env = process.env.VERCEL_ENV || 'preview';
  const branch = env === 'production' ? 'prod' :
    (process.env.VERCEL_GIT_COMMIT_REF || 'local').replace(/[^A-Za-z0-9_-]/g, '-');
  const project = process.env.VERCEL_PROJECT_ID || 'des-chiffres';
  return process.env.GAME_STATE_REDIS_KEY || `des-chiffres:${project}:${env}:${branch}:v1`;
}

function redisInstance(): RedisGameState | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new RedisGameState(makeUpstashCommand(url, token), runtimeRedisKey());
}

/**
 * Vercel-only API gateway. All game requests (GET and POST) must acquire
 * the Redis lease and reload state before touching in-process stores.
 * Successful mutations persist before responding to the client.
 */
export function vercelRedisMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.VERCEL !== '1') {
    next();
    return;
  }
  const storage = redisInstance();
  if (!storage) {
    res.status(503).json({
      code: 'storage_unconfigured',
      error: 'Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN on Vercel.'
    });
    return;
  }

  void (async () => {
    const lease = await storage.acquire();
    let released = false;
    const release = async () => {
      if (released) return;
      released = true;
      await storage.release(lease);
    };

    // Release if another Express handler ends the response without res.json.
    res.once('finish', () => { void release().catch(console.error); });
    res.once('close', () => { void release().catch(console.error); });

    try {
      await storage.load();
    } catch (error) {
      await release().catch(console.error);
      throw error;
    }

    const sendJson = res.json.bind(res);
    let sent = false;
    res.json = (body: any) => {
      if (sent) return res;
      sent = true;
      void (async () => {
        try {
          if (req.method === 'POST' && res.statusCode >= 200 && res.statusCode < 300) {
            await storage.save(lease);
          }
          await release();
          sendJson(body);
        } catch (error) {
          console.error('Game state Redis commit failed', error);
          await release().catch(console.error);
          if (!res.headersSent) {
            res.status(503);
            sendJson({
              code: 'state_save_failed',
              error: 'Failed to persist game state. Check current state before retrying.'
            });
          }
        }
      })();
      return res;
    };
    next();
  })().catch(error => {
    console.error('Game state Redis read/lock failed', error);
    if (!res.headersSent) {
      res.status(503).json({
        code: 'storage_unavailable',
        error: 'Game storage unavailable. Try again shortly.'
      });
    }
  });
}
