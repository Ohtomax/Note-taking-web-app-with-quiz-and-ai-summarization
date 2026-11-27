import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedAnalyticsFixture } from './analytics.fixture.ts';
test('P5-T22 quiz metrics preserve version-specific questions, retake samples and skipped denominators', async () => {
  await withWorkspace(async ({ db, project, foreign, api }) => {
    const fixture = await seedAnalyticsFixture(db, api, project.id, foreign.id),
      suffix =
        '?from=' +
        encodeURIComponent(fixture.from) +
        '&to=' +
        encodeURIComponent(fixture.to);
    const url = '/api/v1/quizzes/' + fixture.quizId,
      report = () =>
        api.get(url + '/analytics' + suffix).set('Authorization', 'Bearer alice');
    const before = await report();
    assert.equal(before.status, 200);
    const data = before.body.data;
    assert.equal(data.totals.meanScore, 62.5);
    assert.equal(data.totals.improvement, -75);
    assert.equal(data.totals.meanElapsedMs, 1500);
    assert.equal(data.versions.total, 2);
    assert.deepEqual(
      data.versions.data.map((row: { meanScore: number }) => row.meanScore),
      [100, 25],
    );
    assert.equal(data.missed.length, 2);
    assert.ok(
      data.missed.every(
        (row: { versionId: string; wrongRate: number }) =>
          row.versionId === fixture.secondVersionId && row.wrongRate === 100,
      ),
    );
    const version = await db.quizVersion.findUniqueOrThrow({
      where: { id: fixture.secondVersionId },
      include: {
        questions: { orderBy: { position: 'asc' }, include: { options: true } },
      },
    });
    const started = await api
      .post(url + '/attempts')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: version.id, mode: 'EXAM' });
    const q = version.questions[0]!;
    await api
      .put('/api/v1/attempts/' + started.body.data.id + '/answers/' + q.id)
      .set('Authorization', 'Bearer alice')
      .send({ optionIds: [q.options.find((option) => option.isCorrect)!.id] });
    await api
      .post('/api/v1/attempts/' + started.body.data.id + '/submit')
      .set('Authorization', 'Bearer alice')
      .send({});
    const after = await report();
    assert.equal(after.body.data.totals.meanScore, 50);
    assert.ok(
      after.body.data.missed.every(
        (row: {
          assigned: number;
          answered: number;
          incorrect: number;
          skipped: number;
        }) =>
          row.assigned === 2 &&
          row.answered === 1 &&
          row.incorrect === 1 &&
          row.skipped === 1,
      ),
    );
    assert.equal(after.body.data.versions.data[1].attempts, 2);
    const outside = await db.quiz.findFirstOrThrow({ where: { projectId: foreign.id } });
    assert.equal(
      (
        await api
          .get('/api/v1/quizzes/' + outside.id + '/analytics' + suffix)
          .set('Authorization', 'Bearer alice')
      ).status,
      404,
    );
    assert.equal(
      (
        await api
          .delete(url)
          .set('Authorization', 'Bearer alice')
          .send({ confirmed: true })
      ).status,
      204,
    );
    const retained = await report();
    assert.equal(retained.status, 200);
    assert.equal(retained.body.data.totals.meanScore, 50);
    assert.equal(retained.body.data.workspace.quizzes, 0);
  });
});
