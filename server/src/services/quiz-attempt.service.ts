import { z } from 'zod';
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
export function playerAttempt(row: AttemptRow) {
  const storedOrder = z.array(z.string()).parse(row.questionOrder),
    optionOrder = z.record(z.array(z.string())).parse(row.optionOrder);
  const order = storedOrder.length
    ? storedOrder
    : row.version.questions.map((question) => question.id);
  const answers = row.answers.map((answer) => ({
    questionId: answer.questionId,
    selectedOptionIds: z.array(z.string()).parse(answer.selectedOptionIds),
    text: answer.text,
    revision: answer.revision,
    submittedAt: answer.submittedAt,
  }));
  const questions = order.map((id, index) => {
    const question = row.version.questions.find((item) => item.id === id)!;
    const answer = row.answers.find((item) => item.questionId === id);
    const options = (optionOrder[id] ?? question.options.map((option) => option.id)).map(
      (optionId) => ({
        id: optionId,
        text: question.options.find((option) => option.id === optionId)!.text,
      }),
    );
    const reveal =
      row.status === 'COMPLETED' || (row.mode === 'PRACTICE' && Boolean(answer));
    return {
      id: question.id,
      position: index + 1,
      type: question.type,
      prompt: question.prompt,
      options,
      sourceKeys: z.array(z.string()).parse(question.sourceKeys),
      ...(reveal
        ? {
            feedback: {
              isCorrect: answer?.isCorrect ?? false,
              correctOptionIds: question.options
                .filter((option) => option.isCorrect)
                .map((option) => option.id),
              acceptedAnswers:
                question.type === 'IDENTIFICATION'
                  ? z.array(z.string()).parse(question.acceptedAnswers)
                  : [],
              explanation: row.version.includeExplanations ? question.explanation : null,
            },
          }
        : {}),
    };
  });
  return {
    ...attemptSummary(row),
    questionOrder: order,
    optionOrder,
    questions,
    answers,
    sources: row.version.sources,
  };
}
export const createQuizAttemptService = (repository: QuizAttemptRepository) => ({
  start: async (ownerId: string, quizId: string, key: string, input: StartAttemptInput) =>
    playerAttempt(await repository.start(ownerId, quizId, key, input)),
  read: async (ownerId: string, id: string) =>
    playerAttempt(await repository.load(ownerId, id)),
});
export type QuizAttemptService = ReturnType<typeof createQuizAttemptService>;
