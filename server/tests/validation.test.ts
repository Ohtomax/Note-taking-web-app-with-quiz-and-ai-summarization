import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../src/middlewares/validate.ts';
import { paginationSchema } from '../src/utils/input-validators/common.ts';
import { ApiHandleError } from '../src/utils/error-handler/apiErrorHandler.ts';

test('strict input validation rejects forged fields before handler execution', async () => {
  const app = express();
  let calls = 0;
  app.use(express.json());
  app.post(
    '/',
    validate('body', z.object({ title: z.string() }).strict()),
    (_req, res) => {
      calls += 1;
      res.json({ data: true });
    },
  );
  app.get('/', validate('query', paginationSchema), (_req, res) =>
    res.json({ data: true }),
  );
  app.get('/error', () => {
    throw new Error('private detail');
  });
  app.use(ApiHandleError);
  assert.equal(
    (await request(app).post('/').send({ title: 'ok', ownerId: 'forged' })).status,
    400,
  );
  assert.equal(calls, 0);
  assert.equal((await request(app).get('/?page=0')).status, 400);
  const failure = await request(app).get('/error');
  assert.equal(failure.status, 500);
  assert.equal(JSON.stringify(failure.body).includes('private'), false);
  assert.equal((await request(app).post('/').send({ title: 'ok' })).status, 200);
});
