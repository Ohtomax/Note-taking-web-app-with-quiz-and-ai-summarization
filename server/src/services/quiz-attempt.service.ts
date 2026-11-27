import type {
  QuizAttemptRepository,
  AttemptRow,
} from '@/repositories/quiz-attempt.repository.js';
import type { StartAttemptInput } from '@/utils/input-validators/quiz-attempt.validator.js';
export function attemptSummary(row: AttemptRow) {
  return {
    id: row.id,
    quizId: row.version.quiz.id,
    projectId: row.version.quiz.projectId,
    quizTitle: row.version.quiz.title,
    versionId: row.versionId,
    version: row.version.version,
    difficulty: row.version.difficulty,
    mode: row.mode,
    status: row.status,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    totalQuestions: row.totalQuestions,
    questionOrder: row.questionOrder,
    optionOrder: row.optionOrder,
  };
}
export const createQuizAttemptService = (repository: QuizAttemptRepository) => ({
  start: async (ownerId: string, quizId: string, key: string, input: StartAttemptInput) =>
    attemptSummary(await repository.start(ownerId, quizId, key, input)),
});
export type QuizAttemptService = ReturnType<typeof createQuizAttemptService>;
