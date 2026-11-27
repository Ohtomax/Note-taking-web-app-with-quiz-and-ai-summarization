import { z } from 'zod';
import { normalizeAnswer } from './answer-normalization.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import type { QuestionType } from '@/generated/prisma/client.js';
export interface ScoringQuestion {
  id: string;
  type: QuestionType;
  options: Array<{ id: string; isCorrect: boolean }>;
  acceptedAnswers: unknown;
}
export interface AnswerChoice {
  optionIds?: string[];
  text?: string;
}
export interface AnswerOutcome {
  answered: boolean;
  isCorrect: boolean;
  selectedOptionIds: string[];
  text: string | null;
}
const invalid = () =>
  new ServiceError(
    'INVALID_ANSWER',
    'Answer does not match this question or contains invalid options.',
    400,
  );
export function scoreAnswer(
  question: ScoringQuestion,
  input?: AnswerChoice | null,
): AnswerOutcome {
  if (!input)
    return { answered: false, isCorrect: false, selectedOptionIds: [], text: null };
  if (question.type === 'IDENTIFICATION') {
    if (input.text === undefined || input.optionIds !== undefined) throw invalid();
    const answer = normalizeAnswer(input.text),
      accepted = z.array(z.string()).parse(question.acceptedAnswers).map(normalizeAnswer);
    return {
      answered: Boolean(answer),
      isCorrect: Boolean(answer) && accepted.includes(answer),
      selectedOptionIds: [],
      text: input.text,
    };
  }
  if (input.optionIds === undefined || input.text !== undefined) throw invalid();
  const ids = input.optionIds;
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !question.options.some((option) => option.id === id)) ||
    (['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(question.type) && ids.length > 1)
  )
    throw invalid();
  const key = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.id);
  const answered = ids.length > 0,
    isCorrect =
      answered && ids.length === key.length && ids.every((id) => key.includes(id));
  return { answered, isCorrect, selectedOptionIds: [...ids].sort(), text: null };
}
export function scoreAttempt(
  questions: ScoringQuestion[],
  answers: Map<string, AnswerChoice>,
) {
  const outcomes = questions.map((question) => ({
    questionId: question.id,
    ...scoreAnswer(question, answers.get(question.id)),
  }));
  const correctCount = outcomes.filter((outcome) => outcome.isCorrect).length,
    answeredCount = outcomes.filter((outcome) => outcome.answered).length;
  return {
    correctCount,
    answeredCount,
    totalQuestions: questions.length,
    incorrectCount: answeredCount - correctCount,
    unansweredCount: questions.length - answeredCount,
    percentage: questions.length ? (100 * correctCount) / questions.length : null,
    outcomes,
  };
}
