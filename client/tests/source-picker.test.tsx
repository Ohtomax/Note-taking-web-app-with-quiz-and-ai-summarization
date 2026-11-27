import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SourcePicker } from '@/features/notes/SourcePicker';
import { resolveSession } from '@/features/auth/session.service';
import type { Note } from '@/types/workspace';
const note: Note = {
  id: '22222222-2222-4222-8222-222222222222',
  projectId: '11111111-1111-4111-8111-111111111111',
  title: 'Unicode',
  revision: 1,
  pinned: false,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  contentSchemaVersion: 1,
  content: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'TCP 😀 transport' }] },
    ],
  },
};
it('captures code point passage offsets and requires reselection after a revision or project change', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const onChange = vi.fn(),
    cache = new QueryClient();
  const view = (projectId: string, current: Note | undefined) => (
    <QueryClientProvider client={cache}>
      <SourcePicker projectId={projectId} note={current} onChange={onChange} />
    </QueryClientProvider>
  );
  const { rerender } = render(view(note.projectId, note));
  fireEvent.change(screen.getByLabelText('Source scope'), {
    target: { value: 'EXCERPT' },
  });
  const text = screen.getByLabelText(
    'Select a passage in the saved text',
  ) as HTMLTextAreaElement;
  text.setSelectionRange(4, 6);
  fireEvent.select(text);
  await waitFor(() =>
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: { scope: 'EXCERPT', noteId: note.id, revision: 1, start: 4, end: 5 },
      }),
    ),
  );
  expect(screen.getByText('😀')).toBeInTheDocument();
  rerender(view(note.projectId, { ...note, revision: 2 }));
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null));
  expect(screen.getByText(/current saved revision/)).toBeInTheDocument();
  const next = '33333333-3333-4333-8333-333333333333';
  rerender(view(next, undefined));
  await waitFor(() =>
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectId: next, source: { scope: 'PROJECT' } }),
    ),
  );
  expect(screen.queryByText('😀')).not.toBeInTheDocument();
});
