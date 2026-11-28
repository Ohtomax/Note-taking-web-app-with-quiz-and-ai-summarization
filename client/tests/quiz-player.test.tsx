import { expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuizPlayer from '@/features/quizzes/QuizPlayer';
import { attemptsApi } from '@/api/attempts';
import { resolveSession } from '@/features/auth/session.service';
import { attemptFixture } from './fixtures/attempt';
it.each(['PRACTICE', 'EXAM'] as const)(
  'requires answers and withholds feedback throughout %s mode',
  async (mode) => {
    resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
    let current = { ...attemptFixture(mode), lastQuestionIndex: 0 };
    vi.spyOn(attemptsApi, 'find').mockImplementation(async () => ({ data: current }));
    const save = vi
      .spyOn(attemptsApi, 'saveAnswer')
      .mockImplementation(async (_id, questionId, input) => {
        current = {
          ...current,
          answers: [
            ...current.answers.filter((answer) => answer.questionId !== questionId),
            {
              questionId,
              selectedOptionIds: input.optionIds ?? [],
              text: input.text ?? null,
              revision: 1,
              submittedAt: '2026-01-01T00:00:01.000Z',
            },
          ],
          lastQuestionIndex: input.questionIndex ?? current.lastQuestionIndex,
        };
        return { data: current };
      });
    vi.spyOn(attemptsApi, 'locate').mockImplementation(async (_id, index) => {
      current = { ...current, lastQuestionIndex: index };
      return { data: current };
    });
    vi.spyOn(attemptsApi, 'submit').mockImplementation(async () => {
      current = {
        ...current,
        status: 'COMPLETED',
        finishedAt: '2026-01-01T00:00:02.000Z',
        result: {
          correctCount: 4,
          answeredCount: 4,
          totalQuestions: 4,
          incorrectCount: 0,
          unansweredCount: 0,
          percentage: 100,
          elapsedMs: 2000,
        },
      };
      return { data: current };
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/attempts/' + current.id]}>
          <Routes>
            <Route path="/attempts/:attemptId" element={<QuizPlayer />} />
            <Route
              path="/attempts/:attemptId/results"
              element={<h1>Recorded results</h1>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    for (let index = 0; index < 4; index++) {
      await screen.findByText('Question ' + (index + 1) + ' of 4');
      const action = index === 3 ? 'Submit quiz' : 'Next question';
      expect(screen.getByRole('button', { name: action })).toBeDisabled();
      expect(screen.queryByText('Correct')).not.toBeInTheDocument();
      if (index === 3) {
        screen.getByLabelText('Identification answer').focus();
        await user.keyboard('TCP');
      } else if (index === 2) {
        screen.getByRole('checkbox', { name: 'TCP' }).focus();
        await user.keyboard('[Space]');
        screen.getByRole('checkbox', { name: 'UDP' }).focus();
        await user.keyboard('[Space]');
      } else {
        screen.getByRole('radio', { name: index === 0 ? 'TCP' : 'True' }).focus();
        await user.keyboard('[Space]');
      }
      screen.getByRole('button', { name: action }).focus();
      await user.keyboard('[Enter]');
      if (index < 3) await waitFor(() => expect(save).toHaveBeenCalledTimes(index + 1));
    }
    await screen.findByRole('dialog');
    screen.getByRole('button', { name: 'Confirm submission' }).focus();
    await user.keyboard('[Enter]');
    expect(await screen.findByText('Recorded results')).toBeInTheDocument();

    expect(save).toHaveBeenCalledTimes(4);
  },
);
