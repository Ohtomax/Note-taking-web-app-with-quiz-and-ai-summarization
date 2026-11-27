import { z } from 'zod';
import { quizSettingsSchema } from './quizzes.js';
import { quizDraftSchema } from '@/ai/schemas/quiz.js';
export const quizParamsSchema = z.object({ quizId: z.string().uuid() }).strict();
export const quizVersionParamsSchema = z
  .object({ quizId: z.string().uuid(), versionId: z.string().uuid() })
  .strict();

export const publishQuizSchema = z.union([
  z
    .object({
      expectedVersion: z.number().int().positive(),
      settings: quizSettingsSchema,
      content: quizDraftSchema,
    })
    .strict(),
  z
    .object({
      expectedVersion: z.number().int().positive(),
      generationId: z.string().uuid(),
    })
    .strict(),
]);
export type PublishQuizInput = z.infer<typeof publishQuizSchema>;
