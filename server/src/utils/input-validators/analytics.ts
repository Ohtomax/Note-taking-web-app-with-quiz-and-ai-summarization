import { z } from 'zod';
export const analyticsQuerySchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export const quizAnalyticsQuerySchema = analyticsQuerySchema
  .extend({ versionPage: z.coerce.number().int().min(1).max(100000).default(1) })
  .strict();
export type QuizAnalyticsQuery = z.infer<typeof quizAnalyticsQuerySchema>;
export interface AnalyticsWindow {
  from: Date;
  to: Date;
}
