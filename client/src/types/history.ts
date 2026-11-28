import { z } from 'zod';
export const historyEntrySchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  version: z.number().int(),
  quizId: z.string().uuid(),
  quizTitle: z.string(),
  projectId: z.string().uuid(),
  projectTitle: z.string(),
  attemptNumber: z.number().int().positive().nullable().optional(),
  focusedReview: z.boolean().optional(),
  quizDeleted: z.boolean(),
  projectDeleted: z.boolean(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'MIXED']),
  mode: z.enum(['PRACTICE', 'EXAM']),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  lastQuestionIndex: z.number().int(),
  totalQuestions: z.number().int(),
  correctCount: z.number().int().nullable(),
  answeredCount: z.number().int().nullable(),
  percentage: z.number().nullable(),
  elapsedMs: z.number().nullable(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export const historyPageSchema = z.object({
  data: z.array(historyEntrySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
const comparisonAttemptSchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  version: z.number().int(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']),
  mode: z.enum(['PRACTICE', 'EXAM']),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  percentage: z.number().nullable(),
  elapsedMs: z.number().nullable(),
});
export const comparisonResponseSchema = z.object({
  data: z.object({
    quizId: z.string().uuid(),
    quizTitle: z.string(),
    attemptCount: z.number().int(),
    bestScore: z.number().nullable(),
    first: comparisonAttemptSchema.nullable(),
    selected: comparisonAttemptSchema.nullable(),
    latest: comparisonAttemptSchema.nullable(),
  }),
});
export interface HistoryQuery {
  page: number;
  projectId?: string | undefined;
  quizId?: string | undefined;
  status?: HistoryEntry['status'] | undefined;
}
