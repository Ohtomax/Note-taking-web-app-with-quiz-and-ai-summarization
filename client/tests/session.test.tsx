import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { apiClient, apiRequest } from '@/api/client';
import { resolveSession } from '@/features/auth/session.service';
import { useSession } from '@/store/session';
import { useDrafts } from '@/store/drafts';
import { queryClient } from '@/config/queryClient';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

const alice = {
  uid: 'alice',
  email: 'alice@example.test',
  getIdToken: async () => 'alice-token',
};
const bob = {
  uid: 'bob',
  email: 'bob@example.test',
  getIdToken: async () => 'bob-token',
};
beforeEach(() => resolveSession(null));

it('attaches the current Firebase token and clears drafts and queries on account changes', async () => {
  resolveSession(alice);
  queryClient.setQueryData(['alice', 'projects'], ['private']);
  useDrafts
    .getState()
    .setDraft('alice:note', {
      title: 'Private',
      revision: 1,
      content: { type: 'doc', content: [] },
    });
  const request = vi
    .spyOn(apiClient, 'request')
    .mockResolvedValue({ data: { ok: true } });
  await apiRequest('/me');
  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer alice-token' }),
    }),
  );
  resolveSession(bob);
  expect(queryClient.getQueryData(['alice', 'projects'])).toBeUndefined();
  expect(useDrafts.getState().drafts).toEqual({});
});

it('rejects a late old-session response even when the transport ignores cancellation', async () => {
  resolveSession(alice);
  let deliver: ((response: { data: string }) => void) | undefined;
  vi.spyOn(apiClient, 'request').mockImplementation(
    () =>
      new Promise((resolve) => {
        deliver = resolve;
      }),
  );
  const pending = apiRequest('/private');
  await Promise.resolve();
  resolveSession(bob);
  deliver?.({ data: 'Alice private data' });
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});

it('protected navigation waits for identity and redirects signed-out users', () => {
  useSession.setState({ loading: true });
  const view = render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/auth" element={<p>Sign in page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<p>Private workspace</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Restoring');
  view.unmount();
  resolveSession(null);
  render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/auth" element={<p>Sign in page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<p>Private workspace</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText('Sign in page')).toBeInTheDocument();
});
