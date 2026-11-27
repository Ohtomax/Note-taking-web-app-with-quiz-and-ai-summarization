import { createHash } from 'node:crypto';
import type { AISourcesRepository } from '@/repositories/ai-sources.repository.js';
import type { SourceRequest } from '@/utils/input-validators/ai-sources.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export interface SourceSnapshot {
  sourceKey: string;
  noteId: string;
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
    const result = await repository.collect(ownerId, projectId, [request.noteId]);
    const note = result.notes[0];
    if (!note) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    if (note.revision !== request.revision)
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
    if (!text.trim())
      throw new ServiceError('EMPTY_SOURCE', 'The selected source has no text.', 422);
    return {
      projectId,
      projectRevision: result.projectRevision,
      scope: request.scope,
      sources: [
        {
          sourceKey: 'note:' + note.id,
          noteId: note.id,
          noteTitle: note.title,
          revision: note.revision,
          text,
          contentHash: hashContent(text),
          rangeStart: request.scope === 'EXCERPT' ? request.start : null,
          rangeEnd: request.scope === 'EXCERPT' ? request.end : null,
        },
      ],
    };
  },
});
export type AISourcesService = ReturnType<typeof createAISourcesService>;
