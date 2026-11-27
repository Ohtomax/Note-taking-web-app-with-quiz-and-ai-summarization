import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SummaryGenerator } from '@/features/summaries/SummaryGenerator';
import { studyApi } from '@/api/study';
import { ApiError } from '@/api/client';
import { resolveSession } from '@/features/auth/session.service';
import type { Generation, SavedSummary } from '@/types/study';
const projectId = '11111111-1111-4111-8111-111111111111',
  id = '22222222-2222-4222-8222-222222222222';
const content = {
  title: 'Protocols',
  sections: [{ heading: null, text: 'TCP transports data.', sourceKeys: ['note:a'] }],
};
const generation: Generation = {
  id,
  status: 'SUCCEEDED',
  errorCode: null,
  resultId: null,
  result: {
    projectId,
    operation: 'SUMMARY',
    settings: { length: 'MEDIUM', format: 'BULLETS' },
    output: content,
    sources: [
      {
        sourceKey: 'note:a',
        noteId: id,
        noteTitle: 'TCP note',
        revision: 1,
        contentHash: 'hash',
        rangeStart: null,
        rangeEnd: null,
      },
    ],
  },
};
it('retains summary settings after quota/network failures, reuses the key and saves edited preview text', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const generate = vi
    .spyOn(studyApi, 'generate')
    .mockRejectedValueOnce(new ApiError(429, 'AI_QUOTA', 'Allowance exhausted'))
    .mockRejectedValueOnce(new Error('Connection lost'))
    .mockResolvedValue({ data: generation });
  vi.spyOn(studyApi, 'status').mockResolvedValue({ data: generation });
  const saved: SavedSummary = {
    id,
    projectId,
    title: content.title,
    content,
    settings: { length: 'MEDIUM', format: 'BULLETS' },
    generatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: generation.result!.sources,
    staleSources: false,
  };
  const save = vi.spyOn(studyApi, 'saveSummary').mockResolvedValue({ data: saved });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SummaryGenerator
        projectId={projectId}
        choice={{
          projectId,
          source: { scope: 'PROJECT' },
          description: 'All saved notes',
        }}
      />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText('Summary length'), {
    target: { value: 'SHORT' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Generate summary' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Allowance exhausted');
  fireEvent.click(screen.getByRole('button', { name: 'Retry original request' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Connection lost'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Retry original request' }));
  await screen.findByRole('region', { name: 'Summary preview' });
  expect(generate.mock.calls[0]![1]).toBe(generate.mock.calls[1]![1]);
  expect(generate.mock.calls[1]![1]).toBe(generate.mock.calls[2]![1]);
  expect(generate.mock.calls[2]![2].settings.length).toBe('SHORT');
  fireEvent.change(screen.getByLabelText('Section 1 text'), {
    target: { value: 'Edited preview' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save summary' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      projectId,
      id,
      expect.objectContaining({
        sections: [expect.objectContaining({ text: 'Edited preview' })],
      }),
    ),
  );
});
