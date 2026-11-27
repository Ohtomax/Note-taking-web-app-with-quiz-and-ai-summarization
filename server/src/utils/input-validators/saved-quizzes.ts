import { z } from 'zod';
export const quizParamsSchema = z.object({ quizId: z.string().uuid() }).strict();
export const quizVersionParamsSchema = z
  .object({ quizId: z.string().uuid(), versionId: z.string().uuid() })
  .strict();
