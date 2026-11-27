import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
import { versionData } from '../../src/repositories/quizzes.repository.ts';
import { validQuiz } from '../fixtures/ai.ts';
test('P5-T18 comparison spans immutable versions and excludes unfinished/foreign scores', async () => {
  await withWorkspace(async ({ db, project, foreign, api }) => {
    const { quiz, version, settings } = await seedStudyQuiz(db, project.id),
      outside = await seedStudyQuiz(db, foreign.id);
    const harder = { ...settings, difficulty: 'HARD' as const };
    const second = await db.quizVersion.create({
      data: {
        quizId: quiz.id,
        ...versionData(
          harder,
          validQuiz(harder, ['source']),
          [
            {
              sourceKey: 'source',
              noteId: '',
              noteTitle: 'Notes',
              revision: 1,
              contentHash: 'a'.repeat(64),
              rangeStart: null,
              rangeEnd: null,
            },
          ],
          2,
        ),
      },
    });
    const stamp = Date.now() - 10000,
      attempts = [];
    for (const [index, correctCount] of [1, 2, 3].entries()) {
      attempts.push(
        await db.quizAttempt.create({
          data: {
            versionId: index === 2 ? second.id : version.id,
            requestKey: randomUUID(),
            mode: 'EXAM',
            status: 'COMPLETED',
            totalQuestions: 4,
            correctCount,
            answeredCount: 4,
            startedAt: new Date(stamp + index * 1000),
            finishedAt: new Date(stamp + index * 1000 + 500),
          },
        }),
      );
    }
    await db.quizAttempt.create({
      data: {
        versionId: version.id,
        requestKey: randomUUID(),
        mode: 'EXAM',
        totalQuestions: 4,
      },
    });
    await db.quizAttempt.create({
      data: {
        versionId: outside.version.id,
        requestKey: randomUUID(),
        mode: 'EXAM',
        status: 'COMPLETED',
        totalQuestions: 4,
        correctCount: 4,
        answeredCount: 4,
        finishedAt: new Date(),
      },
    });
    const url = '/api/v1/attempts/' + attempts[1]!.id + '/comparison';
    const response = await api.get(url).set('Authorization', 'Bearer alice');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.attemptCount, 3);
    assert.equal(response.body.data.bestScore, 75);
    assert.equal(response.body.data.first.percentage, 25);
    assert.equal(response.body.data.selected.percentage, 50);
    assert.equal(response.body.data.latest.percentage, 75);
    assert.equal(response.body.data.latest.version, 2);
    assert.equal((await api.get(url).set('Authorization', 'Bearer bob')).status, 404);
  });
});
