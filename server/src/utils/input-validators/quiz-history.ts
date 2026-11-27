import { z } from 'zod';
import { usageQuerySchema } from './ai-usage.js';
export const quizHistoryQuerySchema = usageQuerySchema
  .extend({
    projectId: z.string().uuid().optional(),
    quizId: z.string().uuid().optional(),
    status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (value) => !value.from || !value.to || value.from < value.to,
    'Use an inclusive from before the exclusive to date',
  );
export type QuizHistoryQuery = z.infer<typeof quizHistoryQuerySchema>;
