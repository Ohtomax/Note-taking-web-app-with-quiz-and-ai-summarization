import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useNoteSave } from '@/features/notes/hooks/useNoteSave';
import { notesApi } from '@/api/notes';
import { resolveSession } from '@/features/auth/session.service';
import { useDrafts } from '@/store/drafts';
import { ApiError } from '@/api/client';
import type { Note } from '@/types/workspace';

const note: Note = {
  id: '22222222-2222-4222-8222-222222222222',
  projectId: '11111111-1111-4111-8111-111111111111',
  title: 'Original',
  revision: 1,
  pinned: false,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  contentSchemaVersion: 1,
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
beforeEach(() => {
  vi.useFakeTimers();
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
});
afterEach(() => vi.useRealTimers());

it('serializes delayed saves and never replaces newer typing with an old acknowledgment', async () => {
  let acknowledge: ((value: { data: Note }) => void) | undefined;
  const save = vi
    .spyOn(notesApi, 'save')
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          acknowledge = resolve;
        }),
    )
    .mockResolvedValue({ data: { ...note, title: 'Newest', revision: 3 } });
  const { result } = renderHook(() => useNoteSave(note, false), { wrapper });
  act(() => result.current.change({ ...result.current.draft, title: 'First' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(701);
  });
  expect(save).toHaveBeenCalledTimes(1);
  act(() => result.current.change({ ...result.current.draft, title: 'Newest' }));
  await act(async () => {
    acknowledge?.({ data: { ...note, title: 'First', revision: 2 } });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1]?.[2]).toMatchObject({ title: 'Newest', expectedRevision: 2 });
  expect(result.current.draft.title).toBe('Newest');
  expect(result.current.status).toBe('saved');
});

it('retains an offline draft across unmount and pauses conflicts until explicit reapply', async () => {
  const save = vi.spyOn(notesApi, 'save').mockRejectedValueOnce(new Error('Offline'));
  const first = renderHook(() => useNoteSave(note, false), { wrapper });
  act(() =>
    first.result.current.change({ ...first.result.current.draft, title: 'Offline edit' }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(701);
  });
  expect(first.result.current.status).toBe('error');
  first.unmount();
  expect(useDrafts.getState().drafts['alice:' + note.id]?.title).toBe('Offline edit');
  save.mockRejectedValueOnce(new ApiError(409, 'REVISION_CONFLICT', 'Newer version'));
  const second = renderHook(() => useNoteSave(note, false), { wrapper });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(701);
  });
  expect(second.result.current.status).toBe('conflict');
  vi.spyOn(notesApi, 'find').mockResolvedValue({
    data: { ...note, title: 'Other tab', revision: 5 },
  });
  await act(async () => {
    await second.result.current.compareLatest();
  });
  expect(second.result.current.draft.title).toBe('Offline edit');
  save.mockResolvedValueOnce({ data: { ...note, title: 'Offline edit', revision: 6 } });
  await act(async () => {
    second.result.current.reapplyDraft();
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(save.mock.calls.at(-1)?.[2]).toMatchObject({
    title: 'Offline edit',
    expectedRevision: 5,
  });
});

it('aborts a note request on navigation and cannot restore a signed-out user draft', async () => {
  let signal: AbortSignal | undefined;
  let acknowledge: ((value: { data: Note }) => void) | undefined;
  vi.spyOn(notesApi, 'save').mockImplementation(
    (_project, _id, _input, requestSignal) => {
      signal = requestSignal;
      return new Promise((resolve) => {
        acknowledge = resolve;
      });
    },
  );
  const { result, unmount } = renderHook(() => useNoteSave(note, false), { wrapper });
  act(() => result.current.change({ ...result.current.draft, title: 'Private' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(701);
  });
  unmount();
  expect(signal?.aborted).toBe(true);
  resolveSession(null);
  await act(async () => {
    acknowledge?.({ data: { ...note, revision: 2 } });
  });
  expect(useDrafts.getState().drafts).toEqual({});
});
