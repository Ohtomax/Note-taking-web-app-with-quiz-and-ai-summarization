import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createRuntime } from '../config/runtime.ts';
import { parseEnvironment } from '../config/env.ts';
import { createApp } from '../src/app.ts';

test('deferred infrastructure keeps health visible and private APIs closed', async () => {
  const environment = parseEnvironment({});
  const runtime = await createRuntime(environment);
  try {
    assert.equal(await runtime.checkReadiness(), false);
    assert.equal(runtime.services, undefined);
    const app = createApp(
      runtime.checkReadiness,
      environment,
      () => {},
      runtime.services,
    );
    assert.equal((await request(app).get('/api/health/live')).status, 200);
    assert.equal((await request(app).get('/api/health/ready')).status, 503);
    assert.equal((await request(app).get('/api/v1/me')).status, 503);
  } finally {
    await runtime.close();
  }
});
