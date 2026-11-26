import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvironment } from '../config/env.ts';

test('local configuration supports deferred infrastructure and AI credentials', () => {
  const config = parseEnvironment({});
  assert.equal(config.PORT, 3001);
  assert.equal(config.DATABASE_URL, undefined);
  assert.equal(config.AI_API_KEY, undefined);
});

test('production requires infrastructure names and never prints their values', () => {
  assert.throws(() => parseEnvironment({ NODE_ENV: 'production' }), /DATABASE_URL/);
  assert.throws(
    () =>
      parseEnvironment({
        DATABASE_URL: 'private-marker',
        FIREBASE_SERVICE_ACCOUNT: 'private-json',
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes('FIREBASE_SERVICE_ACCOUNT') &&
      !error.message.includes('private-'),
  );
});

test('invalid URLs, origins and ports fail while valid test config passes', () => {
  assert.throws(() => parseEnvironment({ REDIS_URL: 'https://invalid' }));
  assert.throws(() => parseEnvironment({ CORS_ORIGINS: '*' }));
  assert.throws(() => parseEnvironment({ PORT: 'NaN' }));
  assert.equal(parseEnvironment({ NODE_ENV: 'test', PORT: '4000' }).PORT, 4000);
});
