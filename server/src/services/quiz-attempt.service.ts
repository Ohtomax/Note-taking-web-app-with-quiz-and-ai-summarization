import { z } from 'zod';
import type {
  QuizAttemptRepository,
  AttemptRow,
} from '@/repositories/quiz-attempt.repository.js';
import type { StartAttemptInput } from '@/utils/input-validators/quiz-attempt.validator.js';
import type { AnswerInput } from '@/utils/input-validators/quiz-attempt.validator.js';
import { scoreAnswer, scoreAttempt, type AnswerChoice } from './quiz-scoring.service.js';
import { normalizeAnswer } from './answer-normalization.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export function attemptSummary(row: AttemptRow) {
  return {
    id: row.id,
    attemptNumber: row.attemptNumber,
    focusedReview: row.focusedReview,
    lastQuestionIndex: row.lastQuestionIndex,
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
    const reveal = row.status === 'COMPLETED';
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
  const answeredCount =
    row.answeredCount ??
    row.answers.filter(
      (answer) =>
        (Array.isArray(answer.selectedOptionIds) &&
          answer.selectedOptionIds.length > 0) ||
        Boolean(answer.text && normalizeAnswer(answer.text)),
    ).length;
  const correctCount = row.correctCount ?? 0;
  return {
    ...attemptSummary(row),
    questionOrder: order,
    optionOrder,
    questions,
    answers,
    sources: row.version.sources,
    ...(row.status === 'COMPLETED'
      ? {
          result: {
            correctCount,
            answeredCount,
            totalQuestions: row.totalQuestions,
            incorrectCount: Math.max(0, answeredCount - correctCount),
            unansweredCount: Math.max(0, row.totalQuestions - answeredCount),
            percentage: row.totalQuestions
              ? (100 * correctCount) / row.totalQuestions
              : null,
            elapsedMs: row.finishedAt
              ? Math.max(0, row.finishedAt.getTime() - row.startedAt.getTime())
              : null,
          },
        }
      : {}),
  };
}
export const createQuizAttemptService = (repository: QuizAttemptRepository) => ({
  results: async (ownerId: string, id: string) => {
    const row = await repository.load(ownerId, id);
    if (row.status !== 'COMPLETED')
      throw new ServiceError(
        'RESULTS_UNAVAILABLE',
        'Finish this attempt before viewing results.',
        409,
      );
    return playerAttempt(row);
  },
  open: repository.open,
  locate: async (ownerId: string, id: string, index: number) => {
    await repository.load(ownerId, id);
    return playerAttempt(await repository.locate(ownerId, id, index));
  },
  abandon: async (ownerId: string, id: string) =>
    playerAttempt(await repository.abandon(ownerId, id)),
  submit: async (ownerId: string, id: string) => {
    await repository.expire(ownerId, id);
    return playerAttempt(
      await repository.finalize(ownerId, id, (row) => {
        const answers = new Map<string, AnswerChoice>();
        for (const answer of row.answers) {
          const question = row.version.questions.find(
            (item) => item.id === answer.questionId,
          )!;
          answers.set(
            answer.questionId,
            question.type === 'IDENTIFICATION'
              ? { text: answer.text ?? '' }
              : { optionIds: z.array(z.string()).parse(answer.selectedOptionIds) },
          );
        }
        return scoreAttempt(
          row.version.questions.filter(
            (question) =>
              !row.focusedReview ||
              (Array.isArray(row.questionOrder) &&
                row.questionOrder.includes(question.id)),
          ),
          answers,
        );
      }),
    );
  },
  answer: async (ownerId: string, id: string, questionId: string, input: AnswerInput) => {
    const attempt = await repository.load(ownerId, id),
      question = attempt.version.questions.find((item) => item.id === questionId);
    if (!question)
      throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    const outcome = scoreAnswer(question, input);
    return playerAttempt(
      await repository.saveAnswer(
        ownerId,
        id,
        questionId,
        input.expectedAnswerRevision,
        outcome,
        input.questionIndex,
      ),
    );
  },
  start: async (
    ownerId: string,
    quizId: string,
    key: string,
    input: StartAttemptInput,
  ) => {
    const attempt = await repository.start(ownerId, quizId, key, input);
    return playerAttempt(await repository.load(ownerId, attempt.id));
  },
  read: async (ownerId: string, id: string) =>
    playerAttempt(await repository.load(ownerId, id)),
});
export type QuizAttemptService = ReturnType<typeof createQuizAttemptService>;
