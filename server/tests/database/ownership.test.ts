import { randomUUID } from 'node:crypto';
import type { User, Project, Note } from '../../src/generated/prisma/client.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestClient } from './setup.ts';
import { createOwnershipRepository } from '../../src/repositories/ownership.repository.ts';
import { requireOwnedResource } from '../../src/services/ownership.service.ts';

test('owned queries hide foreign and mismatched nested resources', async () => {
  const db = createTestClient();
  const uids = [randomUUID(), randomUUID()];
  const userIds: string[] = [];
  const projectIds: string[] = [];
  try {
    const users: User[] = [];
    const projects: Project[] = [];
    const notes: Note[] = [];
    for (const uid of uids) {
      const user = await db.user.create({ data: { firebaseUid: uid } });
      userIds.push(user.id);
      users.push(user);
      const project = await db.project.create({
        data: { title: 'Private', ownerId: user.id },
      });
      projectIds.push(project.id);
      projects.push(project);
      notes.push(
        await db.note.create({ data: { title: 'Private', projectId: project.id } }),
      );
    }
    const repository = createOwnershipRepository(db);
    for (const index of [0, 1]) {
      const owner = users[index]!;
      const project = projects[index]!;
      const note = notes[index]!;
      const other = users[1 - index]!;
      assert.equal(
        (await requireOwnedResource(repository.note(owner.id, project.id, note.id))).id,
        note.id,
      );
      for (const result of [
        repository.note(other.id, project.id, note.id),
        repository.note(owner.id, projects[1 - index]!.id, note.id),
        repository.note(owner.id, project.id, randomUUID()),
      ]) {
        await assert.rejects(requireOwnedResource(result), {
          code: 'RESOURCE_NOT_FOUND',
          status: 404,
        });
      }
    }
  } finally {
    await db.note.deleteMany({ where: { projectId: { in: projectIds } } });
    await db.project.deleteMany({ where: { id: { in: projectIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
