import { Redis } from 'ioredis';

export const createRedis = (url: string): Redis => {
  const redis = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    commandTimeout: 2000,
    retryStrategy: (attempt) => Math.min(attempt * 200, 3000),
  });
  // Connection details may contain credentials. Readiness reports the state safely.
  redis.on('error', () => {});
  return redis;
};
