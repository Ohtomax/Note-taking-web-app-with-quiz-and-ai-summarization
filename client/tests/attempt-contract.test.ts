import { expect, it } from 'vitest';
import { attemptSchema } from '@/types/attempts';
const id = '11111111-1111-4111-8111-111111111111',
  q = '22222222-2222-4222-8222-222222222222',
  o = '33333333-3333-4333-8333-333333333333',
  stamp = '2026-01-01T00:00:00.000Z';
const attempt = {
  id,
  quizId: id,
  projectId: id,
  quizTitle: 'Exam',
  lastQuestionIndex: 0,
  versionId: id,
  version: 1,
  difficulty: 'EASY',
  mode: 'EXAM',
  status: 'IN_PROGRESS',
  startedAt: stamp,
  finishedAt: null,
  totalQuestions: 1,
  questionOrder: [q],
  optionOrder: { [q]: [o] },
  questions: [
    {
      id: q,
      position: 1,
      type: 'MULTIPLE_CHOICE',
      prompt: 'Question',
      options: [{ id: o, text: 'Choice' }],
      sourceKeys: ['source'],
    },
  ],
  answers: [],
  sources: [],
};
it('keeps authoring keys out of open player payloads and accepts committed result metadata', () => {
  expect(attemptSchema.safeParse(attempt).success).toBe(true);
  const feedback = {
    isCorrect: true,
    correctOptionIds: [o],
    acceptedAnswers: [],
    explanation: null,
  };
  expect(
    attemptSchema.safeParse({
      ...attempt,
      questions: [{ ...attempt.questions[0], feedback }],
    }).success,
  ).toBe(false);
  expect(
    attemptSchema.safeParse({
      ...attempt,
      questions: [
        {
          ...attempt.questions[0],
          options: [{ id: o, text: 'Choice', isCorrect: true }],
        },
      ],
    }).success,
  ).toBe(false);
  const result = {
    correctCount: 1,
    answeredCount: 1,
    totalQuestions: 1,
    incorrectCount: 0,
    unansweredCount: 0,
    percentage: 100,
    elapsedMs: 1000,
  };
  expect(
    attemptSchema.safeParse({
      ...attempt,
      status: 'COMPLETED',
      finishedAt: stamp,
      result,
      questions: [{ ...attempt.questions[0], feedback }],
    }).success,
  ).toBe(true);
  expect(attemptSchema.safeParse({ ...attempt, result }).success).toBe(false);
});
