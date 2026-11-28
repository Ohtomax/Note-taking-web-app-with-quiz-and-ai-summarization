import { z } from 'zod';
import { questionTypeSchema } from './quiz-settings';
import type { QuizSettings } from './quiz-settings';
import type { QuizDraft } from './quiz';
import { sourceMetadataSchema } from './study';
export const quizMetaSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const quizVersionSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  version: z.number().int().positive(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'MIXED']),
  defaultMode: z.enum(['PRACTICE', 'EXAM']),
  includeExplanations: z.boolean(),
  generatedAt: z.string().datetime(),
  promptVersion: z.string(),
  sources: z.array(sourceMetadataSchema),
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int(),
      type: questionTypeSchema,
      prompt: z.string(),
      explanation: z.string().nullable(),
      acceptedAnswers: z.array(z.string()),
      sourceKeys: z.array(z.string()),
      options: z.array(
        z.object({
          id: z.string().uuid(),
          position: z.number().int(),
          text: z.string(),
          isCorrect: z.boolean(),
        }),
      ),
    }),
  ),
});
export type QuizVersion = z.infer<typeof quizVersionSchema>;
export const quizVersionResponseSchema = z.object({ data: quizVersionSchema });
export const quizMetaResponseSchema = z.object({ data: quizMetaSchema });
export function authoringDraft(
  version: QuizVersion,
  title: string,
): { settings: QuizSettings; content: QuizDraft } {
  return {
    settings: {
      title,
      questionCount: version.questions.length,
      difficulty: version.difficulty,
      defaultMode: version.defaultMode,
      includeExplanations: version.includeExplanations,
      questionTypes: [...new Set(version.questions.map((question) => question.type))],
    },
    content: {
      title,
      questions: version.questions.map((question) => {
        const base = {
          prompt: question.prompt,
          explanation: question.explanation,
          sourceKeys: question.sourceKeys,
        };
        return question.type === 'IDENTIFICATION'
          ? { ...base, type: question.type, acceptedAnswers: question.acceptedAnswers }
          : {
              ...base,
              type: question.type,
              options: question.options.map((option) => ({
                id: option.id,
                text: option.text,
              })),
              correctOptionIds: question.options
                .filter((option) => option.isCorrect)
                .map((option) => option.id),
            };
      }),
    },
  };
}

export const versionHeaderSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'MIXED']),
  generatedAt: z.string().datetime(),
  _count: z.object({ questions: z.number().int() }),
});
export const quizPageSchema = z.object({
  data: z.array(quizMetaSchema.extend({ versions: z.array(versionHeaderSchema) })),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const versionPageSchema = z.object({
  data: z.array(
    versionHeaderSchema.extend({
      quizId: z.string().uuid(),
      defaultMode: z.enum(['PRACTICE', 'EXAM']),
      includeExplanations: z.boolean(),
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const duplicateQuizResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    title: z.string(),
    versions: z.array(quizVersionSchema),
  }),
});
export const renameQuizResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    title: z.string(),
    updatedAt: z.string().datetime(),
  }),
});
export interface QuizRegenerationTarget {
  quizId: string;
  expectedVersion: number;
}
