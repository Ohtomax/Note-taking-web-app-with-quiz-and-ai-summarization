import { createHash } from 'node:crypto';
import type { AISourcesRepository } from '@/repositories/ai-sources.repository.js';
import type { SourceRequest } from '@/utils/input-validators/ai-sources.js';
import { summaryContentSchema } from '@/utils/input-validators/summaries.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export interface SourceSnapshot {
  sourceKey: string;
  noteId: string | null;
  noteTitle: string;
  revision: number;
  text: string;
  contentHash: string;
  rangeStart: number | null;
  rangeEnd: number | null;
}
export interface SourceManifest {
  projectId: string;
  projectRevision: number;
  scope: SourceRequest['scope'];
  sources: SourceSnapshot[];
}
export const hashContent = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const createAISourcesService = (repository: AISourcesRepository) => ({
  resolve: async (
    ownerId: string,
    projectId: string,
    request: SourceRequest,
  ): Promise<SourceManifest> => {
    if (request.scope === 'SUMMARY') {
      const { summary, projectRevision } = await repository.summary(
        ownerId,
        projectId,
        request.summaryId,
      );
      if (summary.updatedAt.getTime() !== new Date(request.updatedAt).getTime())
        throw new ServiceError(
          'SOURCE_CHANGED',
          'Reload the current summary before generating a quiz.',
          409,
        );
      const content = summaryContentSchema.parse(summary.content);
      const text = content.sections
        .map((section) => [section.heading, section.text].filter(Boolean).join('\n'))
        .join('\n\n');
      return {
        projectId,
        projectRevision,
        scope: request.scope,
        sources: [
          {
            sourceKey: 'summary:' + request.summaryId,
            noteId: null,
            noteTitle: summary.title,
            revision: 1,
            text,
            contentHash: hashContent(text),
            rangeStart: null,
            rangeEnd: null,
          },
        ],
      };
    }
    const single = request.scope === 'NOTE' || request.scope === 'EXCERPT';
    const ids = single
      ? [request.noteId]
      : request.scope === 'NOTES'
        ? request.noteIds
        : undefined;
    const result = await repository.collect(ownerId, projectId, ids);
    if (ids && result.notes.length !== ids.length)
      throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    const sources: SourceSnapshot[] = [];
    for (const note of result.notes) {
      if (single && note.revision !== request.revision)
        throw new ServiceError(
          'SOURCE_CHANGED',
          'Select the current source revision.',
          409,
        );
      const points = [...note.plainText];
      if (
        request.scope === 'EXCERPT' &&
        (request.start >= request.end || request.end > points.length)
      )
        throw new ServiceError('INVALID_RANGE', 'Select a valid text range.', 422);
      const text =
        request.scope === 'EXCERPT'
          ? points.slice(request.start, request.end).join('')
          : note.plainText;
      if (!text.trim()) {
        if (request.scope === 'PROJECT') continue;
        throw new ServiceError('EMPTY_SOURCE', 'The selected source has no text.', 422);
      }
      sources.push({
        sourceKey: 'note:' + note.id,
        noteId: note.id,
        noteTitle: note.title,
        revision: note.revision,
        text,
        contentHash: hashContent(text),
        rangeStart: request.scope === 'EXCERPT' ? request.start : null,
        rangeEnd: request.scope === 'EXCERPT' ? request.end : null,
      });
    }
    if (!sources.length)
      throw new ServiceError(
        'EMPTY_SOURCE',
        'The selected project has no eligible text notes.',
        422,
      );
    return {
      projectId,
      projectRevision: result.projectRevision,
      scope: request.scope,
      sources,
    };
  },
});
export type AISourcesService = ReturnType<typeof createAISourcesService>;
