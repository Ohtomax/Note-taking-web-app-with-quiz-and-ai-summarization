import { z } from 'zod';
import { quizSettingsSchema } from './quizzes.js';
import { quizDraftSchema } from '@/ai/schemas/quiz.js';
import { usageQuerySchema } from './ai-usage.js';
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
      settings: quizSettingsSchema.optional(),
      content: quizDraftSchema.optional(),
    })
    .strict()
    .refine(
      (input) => Boolean(input.settings) === Boolean(input.content),
      'Edited settings and content must be supplied together',
    ),
]);
export type PublishQuizInput = z.infer<typeof publishQuizSchema>;

export const renameQuizSchema = z
  .object({ title: z.string().trim().min(1).max(200) })
  .strict();
export const duplicateQuizSchema = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();
export const quizLibraryQuerySchema = usageQuerySchema
  .extend({ search: z.string().trim().max(200).default('') })
  .strict();

export const saveGeneratedQuizSchema = z
  .object({
    generationId: z.string().uuid(),
    settings: quizSettingsSchema.optional(),
    content: quizDraftSchema.optional(),
  })
  .strict()
  .refine(
    (input) => Boolean(input.settings) === Boolean(input.content),
    'Edited settings and content must be supplied together',
  );
