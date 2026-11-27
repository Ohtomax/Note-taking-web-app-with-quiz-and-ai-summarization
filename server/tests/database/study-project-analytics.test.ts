import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedAnalyticsFixture } from './analytics.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';
test('P5-T21 project difficulty/type aggregates retain attempted versions and exclude another project', async () => {
  await withWorkspace(async ({ db, project, foreign, api }) => {
    const fixture = await seedAnalyticsFixture(db, api, project.id, foreign.id);
    const suffix =
      '?from=' +
      encodeURIComponent(fixture.from) +
      '&to=' +
      encodeURIComponent(fixture.to);
    const get = (id: string) =>
      api
        .get('/api/v1/projects/' + id + '/analytics' + suffix)
        .set('Authorization', 'Bearer alice');
    const report = await get(project.id);
    assert.equal(report.status, 200);
    assert.equal(report.body.data.totals.meanScore, 62.5);
    const editedSettings = quizSettingsSchema.parse({
      title: 'Metric quiz',
      questionCount: 4,
      difficulty: 'MEDIUM',
      questionTypes: [
        'MULTIPLE_CHOICE',
        'TRUE_FALSE',
        'MULTIPLE_SELECT',
        'IDENTIFICATION',
      ],
      defaultMode: 'EXAM',
      includeExplanations: true,
    });
    assert.equal(
      (
        await api
          .post('/api/v1/quizzes/' + fixture.quizId + '/versions')
          .set('Authorization', 'Bearer alice')
          .send({
            expectedVersion: 2,
            settings: editedSettings,
            content: validQuiz(editedSettings, ['source']),
          })
      ).status,
      201,
    );
    assert.equal(
      (await get(project.id)).body.data.breakdowns.difficulty.find(
        (row: { difficulty: string }) => row.difficulty === 'MEDIUM',
      ).attempts,
      0,
    );
    const breakdown = report.body.data.breakdowns;
    assert.equal(
      breakdown.difficulty.find(
        (row: { difficulty: string }) => row.difficulty === 'EASY',
      ).meanScore,
      100,
    );
    assert.equal(
      breakdown.difficulty.find(
        (row: { difficulty: string }) => row.difficulty === 'HARD',
      ).meanScore,
      25,
    );
    const types = new Map<
      string,
      { assigned: number; answered: number; correct: number; skipped: number }
    >(breakdown.types.map((row: { type: string }) => [row.type, row]));
    assert.equal(types.get('MULTIPLE_CHOICE')!.correct, 2);
    assert.equal(types.get('IDENTIFICATION')!.assigned, 2);
    assert.equal(types.get('IDENTIFICATION')!.answered, 1);
    assert.equal(types.get('IDENTIFICATION')!.skipped, 1);
    assert.equal(types.get('TRUE_FALSE')!.correct, 0);
    assert.equal(types.get('MULTIPLE_SELECT')!.correct, 0);
    const empty = await get(fixture.secondProjectId);
    assert.equal(empty.body.data.totals.meanScore, null);
    const other = await seedStudyQuiz(db, fixture.secondProjectId);
    const start = await api
      .post('/api/v1/quizzes/' + other.quiz.id + '/attempts')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: other.version.id, mode: 'EXAM' });
    await api
      .post('/api/v1/attempts/' + start.body.data.id + '/submit')
      .set('Authorization', 'Bearer alice')
      .send({});
    assert.equal((await get(fixture.secondProjectId)).body.data.totals.meanScore, 0);
    assert.equal((await get(project.id)).body.data.totals.meanScore, 62.5);
    assert.equal((await get(foreign.id)).status, 404);
  });
});
