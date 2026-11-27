import { z } from 'zod';
import { quizQuestionSchema } from './quiz-question.js';
import type { QuizSettings } from '@/utils/input-validators/quizzes.js';
import { normalizeAnswer } from '@/services/answer-normalization.js';
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
export const quizResultSchema = (settings: QuizSettings, keys: string[]) =>
  quizDraftSchema.superRefine((draft, context) => {
    const issue = (message: string) => context.addIssue({ code: 'custom', message });
    if (
      draft.title !== settings.title ||
      draft.questions.length !== settings.questionCount
    )
      issue('Quiz title or question count does not match the request');
    const prompts = draft.questions.map((question) =>
      normalizeAnswer(question.prompt).replace(/[^\p{L}\p{N}]/gu, ''),
    );
    if (prompts.some((prompt) => !prompt) || new Set(prompts).size !== prompts.length)
      issue('Quiz questions must be distinct');
    if (
      settings.questionTypes.some(
        (type) => !draft.questions.some((question) => question.type === type),
      )
    )
      issue('A requested question type is missing');
    for (const question of draft.questions) {
      if (!settings.questionTypes.includes(question.type))
        issue('An unrequested question type was returned');
      if (
        settings.includeExplanations
          ? !question.explanation
          : question.explanation !== null
      )
        issue('Explanations do not match the request');
      if (
        new Set(question.sourceKeys).size !== question.sourceKeys.length ||
        question.sourceKeys.some((key) => !keys.includes(key))
      )
        issue('Question cites invalid or repeated sources');
    }
  });
