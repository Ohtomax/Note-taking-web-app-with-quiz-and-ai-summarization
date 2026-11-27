import { z } from 'zod';
export const analyticsQuerySchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export interface AnalyticsWindow {
  from: Date;
  to: Date;
}
