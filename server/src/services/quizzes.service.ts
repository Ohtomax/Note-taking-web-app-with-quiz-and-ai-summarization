import type { QuizzesRepository } from '@/repositories/quizzes.repository.js';
export const createQuizzesService = (repository: QuizzesRepository) => ({
  save: repository.save,
  authoring: repository.authoring,
});
export type QuizzesService = ReturnType<typeof createQuizzesService>;
