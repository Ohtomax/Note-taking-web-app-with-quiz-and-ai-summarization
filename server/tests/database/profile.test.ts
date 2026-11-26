import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MemoryStore } from 'express-rate-limit';
import { createApp } from '../../src/app.ts';
import { parseEnvironment } from '../../config/env.ts';
import { createUserService } from '../../src/services/user.service.ts';
import { createUserRepository } from '../../src/repositories/user.repository.ts';
import { createApiLimiter } from '../../src/utils/rate-limiter/apiLimiter.ts';
import { createTestClient } from './setup.ts';

test('profile routes use verified identity and reject role or UID updates', async () => {
  const db = createTestClient();
  const uid = randomUUID();
  try {
    const app = createApp(undefined, parseEnvironment({}), () => {}, {
      userService: createUserService(createUserRepository(db)),
      verifyToken: async (token) => {
        if (token !== 'valid') throw new Error('invalid token');
        return { uid, name: 'Original' };
      },
      rateLimiter: createApiLimiter(new MemoryStore()),
    });
    assert.equal((await request(app).get('/api/v1/me')).status, 401);
    const profile = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer valid');
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.firebaseUid, undefined);
    assert.equal(
      (
        await request(app)
          .patch('/api/v1/me')
          .set('Authorization', 'Bearer valid')
          .send({ displayName: 'Edited' })
      ).body.data.displayName,
      'Edited',
    );
    for (const body of [
      { displayName: 'Bad', role: 'ADMIN' },
      { displayName: 'Bad', uid: 'foreign' },
    ]) {
      assert.equal(
        (
          await request(app)
            .patch('/api/v1/me')
            .set('Authorization', 'Bearer valid')
            .send(body)
        ).status,
        400,
      );
    }
    const unchanged = await db.user.findUniqueOrThrow({ where: { firebaseUid: uid } });
    assert.equal(unchanged.role, 'USERS');
    assert.equal(unchanged.displayName, 'Edited');
  } finally {
    await db.user.deleteMany({ where: { firebaseUid: uid } });
    await db.$disconnect();
  }
});
