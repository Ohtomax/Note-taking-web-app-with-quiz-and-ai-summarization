import { z } from 'zod';
import { normalizeAnswer } from '@/services/answer-normalization.js';
export const questionBase = {
  prompt: z.string().trim().min(1).max(2000),
  explanation: z.string().trim().min(1).max(4000).nullable(),
  sourceKeys: z.array(z.string().min(1).max(100)).min(1).max(200),
};
export const choiceQuestionSchema = z
  .object({
    ...questionBase,
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT']),
    options: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
            text: z.string().trim().min(1).max(1000),
          })
          .strict(),
      )
      .min(2)
      .max(8),
    correctOptionIds: z.array(z.string().min(1).max(64)).min(1).max(8),
  })
  .strict()
  .superRefine((question, context) => {
    const ids = question.options.map((option) => option.id),
      labels = question.options.map((option) =>
        option.text.normalize('NFKC').replace(/\s+/gu, ' ').toLowerCase(),
      );
    const invalid =
      new Set(ids).size !== ids.length ||
      new Set(labels).size !== labels.length ||
      new Set(question.correctOptionIds).size !== question.correctOptionIds.length ||
      question.correctOptionIds.some((id) => !ids.includes(id));
    if (invalid)
      context.addIssue({
        code: 'custom',
        message: 'Options and answer references must be distinct and valid',
      });
    if (
      question.type === 'MULTIPLE_SELECT'
        ? question.correctOptionIds.length < 2 ||
          question.correctOptionIds.length >= ids.length
        : question.correctOptionIds.length !== 1
    )
      context.addIssue({ code: 'custom', message: 'Invalid answer cardinality' });
    if (
      question.type === 'TRUE_FALSE' &&
      (ids.length !== 2 || !labels.includes('true') || !labels.includes('false'))
    )
      context.addIssue({
        code: 'custom',
        message: 'True/false requires exactly True and False choices',
      });
  });
export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;

export const identificationQuestionSchema = z
  .object({
    ...questionBase,
    type: z.literal('IDENTIFICATION'),
    acceptedAnswers: z
      .array(
        z
          .string()
          .max(500)
          .refine(
            (value) => normalizeAnswer(value).length > 0,
            'Accepted answer cannot be blank',
          ),
      )
      .min(1)
      .max(20)
      .transform((answers) => [...new Set(answers.map(normalizeAnswer))]),
  })
  .strict();
export const quizQuestionSchema = z.union([
  choiceQuestionSchema,
  identificationQuestionSchema,
]);
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
