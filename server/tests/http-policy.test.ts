import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.ts';

test('CORS allows approved authenticated preflight without granting foreign origins', async () => {
  const app = createApp();
  const preflight = await request(app)
    .options('/api/v1/me')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'PATCH')
    .set('Access-Control-Request-Headers', 'authorization,content-type');
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], 'http://localhost:5173');
  const foreign = await request(app)
    .get('/api/health/live')
    .set('Origin', 'https://foreign.example');
  assert.equal(foreign.headers['access-control-allow-origin'], undefined);
});

test('headers cover errors and parsing enforces byte limits and valid JSON', async () => {
  const app = createApp();
  assert.equal(
    (
      await request(app)
        .post('/api/v1/me')
        .send({ text: 'a'.repeat(262144) })
    ).status,
    413,
  );
  const invalid = await request(app)
    .post('/api/v1/me')
    .set('Content-Type', 'application/json')
    .send('{');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.requestId, invalid.headers['x-request-id']);
  assert.equal(invalid.headers['x-content-type-options'], 'nosniff');
  assert.equal(
    (
      await request(app)
        .post('/unknown')
        .send({ text: 'a'.repeat(100) })
    ).status,
    404,
  );
});
