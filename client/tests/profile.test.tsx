import { expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import ProfileForm from '@/features/settings/ProfileForm';
import { profileApi } from '@/api/profile';
import { queryClient } from '@/config/queryClient';
import { resolveSession } from '@/features/auth/session.service';
import { useSession } from '@/store/session';
import type { Profile } from '@/types/profile';

it('saves only the permitted name, reloads it, rejects markup and isolates account changes', async () => {
  const profiles: Record<string, Profile> = {
    alice: {
      id: '11111111-1111-4111-8111-111111111111',
      displayName: 'Alice',
      email: 'alice@example.test',
      role: 'USERS',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    bob: {
      id: '22222222-2222-4222-8222-222222222222',
      displayName: 'Bob',
      email: 'bob@example.test',
      role: 'USERS',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  };
  vi.spyOn(profileApi, 'find').mockImplementation(async () => ({
    data: profiles[useSession.getState().user!.uid]!,
  }));
  const update = vi.spyOn(profileApi, 'update').mockImplementation(async (input) => {
    const uid = useSession.getState().user!.uid;
    profiles[uid] = { ...profiles[uid]!, ...input };
    return { data: profiles[uid] };
  });
  const login = (uid: string) =>
    resolveSession({ uid, email: uid + '@example.test', getIdToken: async () => uid });
  login('alice');
  const open = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileForm />
      </QueryClientProvider>,
    );
  let view = open();
  fireEvent.change(await screen.findByLabelText('Display name'), {
    target: { value: 'Alice Study' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await screen.findByText('Profile saved.');
  expect(update).toHaveBeenCalledWith({ displayName: 'Alice Study' }, expect.anything());
  view.unmount();
  queryClient.clear();
  view = open();
  expect(await screen.findByDisplayValue('Alice Study')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Display name'), {
    target: { value: '<script>' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('unsupported');
  expect(update).toHaveBeenCalledTimes(1);
  act(() => login('bob'));
  expect(await screen.findByDisplayValue('Bob')).toBeInTheDocument();
  expect(screen.queryByDisplayValue('Alice Study')).not.toBeInTheDocument();
  expect(queryClient.getQueryData(['alice', 'profile'])).toBeUndefined();
  view.unmount();
});
