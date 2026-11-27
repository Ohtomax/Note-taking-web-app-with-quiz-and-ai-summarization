import type { Analytics } from '@/types/analytics';
export function analyticsFixture(): Analytics {
  return {
    scope: { kind: 'GLOBAL', id: null, title: 'All study activity' },
    window: { from: '2026-11-01T00:00:00.000Z', to: '2026-12-01T00:00:00.000Z' },
    workspace: {
      projects: 2,
      archivedProjects: 0,
      notes: 2,
      archivedNotes: 1,
      summaries: 1,
      quizzes: 1,
    },
    statusCounts: { IN_PROGRESS: 1, COMPLETED: 2, ABANDONED: 1 },
    totals: {
      completedAttempts: 2,
      scoredAttempts: 2,
      durationSamples: 2,
      questionsAssigned: 6,
      answered: 5,
      correct: 3,
      incorrect: 2,
      skipped: 1,
      meanScore: 62.5,
      highestScore: 100,
      accuracy: 60,
      totalElapsedMs: 3000,
      meanElapsedMs: 1500,
      firstScore: 100,
      latestScore: 25,
      improvement: -75,
    },
    trend: [
      {
        day: '2026-11-26T00:00:00.000Z',
        attempts: 2,
        meanScore: 62.5,
        accuracy: 60,
        correct: 3,
        incorrect: 2,
        skipped: 1,
      },
    ],
    recent: [],
  };
}
