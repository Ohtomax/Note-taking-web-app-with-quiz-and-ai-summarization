import { rateLimit, type Store } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Redis } from 'ioredis';

export const createRedisStore = (redis: Redis, group: string) =>
  new RedisStore({
    prefix: 'study:rate:' + group + ':',
    sendCommand: (command: string, ...args: string[]) =>
      redis.call(command, ...args) as Promise<RedisReply>,
  });

export const createApiLimiter = (store: Store, limit = 120, windowMs = 60_000) =>
  rateLimit({
    store,
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    passOnStoreError: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        requestId: res.locals.requestId,
      });
    },
  });

export const rateLimits = {
  profile: 60,
  auth: 10,
  generation: 5,
  catalog: 120,
} as const;
