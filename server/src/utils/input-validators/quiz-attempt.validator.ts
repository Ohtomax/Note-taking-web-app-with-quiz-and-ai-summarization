import { z } from 'zod';
import { usageQuerySchema } from './ai-usage.js';
export const startAttemptSchema = z
  .object({
    versionId: z.string().uuid(),
    missedFromAttemptId: z.string().uuid().optional(),
    mode: z.enum(['PRACTICE', 'EXAM']),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
  })
  .strict();
export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export const attemptParamsSchema = z.object({ attemptId: z.string().uuid() }).strict();

export const answerParamsSchema = attemptParamsSchema
  .extend({ questionId: z.string().uuid() })
  .strict();
export const answerInputSchema = z
  .object({
    expectedAnswerRevision: z.number().int().min(0).max(100000000).default(0),
    questionIndex: z.number().int().min(0).max(49).optional(),
    optionIds: z.array(z.string().uuid()).max(8).optional(),
    text: z.string().max(500).optional(),
  })
  .strict()
  .refine(
    (input) => (input.optionIds !== undefined) !== (input.text !== undefined),
    'Supply either choices or identification text',
  );
export type AnswerInput = z.infer<typeof answerInputSchema>;

export const emptyActionSchema = z.object({}).strict();

export const locationSchema = z
  .object({ questionIndex: z.number().int().min(0).max(49) })
  .strict();
export const openAttemptQuerySchema = usageQuerySchema
  .extend({ quizId: z.string().uuid().optional() })
  .strict();
