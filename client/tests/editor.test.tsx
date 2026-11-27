import './fixtures/usage';
import { beforeEach, expect, it, vi } from 'vitest';
import { dashboardApi } from '@/api/dashboard';
beforeEach(() => {
  vi.spyOn(dashboardApi, 'open').mockImplementation(async (_projectId, noteId) => ({
    id: noteId,
    lastOpenedAt: '2026-11-28T00:00:00.000Z',
  }));
});
import { Editor } from '@tiptap/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { noteExtensions } from '@/features/notes/editor/extensions';
import { noteContentSchema } from '@/types/note-content';
import NotePage from '@/features/notes/NotePage';
import { notesApi } from '@/api/notes';
import { projectsApi } from '@/api/projects';
import { resolveSession } from '@/features/auth/session.service';

it('editor output preserves every required format and strips unsupported pasted HTML', () => {
  const editor = new Editor({
    extensions: noteExtensions(),
    content:
      '<h2>Heading</h2><p><strong>Bold</strong> <em>Italic</em> <u>Underlined</u></p><ul><li><p>Bullet</p></li></ul><ol><li><p>Numbered</p></li></ol><blockquote><p>Quote</p></blockquote><pre><code>ping</code></pre><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Check</p></li></ul>',
  });
  try {
    expect(
      noteContentSchema.safeParse(editor.getJSON()).success,
      JSON.stringify(editor.getJSON()),
    ).toBe(true);
    const document = noteContentSchema.parse(editor.getJSON());
    expect(JSON.stringify(document)).toMatch(/underline/);
    expect(JSON.stringify(document)).toMatch(/taskItem/);
    const reopened = new Editor({ extensions: noteExtensions(), content: document });
    expect(noteContentSchema.parse(reopened.getJSON())).toEqual(document);
    reopened.destroy();
    editor.commands.setContent(
      '<p onclick="bad()">Safe <a href="javascript:bad()">text</a></p><script>bad()</script>',
    );
    expect(noteContentSchema.safeParse(editor.getJSON()).success).toBe(true);
    expect(JSON.stringify(editor.getJSON())).not.toMatch(/onclick|javascript|script/);
  } finally {
    editor.destroy();
  }
});

it('normal note route saves title and structured content with the current revision', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const stamp = '2026-01-01T00:00:00.000Z';
  const project = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Networking',
    description: '',
    color: 'blue' as const,
    icon: 'book' as const,
    revision: 1,
    archivedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  const note = {
    id: '22222222-2222-4222-8222-222222222222',
    projectId: project.id,
    title: 'OSI',
    revision: 1,
    pinned: false,
    archivedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    contentSchemaVersion: 1,
    content: { type: 'doc' as const, content: [{ type: 'paragraph' }] },
  };
  vi.spyOn(notesApi, 'find').mockResolvedValue({ data: note });
  vi.spyOn(projectsApi, 'find').mockResolvedValue({ data: project });
  const save = vi
    .spyOn(notesApi, 'save')
    .mockResolvedValue({ data: { ...note, title: 'Edited', revision: 2 } });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/projects/${project.id}/notes/${note.id}`]}>
        <Routes>
          <Route path="/projects/:projectId/notes/:noteId" element={<NotePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const title = await screen.findByLabelText('Note title');
  expect(
    await screen.findByRole('textbox', { name: 'Note content' }),
  ).toBeInTheDocument();
  fireEvent.change(title, { target: { value: 'Edited' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      project.id,
      note.id,
      expect.objectContaining({ title: 'Edited', expectedRevision: 1 }),
      expect.any(AbortSignal),
    ),
  );
});
