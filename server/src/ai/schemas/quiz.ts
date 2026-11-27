import { z } from 'zod';
import { quizQuestionSchema } from './quiz-question.js';
export const quizDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    questions: z.array(quizQuestionSchema).min(1).max(50),
  })
  .strict();
export type QuizDraft = z.infer<typeof quizDraftSchema>;
export const quizSourcesSchema = (keys: string[]) =>
  quizDraftSchema.superRefine((draft, context) => {
    for (const question of draft.questions)
      if (question.sourceKeys.some((key) => !keys.includes(key)))
        context.addIssue({ code: 'custom', message: 'Question cites an invalid source' });
  });
