import { it, vi, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { AIUsage } from '@/features/dashboard/AIUsage';
import { RetakeQuiz } from '@/features/quizzes/RetakeQuiz';
import { usageApi } from '@/api/usage';
import { attemptsApi } from '@/api/attempts';
import { attemptFixture } from './fixtures/attempt';
import { resolveSession } from '@/features/auth/session.service';
import { useSession } from '@/store/session';
it('replaces exhausted account usage and still allows a saved quiz retake', async () => {
  const row = {
    data: [],
    total: 0,
    page: 1,
    pageSize: 5,
    quota: {
      requestsUsed: 10,
      requestLimit: 10,
      accountedTokens: 100,
      tokenLimit: 100,
      active: 0,
      concurrencyLimit: 1,
      resetsAt: '2026-11-28T00:00:00.000Z',
    },
  };
  const read = vi
    .spyOn(usageApi, 'read')
    .mockResolvedValueOnce(row)
    .mockResolvedValue({
      ...row,
      quota: { ...row.quota, requestsUsed: 0, accountedTokens: 0 },
    });
  vi.spyOn(attemptsApi, 'start').mockResolvedValue({ data: attemptFixture() });
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'alice' });
  function Account() {
    const uid = useSession((s) => s.user!.uid);
    return (
      <div key={uid}>
        <AIUsage />
        <RetakeQuiz attempt={attemptFixture()} />
      </div>
    );
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Account />} />
          <Route path="/attempts/:id" element={<p>Saved quiz player</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText(/Generation allowance is exhausted/);
  expect(screen.getByRole('button', { name: 'Retake this version' })).toBeEnabled();
  resolveSession({ uid: 'bob', email: null, getIdToken: async () => 'bob' });
  await screen.findByText(/10 of 10 requests remaining/);
  expect(screen.queryByText(/Generation allowance is exhausted/)).not.toBeInTheDocument();
  expect(read).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Retake this version' }));
  await screen.findByText('Saved quiz player');
});
