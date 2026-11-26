import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { MemoryStore } from 'express-rate-limit';
import request from 'supertest';
import { createApiLimiter } from '../src/utils/rate-limiter/apiLimiter.ts';
import { ApiHandleError } from '../src/utils/error-handler/apiErrorHandler.ts';

test('rate limits reject excess traffic, expose retry and reset after expiry', async () => {
  const app = express();
  app.use(createApiLimiter(new MemoryStore(), 1, 100));
  app.get('/', (_req, res) => res.json({ data: true }));
  assert.equal((await request(app).get('/')).status, 200);
  const limited = await request(app).get('/');
  assert.equal(limited.status, 429);
  assert.ok(limited.headers['retry-after']);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal((await request(app).get('/')).status, 200);
});

test('failed limiter storage never permits protected handler execution', async () => {
  class FailedStore extends MemoryStore {
    override async increment(): Promise<never> {
      throw new Error('private Redis URL');
    }
  }
  const app = express();
  let calls = 0;
  app.use(createApiLimiter(new FailedStore()));
  app.get('/', (_req, res) => {
    calls += 1;
    res.json({ data: true });
  });
  app.use(ApiHandleError);
  const response = await request(app).get('/');
  assert.equal(response.status, 500);
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(response.body).includes('private'), false);
});
