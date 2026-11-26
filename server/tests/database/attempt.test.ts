import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '../../src/generated/prisma/client.ts';
import { withDatabaseFixture } from './setup.ts';

const attemptFixture = async (db: Prisma.TransactionClient) => {
  const user = await db.user.create({ data: { firebaseUid: randomUUID() } });
  const project = await db.project.create({ data: { title: 'P', ownerId: user.id } });
  const quiz = await db.quiz.create({ data: { title: 'Q', projectId: project.id } });
  const versions = [];
  for (const version of [1, 2]) {
    versions.push(
      await db.quizVersion.create({
        data: {
          quizId: quiz.id,
          version,
          difficulty: 'EASY',
          promptVersion: 'v1',
          questions: { create: { position: 1, type: 'TRUE_FALSE', prompt: 'True?' } },
        },
        include: { questions: true },
      }),
    );
  }
  const first = versions[0]!;
  const attempt = await db.quizAttempt.create({
    data: {
      versionId: first.id,
      requestKey: randomUUID(),
      mode: 'EXAM',
      totalQuestions: 1,
    },
  });
  return { first, second: versions[1]!, attempt };
};

test('retakes are separate and answer rows reference the attempted version', async () => {
  await withDatabaseFixture(async (db) => {
    const { first, attempt } = await attemptFixture(db);
    const retake = await db.quizAttempt.create({
      data: {
        versionId: first.id,
        requestKey: randomUUID(),
        mode: 'EXAM',
        totalQuestions: 1,
      },
    });
    assert.notEqual(attempt.id, retake.id);
    await db.quizAttemptAnswer.create({
      data: {
        attemptId: attempt.id,
        versionId: first.id,
        questionId: first.questions[0]!.id,
      },
    });
  });
});

test('database rejects answers from another version and duplicate logical answers', async () => {
  await assert.rejects(
    withDatabaseFixture(async (db) => {
      const { first, second, attempt } = await attemptFixture(db);
      await db.quizAttemptAnswer.create({
        data: {
          attemptId: attempt.id,
          versionId: first.id,
          questionId: second.questions[0]!.id,
        },
      });
    }),
    { code: 'P2003' },
  );
  await assert.rejects(
    withDatabaseFixture(async (db) => {
      const { first, attempt } = await attemptFixture(db);
      const data = {
        attemptId: attempt.id,
        versionId: first.id,
        questionId: first.questions[0]!.id,
      };
      await db.quizAttemptAnswer.create({ data });
      await db.quizAttemptAnswer.create({ data });
    }),
    { code: 'P2002' },
  );
});
