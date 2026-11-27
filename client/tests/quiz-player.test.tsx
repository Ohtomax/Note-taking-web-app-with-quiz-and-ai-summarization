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
  'plays all question types by keyboard and reveals feedback according to %s mode',
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
          questions: current.questions.map((question) =>
            question.id === questionId && mode === 'PRACTICE'
              ? {
                  ...question,
                  feedback: {
                    isCorrect: true,
                    correctOptionIds: input.optionIds ?? [],
                    acceptedAnswers: input.text ? [input.text] : [],
                    explanation: 'Grounded feedback',
                  },
                }
              : question,
          ),
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
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    for (let index = 0; index < 4; index++) {
      await screen.findByRole('heading', {
        name: new RegExp('Question ' + (index + 1) + ' of 4:'),
      });
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
      screen
        .getByRole('button', {
          name: mode === 'PRACTICE' ? 'Submit practice answer' : 'Save answer',
        })
        .focus();
      await user.keyboard('[Enter]');
      await waitFor(() => expect(save).toHaveBeenCalledTimes(index + 1));
      await waitFor(() =>
        expect(
          screen.getByRole('button', {
            name: mode === 'PRACTICE' ? 'Answer recorded' : 'Save answer',
          }),
        ).toBeDisabled(),
      );
      if (mode === 'PRACTICE')
        expect(await screen.findByText('Correct')).toBeInTheDocument();
      else expect(screen.queryByText('Grounded feedback')).not.toBeInTheDocument();
      if (index < 3) {
        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled(),
        );
        screen.getByRole('button', { name: 'Next question' }).focus();
        await user.keyboard('[Enter]');
      }
    }
    screen
      .getByRole('button', { name: mode === 'EXAM' ? 'Submit exam' : 'Finish practice' })
      .focus();
    await user.keyboard('[Enter]');
    await screen.findByRole('dialog');
    screen.getByRole('button', { name: 'Confirm submission' }).focus();
    await user.keyboard('[Enter]');
    expect(await screen.findByText('Attempt completed')).toBeInTheDocument();
    expect(screen.getByText('Score: 100.00%')).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(4);
  },
);
