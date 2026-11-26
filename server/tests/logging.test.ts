import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.ts';
import { parseEnvironment } from '../config/env.ts';
import type { LogEntry } from '../src/utils/logger.ts';

test('request logging permits only metadata with server-generated correlation IDs', async () => {
  const entries: LogEntry[] = [];
  const app = createApp(undefined, parseEnvironment({}), (entry) => entries.push(entry));
  const response = await request(app)
    .post('/unknown?secret=private-marker')
    .set('Authorization', 'Bearer private-marker')
    .set('X-Request-Id', 'private-marker')
    .send({ note: 'private-marker', email: 'private-marker' });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.requestId, response.headers['x-request-id']);
  assert.equal(JSON.stringify(entries).includes('private-marker'), false);
  assert.deepEqual(Object.keys(entries[0] ?? {}).sort(), [
    'event',
    'method',
    'requestId',
    'status',
  ]);
  const failed = await request(app)
    .get('/api/health/ready')
    .set('Authorization', 'Bearer private-marker');
  assert.equal(failed.status, 503);
  assert.equal(entries[1]?.event, 'request_failed');
  assert.equal(entries[1]?.requestId, failed.headers['x-request-id']);
  assert.equal(JSON.stringify(entries).includes('private-marker'), false);
});
