import { z } from 'zod';
import { questionTypeSchema } from './quiz-settings';
import { sourceMetadataSchema } from './study';
export const attemptResultSchema = z
  .object({
    correctCount: z.number().int(),
    answeredCount: z.number().int(),
    totalQuestions: z.number().int(),
    incorrectCount: z.number().int(),
    unansweredCount: z.number().int(),
    percentage: z.number().nullable(),
    elapsedMs: z.number().nullable(),
  })
  .strict();
export const playerQuestionSchema = z
  .object({
    id: z.string().uuid(),
    position: z.number().int(),
    type: questionTypeSchema,
    prompt: z.string(),
    options: z.array(z.object({ id: z.string().uuid(), text: z.string() }).strict()),
    sourceKeys: z.array(z.string()),
    feedback: z
      .object({
        isCorrect: z.boolean(),
        correctOptionIds: z.array(z.string().uuid()),
        acceptedAnswers: z.array(z.string()),
        explanation: z.string().nullable(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const playerAnswerSchema = z
  .object({
    questionId: z.string().uuid(),
    selectedOptionIds: z.array(z.string().uuid()),
    text: z.string().nullable(),
    revision: z.number().int(),
    submittedAt: z.string().datetime(),
  })
  .strict();
export const attemptSchema = z
  .object({
    lastQuestionIndex: z.number().int().nonnegative(),
    result: attemptResultSchema.optional(),
    id: z.string().uuid(),
    quizId: z.string().uuid(),
    projectId: z.string().uuid(),
    quizTitle: z.string(),
    versionId: z.string().uuid(),
    version: z.number().int(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    mode: z.enum(['PRACTICE', 'EXAM']),
    status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']),
    startedAt: z.string().datetime(),
    finishedAt: z.string().datetime().nullable(),
    totalQuestions: z.number().int(),
    questionOrder: z.array(z.string().uuid()),
    optionOrder: z.record(z.array(z.string().uuid())),
    questions: z.array(playerQuestionSchema),
    answers: z.array(playerAnswerSchema),
    sources: z.array(sourceMetadataSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.status === 'COMPLETED') !== Boolean(value.result))
      context.addIssue({
        code: 'custom',
        message: 'Attempt result does not match its terminal state',
      });
    for (const question of value.questions)
      if (
        question.feedback &&
        value.status !== 'COMPLETED' &&
        (value.mode === 'EXAM' ||
          !value.answers.some((answer) => answer.questionId === question.id))
      )
        context.addIssue({
          code: 'custom',
          message: 'Unexpected answer disclosure in player response',
        });
  });
export type PlayerAttempt = z.infer<typeof attemptSchema>;
export type PlayerQuestion = z.infer<typeof playerQuestionSchema>;
export const attemptResponseSchema = z.object({ data: attemptSchema });
export interface StartAttemptInput {
  versionId: string;
  mode: 'PRACTICE' | 'EXAM';
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}
export interface SaveAnswerInput {
  expectedAnswerRevision: number;
  optionIds?: string[] | undefined;
  text?: string | undefined;
}

export const openAttemptSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  projectId: z.string().uuid(),
  versionId: z.string().uuid(),
  quizTitle: z.string(),
  version: z.number().int(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  mode: z.enum(['PRACTICE', 'EXAM']),
  status: z.literal('IN_PROGRESS'),
  startedAt: z.string().datetime(),
  lastQuestionIndex: z.number().int(),
  totalQuestions: z.number().int(),
});
export type OpenAttempt = z.infer<typeof openAttemptSchema>;
export const openAttemptPageSchema = z.object({
  data: z.array(openAttemptSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const attemptResultResponseSchema = attemptResponseSchema.refine(
  (response) => response.data.status === 'COMPLETED' && Boolean(response.data.result),
  'Completed results are required',
);
