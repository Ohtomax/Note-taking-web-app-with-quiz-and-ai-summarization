import { z } from 'zod';
export const startAttemptSchema = z
  .object({
    versionId: z.string().uuid(),
    mode: z.enum(['PRACTICE', 'EXAM']),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
  })
  .strict();
export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export const attemptParamsSchema = z.object({ attemptId: z.string().uuid() }).strict();
