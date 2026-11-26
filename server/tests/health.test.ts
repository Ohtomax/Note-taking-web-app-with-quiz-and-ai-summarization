import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.ts';

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
