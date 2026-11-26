import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDatabaseFixture } from './setup.ts';
import { createAccountFixture } from '../fixtures/accounts.ts';
import { createOwnershipRepository } from '../../src/repositories/ownership.repository.ts';
import { requireOwnedResource } from '../../src/services/ownership.service.ts';

test('two-account fixture verifies every ownership chain in both directions', async () => {
  await withDatabaseFixture(async (db) => {
    const first = await createAccountFixture(db);
    const second = await createAccountFixture(db);
    const repository = createOwnershipRepository(db);
    for (const [owner, other] of [
      [first, second],
      [second, first],
    ] as const) {
      const ownReads = [
        repository.project(owner.user.id, owner.project.id),
        repository.note(owner.user.id, owner.project.id, owner.note.id),
        repository.summary(owner.user.id, owner.summary.id),
        repository.quiz(owner.user.id, owner.quiz.id),
        repository.question(owner.user.id, owner.question.id),
        repository.attempt(owner.user.id, owner.attempt.id),
        repository.usage(owner.user.id, owner.usage.id),
        repository.version(owner.user.id, owner.quiz.id, owner.version.id),
        repository.option(owner.user.id, owner.question.id, owner.option.id),
        repository.answer(owner.user.id, owner.attempt.id, owner.answer.id),
        repository.summarySource(owner.user.id, owner.summary.id, owner.summarySource.id),
        repository.quizSource(owner.user.id, owner.version.id, owner.quizSource.id),
      ];
      for (const read of ownReads) assert.ok(await requireOwnedResource(read));
      const foreignReads = [
        repository.project(other.user.id, owner.project.id),
        repository.note(other.user.id, owner.project.id, owner.note.id),
        repository.summary(other.user.id, owner.summary.id),
        repository.quiz(other.user.id, owner.quiz.id),
        repository.question(other.user.id, owner.question.id),
        repository.attempt(other.user.id, owner.attempt.id),
        repository.usage(other.user.id, owner.usage.id),
        repository.project(other.user.id, randomUUID()),
        repository.version(other.user.id, owner.quiz.id, owner.version.id),
        repository.option(other.user.id, owner.question.id, owner.option.id),
        repository.answer(other.user.id, owner.attempt.id, owner.answer.id),
        repository.summarySource(other.user.id, owner.summary.id, owner.summarySource.id),
        repository.quizSource(other.user.id, owner.version.id, owner.quizSource.id),
      ];
      for (const read of foreignReads) {
        await assert.rejects(requireOwnedResource(read), {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          status: 404,
        });
      }
    }
    assert.equal(
      await db.note.count({ where: { id: { in: [first.note.id, second.note.id] } } }),
      2,
    );
  });
});
