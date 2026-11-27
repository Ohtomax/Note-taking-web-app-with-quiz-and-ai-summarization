import type { QuizHistoryRepository } from '@/repositories/quiz-history.repository.js';
export const createQuizHistoryService = (repository: QuizHistoryRepository) => ({
  list: repository.list,
});
export type QuizHistoryService = ReturnType<typeof createQuizHistoryService>;
