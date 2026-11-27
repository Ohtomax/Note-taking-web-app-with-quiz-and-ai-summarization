import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkspaceLayout } from '@/features/dashboard/WorkspaceLayout';
import { resolveSession } from '@/features/auth/session.service';
import { useWorkspace } from '@/store/workspace';
import * as authService from '@/features/auth/auth.service';

it('opens accessible navigation, changes routes and signs out', async () => {
  resolveSession({
    uid: 'alice',
    email: 'alice@example.test',
    getIdToken: async () => 'token',
  });
  useWorkspace.setState({ sidebarOpen: false });
  const signOut = vi.spyOn(authService, 'logOut').mockResolvedValue();
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<WorkspaceLayout />}>
          <Route path="/" element={<p>Projects content</p>} />
          <Route path="/settings" element={<p>Settings content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  expect(screen.getByRole('navigation', { name: 'Workspace' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(signOut).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('link', { name: 'Settings' }));
  expect(await screen.findByText('Settings content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});
