import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import type { AuthRequest } from '../src/types/auth.type.ts';
import { verifyUser } from '../src/middlewares/verifyRole.ts';
import { ApiHandleError } from '../src/utils/error-handler/apiErrorHandler.ts';

test('role guard requires database account and rejects privileged client claims', async () => {
  const app = express();
  app.use((req: AuthRequest, _res, next) => {
    if (req.headers.authorization === 'database-admin') {
      req.account = {
        id: 'fixture',
        displayName: 'Test',
        email: null,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    next();
  });
  app.get('/', verifyUser, (_req, res) => res.json({ data: true }));
  app.use(ApiHandleError);
  assert.equal((await request(app).get('/').set('X-Role', 'USERS')).status, 401);
  assert.equal(
    (
      await request(app)
        .get('/')
        .set('Authorization', 'database-admin')
        .set('X-Role', 'USERS')
    ).status,
    403,
  );
});
