import { z } from 'zod';
import { sourceRequestSchema } from './ai-sources.js';
export const questionTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'MULTIPLE_SELECT',
  'IDENTIFICATION',
]);
export const quizSettingsSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    questionCount: z.number().int().min(1).max(50),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    questionTypes: z
      .array(questionTypeSchema)
      .min(1)
      .max(4)
      .refine((types) => new Set(types).size === types.length, 'Duplicate question type'),
    defaultMode: z.enum(['PRACTICE', 'EXAM']),
    includeExplanations: z.boolean(),
  })
  .strict()
  .refine(
    (settings) => settings.questionCount >= settings.questionTypes.length,
    'Each requested type requires a question',
  );
export type QuizSettings = z.infer<typeof quizSettingsSchema>;
export const quizGenerationSchema = z
  .object({
    operation: z.literal('QUIZ'),
    source: sourceRequestSchema,
    settings: quizSettingsSchema,
  })
  .strict();
export type QuizGenerationInput = z.infer<typeof quizGenerationSchema>;
