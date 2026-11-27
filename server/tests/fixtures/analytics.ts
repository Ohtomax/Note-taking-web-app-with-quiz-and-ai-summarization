export const analyticsExamples = [
  { status: 'COMPLETED' as const, assigned: 2, answered: 2, correct: 2, elapsedMs: 1000 },
  { status: 'COMPLETED' as const, assigned: 4, answered: 3, correct: 1, elapsedMs: 2000 },
  { status: 'IN_PROGRESS' as const, assigned: 4, answered: 0, correct: 0, elapsedMs: 0 },
  { status: 'ABANDONED' as const, assigned: 4, answered: 0, correct: 0, elapsedMs: 0 },
];
export const expectedAnalytics = {
  completedAttempts: 2,
  questionsAssigned: 6,
  answered: 5,
  correct: 3,
  incorrect: 2,
  skipped: 1,
  meanScore: 62.5,
  accuracy: 60,
  highestScore: 100,
  firstScore: 100,
  latestScore: 25,
  improvement: -75,
  totalElapsedMs: 3000,
  meanElapsedMs: 1500,
};
