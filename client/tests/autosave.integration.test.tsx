import { it, expect, vi } from 'vitest';
import { act, renderHook, waitFor, configure } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useHttpWorkspace, httpWorkspaceEnabled } from './fixtures/http-workspace';
import { resolveSession } from '@/features/auth/session.service';
import { apiRequest, ApiError } from '@/api/client';
import { notesApi } from '@/api/notes';
import { useNoteSave } from '@/features/notes/hooks/useNoteSave';
import { useDrafts } from '@/store/drafts';
configure({ asyncUtilTimeout: 5000 });
useHttpWorkspace();
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
async function createNote() {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'alice' });
  const project = await apiRequest<{ data: { id: string } }>('/projects', {
    method: 'POST',
    body: JSON.stringify({ title: 'Concurrency course' }),
  });
  return (await notesApi.create(project.data.id)).data;
}
it.skipIf(!httpWorkspaceEnabled)(
  'P6-T03 delayed stale editor loses to the newer HTTP write and retains a recoverable draft through disconnection',
  async () => {
    const note = await createNote(),
      originalSave = notesApi.save;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const save = vi.spyOn(notesApi, 'save').mockImplementationOnce(async (...args) => {
      await gate;
      return originalSave(...args);
    });
    const a = renderHook(() => useNoteSave(note, false), { wrapper }),
      b = renderHook(() => useNoteSave(note, false), { wrapper });
    act(() =>
      a.result.current.change({
        ...a.result.current.draft,
        title: 'Delayed original draft',
      }),
    );
    let held: Promise<void> | undefined;
    act(() => {
      held = a.result.current.flush();
    });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    act(() =>
      b.result.current.change({ ...b.result.current.draft, title: 'Newer editor wins' }),
    );
    await act(async () => {
      await b.result.current.flush();
    });
    await act(async () => {
      release();
      await held;
    });
    expect(a.result.current.status).toBe('conflict');
    expect(a.result.current.draft.title).toBe('Delayed original draft');
    expect(useDrafts.getState().drafts['alice:' + note.id]!.title).toBe(
      'Delayed original draft',
    );
    const stored = (await notesApi.find(note.projectId, note.id)).data;
    expect(stored.title).toBe('Newer editor wins');
    expect(stored.revision).toBe(2);
    await act(async () => {
      await a.result.current.compareLatest();
    });
    expect(a.result.current.serverVersion?.title).toBe('Newer editor wins');
    act(() => a.result.current.useServerVersion());
    expect(a.result.current.status).toBe('saved');
    expect(a.result.current.draft.title).toBe('Newer editor wins');
    b.unmount();
    save.mockRejectedValueOnce(new ApiError(0, 'OFFLINE', 'Disconnected'));
    act(() =>
      a.result.current.change({
        ...a.result.current.draft,
        title: 'Offline recovery draft',
      }),
    );
    await act(async () => {
      await a.result.current.flush();
    });
    expect(a.result.current.status).toBe('error');
    expect((await notesApi.find(note.projectId, note.id)).data.title).toBe(
      'Newer editor wins',
    );
    act(() => a.result.current.retry());
    await waitFor(() => expect(a.result.current.status).toBe('saved'));
    const reopened = (await notesApi.find(note.projectId, note.id)).data;
    expect(reopened.title).toBe('Offline recovery draft');
    expect(reopened.revision).toBe(3);
    a.unmount();
    const third = renderHook(() => useNoteSave(reopened, false), { wrapper });
    expect(third.result.current.draft.title).toBe('Offline recovery draft');
    expect(third.result.current.status).toBe('saved');
  },
  15000,
);
it.skipIf(!httpWorkspaceEnabled)(
  'P6-T03 delayed acknowledgments never replace newer rapid typing and the final queued draft is persisted',
  async () => {
    const note = await createNote(),
      originalSave = notesApi.save;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(notesApi, 'save').mockImplementationOnce(async (...args) => {
      const result = await originalSave(...args);
      await gate;
      return result;
    });
    const editor = renderHook(() => useNoteSave(note, false), { wrapper });
    act(() =>
      editor.result.current.change({
        ...editor.result.current.draft,
        title: 'First saved snapshot',
      }),
    );
    let held: Promise<void> | undefined;
    act(() => {
      held = editor.result.current.flush();
    });
    await waitFor(async () =>
      expect((await notesApi.find(note.projectId, note.id)).data.revision).toBe(2),
    );
    act(() => {
      editor.result.current.change({
        ...editor.result.current.draft,
        title: 'Rapid edit 1',
      });
      editor.result.current.change({
        ...editor.result.current.draft,
        title: 'Rapid edit 2',
      });
    });
    await act(async () => {
      release();
      await held;
    });
    await waitFor(() => expect(editor.result.current.status).toBe('saved'));
    const reopened = (await notesApi.find(note.projectId, note.id)).data;
    expect(reopened.title).toBe('Rapid edit 2');
    expect(reopened.revision).toBe(3);
  },
  15000,
);
