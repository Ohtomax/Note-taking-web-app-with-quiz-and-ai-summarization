import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RetakeQuiz } from '@/features/quizzes/RetakeQuiz';
import { attemptsApi } from '@/api/attempts';
import { attemptFixture, fixtureId } from './fixtures/attempt';
import { resolveSession } from '@/features/auth/session.service';
it('retries one explicit retake action with the reviewed version and shuffle settings', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const attempt = attemptFixture(),
    next = { ...attempt, id: fixtureId(99) };
  const start = vi
    .spyOn(attemptsApi, 'start')
    .mockRejectedValueOnce(new Error('Lost response'))
    .mockResolvedValue({ data: next });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<RetakeQuiz attempt={attempt} />} />
          <Route path="/attempts/:attemptId" element={<p>New attempt opened</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByLabelText('Shuffle questions'));
  fireEvent.click(screen.getByLabelText('Shuffle options'));
  fireEvent.click(screen.getByRole('button', { name: 'Retake this version' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry retake' }));
  await screen.findByText('New attempt opened');
  expect(start.mock.calls[0]![1]).toBe(start.mock.calls[1]![1]);
  expect(start.mock.calls[1]![2]).toEqual({
    versionId: attempt.versionId,
    mode: 'EXAM',
    shuffleQuestions: true,
    shuffleOptions: true,
  });
});
