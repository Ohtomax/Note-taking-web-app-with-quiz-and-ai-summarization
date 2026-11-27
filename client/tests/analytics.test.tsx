import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsPage, { PerformanceOverview } from '@/features/analytics/AnalyticsPage';
import { analyticsApi } from '@/api/analytics';
import { analyticsSchema } from '@/types/analytics';
import { analyticsFixture } from './fixtures/analytics';
import { fixtureId } from './fixtures/attempt';
import { resolveSession } from '@/features/auth/session.service';
it('displays the computed denominators and an intelligible empty distribution', () => {
  const data = analyticsSchema.parse(analyticsFixture());
  const view = render(<PerformanceOverview data={data} />);
  expect(screen.getAllByText('62.50%').length).toBeGreaterThan(0);
  expect(screen.getByText('60.00%')).toBeInTheDocument();
  expect(screen.getByText(/Correct: 3 · Incorrect: 2 · Skipped: 1/)).toBeInTheDocument();
  view.rerender(
    <PerformanceOverview
      data={{ ...data, totals: { ...data.totals, answered: 0, accuracy: null } }}
    />,
  );
  expect(screen.getByText('No answered questions in this period.')).toBeInTheDocument();
});
it('keys analytics by account and requests the selected project and quiz', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const projectId = fixtureId(1),
    quizId = fixtureId(2),
    read = vi.spyOn(analyticsApi, 'read').mockResolvedValue(analyticsFixture());
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/projects/' + projectId + '/analytics']}>
        <Link to={'/quizzes/' + quizId + '/analytics'}>Change scope</Link>
        <Routes>
          <Route path="/projects/:projectId/analytics" element={<AnalyticsPage />} />
          <Route path="/quizzes/:quizId/analytics" element={<AnalyticsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: /Study analytics ·/ });
  expect(read.mock.calls[0]![0]).toEqual({ projectId, quizId: undefined });
  fireEvent.click(screen.getByRole('link', { name: 'Change scope' }));
  await screen.findByRole('link', { name: 'Saved quiz' });
  expect(read.mock.calls.at(-1)![0]).toEqual({ projectId: undefined, quizId });
});
