import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDatabaseFixture } from './setup.ts';

test('quiz versions keep independent answer keys and source revisions', async () => {
  await withDatabaseFixture(async (db) => {
    const user = await db.user.create({ data: { firebaseUid: randomUUID() } });
    const project = await db.project.create({ data: { title: 'P', ownerId: user.id } });
    const quiz = await db.quiz.create({ data: { title: 'Q', projectId: project.id } });
    for (const version of [1, 2]) {
      await db.quizVersion.create({
        data: {
          quizId: quiz.id,
          version,
          difficulty: version === 1 ? 'EASY' : 'HARD',
          promptVersion: 'v1',
          sources: {
            create: {
              sourceKey: 'source',
              noteTitle: 'Original',
              revision: version,
              contentHash: 'a'.repeat(64),
            },
          },
          questions: {
            create: {
              position: 1,
              type: 'IDENTIFICATION',
              prompt: 'Protocol?',
              acceptedAnswers: [version === 1 ? 'TCP' : 'IP'],
            },
          },
        },
      });
    }
    const versions = await db.quizVersion.findMany({
      where: { quizId: quiz.id },
      orderBy: { version: 'asc' },
      include: { sources: true, questions: true },
    });
    assert.deepEqual(versions[0]?.questions[0]?.acceptedAnswers, ['TCP']);
    assert.deepEqual(versions[1]?.questions[0]?.acceptedAnswers, ['IP']);
    assert.equal(versions[0]?.sources[0]?.revision, 1);
  });
});
