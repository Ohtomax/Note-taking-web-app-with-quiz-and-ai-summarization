import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createVerifyToken } from '../src/middlewares/verifyToken.ts';
import { ApiHandleError } from '../src/utils/error-handler/apiErrorHandler.ts';
import type { AuthRequest } from '../src/types/auth.type.ts';

test('token middleware rejects missing, malformed, expired and wrong-project tokens', async () => {
  const app = express();
  const verify = createVerifyToken(async (token) => {
    if (token !== 'valid') throw new Error('private token failure');
    return { uid: 'verified-uid' };
  });
  app.get('/', verify, (req: AuthRequest, res) => res.json({ uid: req.user?.uid }));
  app.use(ApiHandleError);
  assert.equal((await request(app).get('/')).status, 401);
  for (const token of ['expired', 'wrong-project', 'invalid']) {
    const response = await request(app)
      .get('/')
      .set('Authorization', 'Bearer ' + token);
    assert.equal(response.status, 401);
    assert.equal(JSON.stringify(response.body).includes('private'), false);
  }
  assert.equal(
    (await request(app).get('/').set('Authorization', 'Basic value')).status,
    401,
  );
  const valid = await request(app).get('/').set('Authorization', 'Bearer valid');
  assert.equal(valid.body.uid, 'verified-uid');
});
