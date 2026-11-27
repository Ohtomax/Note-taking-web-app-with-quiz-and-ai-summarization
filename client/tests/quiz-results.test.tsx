import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuizResults from '@/features/quizzes/QuizResults';
import { attemptsApi } from '@/api/attempts';
import { attemptFixture } from './fixtures/attempt';
import { resolveSession } from '@/features/auth/session.service';
import type { PlayerAttempt } from '@/types/attempts';
it('shows the recorded version, skipped counts, elapsed time and original answer review', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const base = attemptFixture(),
    first = base.questions[0]!;
  const completed: PlayerAttempt = {
    ...base,
    status: 'COMPLETED',
    finishedAt: '2026-01-01T00:00:02.000Z',
    answers: [
      {
        questionId: first.id,
        selectedOptionIds: [first.options[0]!.id],
        text: null,
        revision: 1,
        submittedAt: '2026-01-01T00:00:01.000Z',
      },
    ],
    result: {
      correctCount: 1,
      answeredCount: 1,
      totalQuestions: 4,
      incorrectCount: 0,
      unansweredCount: 3,
      percentage: 25,
      elapsedMs: 2000,
    },
    questions: base.questions.map((question, index) => ({
      ...question,
      feedback: {
        isCorrect: index === 0,
        correctOptionIds: question.options
          .slice(0, question.type === 'MULTIPLE_SELECT' ? 2 : 1)
          .map((option) => option.id),
        acceptedAnswers: question.type === 'IDENTIFICATION' ? ['tcp'] : [],
        explanation: 'Original explanation',
      },
    })),
  };
  vi.spyOn(attemptsApi, 'results').mockResolvedValue({ data: completed });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/attempts/' + base.id + '/results']}>
        <Routes>
          <Route path="/attempts/:attemptId/results" element={<QuizResults />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByText('25.00%')).toBeInTheDocument();
  expect(screen.getByText(/Attempted version 1/)).toBeInTheDocument();
  expect(screen.getByText('2s')).toBeInTheDocument();
  expect(screen.getAllByText('Your answer: No answer recorded')).toHaveLength(3);
  expect(screen.getByRole('heading', { name: '1. ' + first.prompt })).toBeInTheDocument();
  expect(screen.getAllByText('Original explanation')).toHaveLength(4);
});
