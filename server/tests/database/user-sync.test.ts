import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestClient } from './setup.ts';
import { createUserRepository } from '../../src/repositories/user.repository.ts';
import { createUserService } from '../../src/services/user.service.ts';

test('parallel first sign-ins create one user and later sign-in preserves profile edits', async () => {
  const prisma = createTestClient();
  const uid = randomUUID();
  try {
    const service = createUserService(createUserRepository(prisma));
    const identity = { uid, name: 'Initial name', email: 'synthetic@example.test' };
    const profiles = await Promise.all(
      Array.from({ length: 8 }, () => service.synchronize(identity)),
    );
    assert.equal(new Set(profiles.map((profile) => profile.id)).size, 1);
    assert.equal(await prisma.user.count({ where: { firebaseUid: uid } }), 1);
    await service.updateProfile(profiles[0]!.id, 'Edited name');
    assert.equal((await service.synchronize(identity)).displayName, 'Edited name');
  } finally {
    await prisma.user.deleteMany({ where: { firebaseUid: uid } });
    await prisma.$disconnect();
  }
});
