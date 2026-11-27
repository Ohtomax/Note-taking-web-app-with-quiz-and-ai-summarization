import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withWorkspace } from './workspace.fixture.ts';
import { seedAnalyticsFixture } from './analytics.fixture.ts';
import { expectedAnalytics } from '../fixtures/analytics.ts';
test('P5-T20 global aggregates match the hand fixture without join multiplication or foreign data', async () => {
  await withWorkspace(async ({ db, project, foreign, api }) => {
    const fixture = await seedAnalyticsFixture(db, api, project.id, foreign.id);
    const query =
      '?from=' +
      encodeURIComponent(fixture.from) +
      '&to=' +
      encodeURIComponent(fixture.to);
    const response = await api
      .get('/api/v1/analytics' + query)
      .set('Authorization', 'Bearer alice');
    assert.equal(response.status, 200);
    const data = response.body.data;
    for (const [key, expected] of Object.entries(expectedAnalytics))
      assert.equal(data.totals[key], expected, key);
    assert.deepEqual(data.workspace, {
      projects: 2,
      archivedProjects: 0,
      notes: 2,
      archivedNotes: 1,
      summaries: 1,
      quizzes: 1,
    });
    assert.deepEqual(data.statusCounts, { IN_PROGRESS: 1, COMPLETED: 2, ABANDONED: 1 });
    const active = data.trend.find((row: { attempts: number }) => row.attempts > 0);
    assert.equal(active.attempts, 2);
    assert.equal(active.meanScore, 62.5);
    assert.equal(active.accuracy, 60);
    assert.equal(data.trend.length, 30);
    assert.ok(
      data.trend
        .filter((row: { attempts: number }) => !row.attempts)
        .every((row: { meanScore: number | null }) => row.meanScore === null),
    );
    const empty = await api
      .get('/api/v1/analytics?from=2025-01-01T00:00:00.000Z&to=2025-01-02T00:00:00.000Z')
      .set('Authorization', 'Bearer alice');
    assert.equal(empty.body.data.totals.meanScore, null);
    assert.equal(empty.body.data.totals.accuracy, null);
    assert.equal(empty.body.data.totals.completedAttempts, 0);
    assert.equal(
      (
        await api
          .get(
            '/api/v1/analytics?from=2020-01-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z',
          )
          .set('Authorization', 'Bearer alice')
      ).status,
      400,
    );
  });
});
