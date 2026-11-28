import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.ts';
import express from 'express';
import { createHealthRouter } from '../src/routes/health.routes.ts';

test('liveness stays available while dependencies are unavailable', async () => {
  const app = createApp(async () => {
    throw new Error('secret connection detail');
  });
  assert.equal((await request(app).get('/api/health/live')).status, 200);
  const response = await request(app).get('/api/health/ready');
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(response.body).includes('secret'), false);
});

test('readiness reflects successful checks and defaults to unavailable', async () => {
  assert.equal(
    (await request(createApp(async () => true)).get('/api/health/ready')).status,
    200,
  );
  assert.equal((await request(createApp()).get('/api/health/ready')).status, 503);
});

test('hanging dependency checks share one probe, return 503 on deadline and recover', async () => {
  let finish: (value: boolean) => void = () => {};
  const pending = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  let calls = 0;
  let blocked = true;
  const app = express();
  app.use(
    createHealthRouter(async () => {
      calls += 1;
      return blocked ? pending : true;
    }, 20),
  );
  const started = Date.now();
  const responses = await Promise.all(
    Array.from({ length: 10 }, () => request(app).get('/ready')),
  );
  assert.ok(Date.now() - started < 2000);
  assert.ok(responses.every((response) => response.status === 503));
  assert.equal(calls, 1);
  assert.equal((await request(app).get('/live')).status, 200);
  blocked = false;
  finish(true);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal((await request(app).get('/ready')).status, 200);
  assert.equal(calls, 2);
});
