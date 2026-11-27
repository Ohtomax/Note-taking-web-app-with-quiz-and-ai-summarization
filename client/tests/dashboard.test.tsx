import { it, vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/features/dashboard/Dashboard';
import { dashboardApi } from '@/api/dashboard';
import { resolveSession } from '@/features/auth/session.service';
import { analyticsFixture } from './fixtures/analytics';
import { fixtureId } from './fixtures/attempt';
it('links recent notes and creation workflows from a populated dashboard', async () => {
  resolveSession({
    uid: 'alice',
    email: 'alice@example.test',
    getIdToken: async () => 'token',
  });
  const id = fixtureId(1),
    projectId = fixtureId(2);
  vi.spyOn(dashboardApi, 'read').mockResolvedValue({
    performance: analyticsFixture(),
    recent: {
      notes: [
        { id, projectId, title: 'Older note', lastOpenedAt: '2026-11-27T00:00:00.000Z' },
      ],
      projects: [],
      summaries: [],
      quizzes: [],
    },
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('link', { name: 'Older note' })).toHaveAttribute(
    'href',
    '/projects/' + projectId + '/notes/' + id,
  );
  expect(screen.getByRole('link', { name: 'Create project' })).toHaveAttribute(
    'href',
    '/projects/new',
  );
  expect(screen.getByRole('button', { name: 'Create note' })).toBeEnabled();
  expect(screen.getByRole('link', { name: 'Study analytics' })).toHaveAttribute(
    'href',
    '/analytics',
  );
  expect(screen.getAllByText('Nothing here yet.')).toHaveLength(3);
});
