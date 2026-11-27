import { z } from 'zod';
const count = z.number().int().nonnegative(),
  percent = z.number().min(0).max(100).nullable();
const samples = {
  attempts: count,
  assigned: count,
  answered: count,
  correct: count,
  incorrect: count,
  skipped: count,
  accuracy: percent,
};
export const analyticsSchema = z.object({
  scope: z.object({
    kind: z.enum(['GLOBAL', 'PROJECT', 'QUIZ']),
    id: z.string().nullable(),
    title: z.string(),
  }),
  window: z.object({ from: z.string().datetime(), to: z.string().datetime() }),
  workspace: z.object({
    projects: count,
    archivedProjects: count,
    notes: count,
    archivedNotes: count,
    summaries: count,
    quizzes: count,
  }),
  statusCounts: z.object({ IN_PROGRESS: count, COMPLETED: count, ABANDONED: count }),
  totals: z.object({
    completedAttempts: count,
    scoredAttempts: count,
    durationSamples: count,
    questionsAssigned: count,
    answered: count,
    correct: count,
    incorrect: count,
    skipped: count,
    meanScore: percent,
    highestScore: percent,
    accuracy: percent,
    totalElapsedMs: z.number().nonnegative(),
    meanElapsedMs: z.number().nonnegative().nullable(),
    firstScore: percent,
    latestScore: percent,
    improvement: z.number().nullable(),
  }),
  trend: z.array(
    z.object({
      day: z.string().datetime(),
      attempts: count,
      meanScore: percent,
      accuracy: percent,
      correct: count,
      incorrect: count,
      skipped: count,
    }),
  ),
  recent: z.array(
    z.object({
      id: z.string().uuid(),
      quizId: z.string().uuid(),
      quizTitle: z.string(),
      projectId: z.string().uuid(),
      version: count,
      status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']),
      startedAt: z.string().datetime(),
      finishedAt: z.string().datetime().nullable(),
      percentage: percent,
    }),
  ),
  breakdowns: z
    .object({
      difficulty: z.array(
        z.object({ ...samples, difficulty: z.string(), meanScore: percent }),
      ),
      types: z.array(z.object({ ...samples, type: z.string(), score: percent })),
    })
    .optional(),
  versions: z
    .object({
      data: z.array(
        z.object({
          versionId: z.string().uuid(),
          version: count,
          difficulty: z.string(),
          generatedAt: z.string().datetime(),
          attempts: count,
          meanScore: percent,
          highestScore: percent,
          meanElapsedMs: z.number().nullable(),
        }),
      ),
      total: count,
      page: count,
      pageSize: count,
    })
    .optional(),
  missed: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        versionId: z.string().uuid(),
        version: count,
        prompt: z.string(),
        type: z.string(),
        incorrect: count,
        answered: count,
        assigned: count,
        skipped: count,
        wrongRate: percent,
      }),
    )
    .optional(),
});
export type Analytics = z.infer<typeof analyticsSchema>;
export interface AnalyticsScope {
  projectId?: string | undefined;
  quizId?: string | undefined;
}
