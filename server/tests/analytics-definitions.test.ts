import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsExamples, expectedAnalytics } from './fixtures/analytics.ts';
test('P5-T19 hand-calculated denominators weight attempts equally and exclude unfinished scores', () => {
  const completed = analyticsExamples.filter((attempt) => attempt.status === 'COMPLETED');
  const assigned = completed.reduce((sum, row) => sum + row.assigned, 0),
    answered = completed.reduce((sum, row) => sum + row.answered, 0),
    correct = completed.reduce((sum, row) => sum + row.correct, 0);
  assert.equal(completed.length, expectedAnalytics.completedAttempts);
  assert.equal(assigned, 6);
  assert.equal(answered, 5);
  assert.equal(correct, 3);
  assert.equal(
    completed.reduce((sum, row) => sum + (100 * row.correct) / row.assigned, 0) /
      completed.length,
    62.5,
  );
  assert.equal((100 * correct) / answered, 60);
  assert.equal(answered - correct, 2);
  assert.equal(assigned - answered, 1);
  assert.notEqual((100 * correct) / assigned, expectedAnalytics.meanScore);
  assert.equal(
    expectedAnalytics.latestScore - expectedAnalytics.firstScore,
    expectedAnalytics.improvement,
  );
});
