import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { versionData } from '../../src/repositories/quizzes.repository.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';
test('P6-T07 1/1 plus 1/3 with every question answered yields 66.67% mean and 50% accuracy across all scopes', async () => {
  await withWorkspace(async ({ db, api, project, foreign }) => {
    const source = {
      sourceKey: 'source',
      noteId: '',
      noteTitle: 'Fixture',
      revision: 1,
      contentHash: 'a'.repeat(64),
      rangeStart: null,
      rangeEnd: null,
    };
    const versions = [1, 3].map((count, index) => {
      const settings = quizSettingsSchema.parse({
        title: 'Boundary arithmetic',
        questionCount: count,
        difficulty: index ? 'HARD' : 'EASY',
        questionTypes: ['MULTIPLE_CHOICE'],
        defaultMode: 'EXAM',
        includeExplanations: false,
      });
      return versionData(settings, validQuiz(settings, ['source']), [source], index + 1);
    });
    const quiz = await db.quiz.create({
      data: {
        projectId: project.id,
        title: 'Boundary arithmetic',
        versions: { create: versions },
      },
      include: {
        versions: {
          orderBy: { version: 'asc' },
          include: {
            questions: {
              orderBy: { position: 'asc' },
              include: { options: { orderBy: { position: 'asc' } } },
            },
          },
        },
      },
    });
    const finishTimes = ['2026-11-01T00:00:00.000Z', '2026-11-30T23:59:59.999Z'];
    for (const [index, version] of quiz.versions.entries()) {
      const start = await api
        .post('/api/v1/quizzes/' + quiz.id + '/attempts')
        .auth('alice', { type: 'bearer' })
        .set('Idempotency-Key', randomUUID())
        .send({ versionId: version.id, mode: 'EXAM' });
      assert.equal(start.status, 201);
      const id = start.body.data.id as string;
      for (const [questionIndex, question] of version.questions.entries()) {
        const option = question.options.find(
          (o) => o.isCorrect === (questionIndex === 0),
        )!;
        assert.equal(
          (
            await api
              .put('/api/v1/attempts/' + id + '/answers/' + question.id)
              .auth('alice', { type: 'bearer' })
              .send({ optionIds: [option.id] })
          ).status,
          200,
        );
      }
      assert.equal(
        (
          await api
            .post('/api/v1/attempts/' + id + '/submit')
            .auth('alice', { type: 'bearer' })
            .send({})
        ).status,
        200,
      );
      const finishedAt = new Date(finishTimes[index]!);
      await db.quizAttempt.update({
        where: { id },
        data: {
          finishedAt,
          startedAt: new Date(finishedAt.getTime() - (index + 1) * 1000),
          elapsedMs: (index + 1) * 1000,
          completedDay: new Date(finishedAt.toISOString().slice(0, 10) + 'T00:00:00Z'),
        },
      });
    }
    const foreignQuiz = await db.quiz.create({
      data: {
        projectId: foreign.id,
        title: 'Foreign',
        versions: { create: versions[0]! },
      },
      include: { versions: true },
    });
    await db.quizAttempt.create({
      data: {
        versionId: foreignQuiz.versions[0]!.id,
        requestKey: randomUUID(),
        mode: 'EXAM',
        status: 'COMPLETED',
        totalQuestions: 1,
        correctCount: 0,
        answeredCount: 1,
        scoreRatio: 0,
        elapsedMs: 9000,
        finishedAt: new Date(finishTimes[0]!),
        completedDay: new Date(finishTimes[0]!),
      },
    });
    for (const status of ['IN_PROGRESS', 'ABANDONED'] as const)
      await db.quizAttempt.create({
        data: {
          versionId: quiz.versions[0]!.id,
          requestKey: randomUUID(),
          mode: 'EXAM',
          status,
          totalQuestions: 1,
        },
      });
    const window = '?from=2026-11-01T00:00:00.000Z&to=2026-12-01T00:00:00.000Z';
    for (const path of [
      '/analytics',
      '/projects/' + project.id + '/analytics',
      '/quizzes/' + quiz.id + '/analytics',
    ]) {
      const response = await api
        .get('/api/v1' + path + window)
        .auth('alice', { type: 'bearer' });
      assert.equal(response.status, 200);
      const t = response.body.data.totals;
      assert.equal(t.completedAttempts, 2);
      assert.equal(t.questionsAssigned, 4);
      assert.equal(t.answered, 4);
      assert.equal(t.correct, 2);
      assert.equal(t.incorrect, 2);
      assert.equal(t.skipped, 0);
      assert.equal(t.accuracy, 50);
      assert.equal(t.meanScore.toFixed(2), '66.67');
      assert.equal(t.highestScore, 100);
      assert.equal(t.firstScore, 100);
      assert.equal(t.latestScore.toFixed(2), '33.33');
      assert.equal(t.meanElapsedMs, 1500);
    }
    const firstDay = await api
      .get('/api/v1/analytics?from=2026-11-01T00:00:00.000Z&to=2026-11-02T00:00:00.000Z')
      .auth('alice', { type: 'bearer' });
    assert.equal(firstDay.body.data.totals.completedAttempts, 1);
    assert.equal(firstDay.body.data.totals.meanScore, 100);
    const empty = await api
      .get('/api/v1/analytics?from=2026-12-01T00:00:00.000Z&to=2026-12-02T00:00:00.000Z')
      .auth('alice', { type: 'bearer' });
    assert.equal(empty.body.data.totals.completedAttempts, 0);
    assert.equal(empty.body.data.totals.meanScore, null);
    assert.equal(empty.body.data.totals.accuracy, null);
    const groups = await api
      .get('/api/v1/projects/' + project.id + '/analytics' + window)
      .auth('alice', { type: 'bearer' });
    assert.equal(
      groups.body.data.breakdowns.difficulty.find(
        (r: { difficulty: string }) => r.difficulty === 'EASY',
      ).meanScore,
      100,
    );
    assert.equal(
      groups.body.data.breakdowns.difficulty
        .find((r: { difficulty: string }) => r.difficulty === 'HARD')
        .meanScore.toFixed(2),
      '33.33',
    );
  });
});
