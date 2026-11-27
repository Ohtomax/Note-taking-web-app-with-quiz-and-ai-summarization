import type { QuizHistoryRepository } from '@/repositories/quiz-history.repository.js';
export const createQuizHistoryService = (repository: QuizHistoryRepository) => ({
  list: repository.list,
  comparison: repository.comparison,
});
export type QuizHistoryService = ReturnType<typeof createQuizHistoryService>;
