import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResumeAttempt } from '@/features/quizzes/ResumeAttempt';
import { attemptsApi } from '@/api/attempts';
import { attemptFixture } from './fixtures/attempt';
import { resolveSession } from '@/features/auth/session.service';
it('links the saved attempt location and requires confirmation for terminal abandonment', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const attempt = attemptFixture(),
    abandon = vi
      .spyOn(attemptsApi, 'abandon')
      .mockResolvedValue({ data: { ...attempt, status: 'ABANDONED' } });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ResumeAttempt attempt={{ ...attempt, status: 'IN_PROGRESS' }} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.getByText(/question 2 of 4/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Resume attempt' })).toHaveAttribute(
    'href',
    '/attempts/' + attempt.id,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Abandon attempt' }));
  expect(abandon).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm abandonment' }));
  await waitFor(() => expect(abandon).toHaveBeenCalledWith(attempt.id));
  expect(await screen.findByRole('status')).toHaveTextContent('Attempt abandoned');
});
