import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRevision, lockProject } from '../src/repositories/workspace.repository.ts';
import {
  projectListSchema,
  updateProjectSchema,
  deleteProjectSchema,
} from '../src/utils/input-validators/projects.ts';
import type { Prisma } from '../src/generated/prisma/client.ts';

test('workspace validation bounds pagination and requires explicit current-impact confirmation', () => {
  assert.equal(projectListSchema.parse({}).pageSize, 20);
  for (const query of [
    { page: 0 },
    { pageSize: 51 },
    { archived: 'yes' },
    { sort: 'ownerId' },
  ]) {
    assert.equal(projectListSchema.safeParse(query).success, false);
  }
  assert.equal(updateProjectSchema.safeParse({ expectedRevision: 1 }).success, false);
  assert.equal(
    updateProjectSchema.safeParse({ expectedRevision: 1, title: 'Valid', ownerId: 'bad' })
      .success,
    false,
  );
  assert.equal(
    deleteProjectSchema.safeParse({ confirmed: true, impactRevision: 1 }).success,
    true,
  );
  assert.equal(
    deleteProjectSchema.safeParse({ confirmed: false, impactRevision: 1 }).success,
    false,
  );
  assert.throws(() => checkRevision(2, 1), { code: 'REVISION_CONFLICT', status: 409 });
});

test('locked owner scope hides foreign projects and blocks archived writes', async () => {
  const calls: unknown[] = [];
  const transaction = (project: unknown) =>
    ({
      $queryRaw: async (...args: unknown[]) => {
        calls.push(args);
        return [];
      },
      project: {
        findFirst: async (input: unknown) => {
          calls.push(input);
          return project;
        },
      },
    }) as unknown as Prisma.TransactionClient;
  await assert.rejects(lockProject(transaction(null), 'owner', 'project'), {
    status: 404,
  });
  await assert.rejects(
    lockProject(transaction({ archivedAt: new Date() }), 'owner', 'project'),
    { code: 'PROJECT_ARCHIVED' },
  );
  await lockProject(transaction({ archivedAt: new Date() }), 'owner', 'project', false);
  assert.deepEqual(calls[1], {
    where: { id: 'project', ownerId: 'owner', deletedAt: null },
  });
});
