import type { PrismaClient } from '@/generated/prisma/client.js';
import { lockProject } from './workspace.repository.js';
import { jsonValue } from './ai-generation.repository.js';
import { storedGenerationSchema } from '@/utils/input-validators/generations.js';
import {
  summarySettingsSchema,
  type UpdateSummaryInput,
  type SummaryContent,
} from '@/utils/input-validators/summaries.js';
import { summaryResultSchema } from '@/ai/schemas/summary.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
const sourceSelect = {
  sourceKey: true,
  noteId: true,
  noteTitle: true,
  revision: true,
  contentHash: true,
  rangeStart: true,
  rangeEnd: true,
  note: {
    select: { revision: true, deletedAt: true, archivedAt: true, projectId: true },
  },
} as const;
const summarySelect = {
  id: true,
  projectId: true,
  title: true,
  content: true,
  settings: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true,
  sources: { select: sourceSelect },
} as const;
function projectSummary<
  T extends {
    projectId: string;
    sources: Array<{
      revision: number;
      note: {
        revision: number;
        deletedAt: Date | null;
        archivedAt: Date | null;
        projectId: string;
      } | null;
    }>;
  },
>(row: T) {
  const sources = row.sources.map(({ note, ...source }) => ({
    ...source,
    stale:
      !note ||
      note.revision !== source.revision ||
      Boolean(note.deletedAt || note.archivedAt) ||
      note.projectId !== row.projectId,
  }));
  return { ...row, sources, staleSources: sources.some((source) => source.stale) };
}
export const createSummariesRepository = (db: PrismaClient) => ({
  update: (ownerId: string, id: string, input: UpdateSummaryInput) =>
    db.$transaction(async (tx) => {
      const summary = await tx.summary.findFirst({
        where: { id, deletedAt: null, project: { ownerId, deletedAt: null } },
        select: summarySelect,
      });
      if (!summary)
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      await lockProject(tx, ownerId, summary.projectId);
      const current = await tx.summary.findFirst({
        where: { id, deletedAt: null },
        select: summarySelect,
      });
      if (!current)
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const settings = summarySettingsSchema.parse(current.settings);
      const content = summaryResultSchema(
        settings,
        current.sources.map((source) => source.sourceKey),
      ).parse(input.content ?? current.content);
      const title = input.title ?? input.content?.title ?? current.title;
      const updated = await tx.summary.update({
        where: { id },
        data: { title, content: jsonValue({ ...content, title }) },
        select: summarySelect,
      });
      await tx.project.update({
        where: { id: current.projectId },
        data: { revision: { increment: 1 } },
      });
      return projectSummary(updated);
    }),
  remove: (ownerId: string, id: string) =>
    db.$transaction(async (tx) => {
      const summary = await tx.summary.findFirst({
        where: { id, deletedAt: null, project: { ownerId, deletedAt: null } },
        select: { projectId: true },
      });
      if (!summary)
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      await lockProject(tx, ownerId, summary.projectId);
      await tx.summary.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.project.update({
        where: { id: summary.projectId },
        data: { revision: { increment: 1 } },
      });
    }),
  save: (
    ownerId: string,
    projectId: string,
    generationId: string,
    editedContent?: SummaryContent,
  ) =>
    db.$transaction(async (tx) => {
      await lockProject(tx, ownerId, projectId);
      const usage = await tx.aIUsage.findFirst({
        where: {
          id: generationId,
          userId: ownerId,
          operation: 'SUMMARY',
          status: 'SUCCEEDED',
        },
      });
      if (!usage)
        throw new ServiceError(
          'RESOURCE_NOT_FOUND',
          'Completed generation not found',
          404,
        );
      if (usage.resultId) {
        const existing = await tx.summary.findFirst({
          where: { id: usage.resultId, projectId, deletedAt: null },
          select: summarySelect,
        });
        if (!existing)
          throw new ServiceError(
            'GENERATION_ACCEPTED',
            'This generation has already been accepted or removed.',
            409,
          );
        return projectSummary(existing);
      }
      const stored = storedGenerationSchema.parse(usage.result);
      if (stored.projectId !== projectId || stored.operation !== 'SUMMARY')
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const settings = summarySettingsSchema.parse(stored.settings);
      const content = summaryResultSchema(
        settings,
        stored.manifest.sources.map((s) => s.sourceKey),
      ).parse(editedContent ?? stored.output);
      const available = await tx.note.findMany({
        where: {
          id: { in: stored.manifest.sources.map((s) => s.noteId) },
          project: { ownerId },
        },
        select: { id: true },
      });
      const summary = await tx.summary.create({
        data: {
          projectId,
          title: content.title,
          content: jsonValue(content),
          settings: jsonValue(settings),
          sources: {
            create: stored.manifest.sources.map((source) => ({
              sourceKey: source.sourceKey,
              noteId: available.some((note) => note.id === source.noteId)
                ? source.noteId
                : null,
              noteTitle: source.noteTitle,
              revision: source.revision,
              excerpt: source.rangeStart !== null ? source.text : null,
              rangeStart: source.rangeStart,
              rangeEnd: source.rangeEnd,
              contentHash: source.contentHash,
            })),
          },
        },
        select: summarySelect,
      });
      await tx.aIUsage.update({
        where: { id: generationId },
        data: { resultId: summary.id },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { revision: { increment: 1 } },
      });
      return projectSummary(summary);
    }),
  find: async (ownerId: string, id: string) => {
    const row = await db.summary.findFirst({
      where: { id, deletedAt: null, project: { ownerId, deletedAt: null } },
      select: summarySelect,
    });
    if (!row) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    return projectSummary(row);
  },
  list: (ownerId: string, projectId: string, page: number, pageSize: number) =>
    db.$transaction(async (tx) => {
      const parent = await tx.project.findFirst({
        where: { id: projectId, ownerId, deletedAt: null },
        select: { id: true },
      });
      if (!parent)
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const where = { projectId, deletedAt: null };
      const [rows, total] = await Promise.all([
        tx.summary.findMany({
          where,
          select: summarySelect,
          orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.summary.count({ where }),
      ]);
      return { data: rows.map(projectSummary), total, page, pageSize };
    }),
});
export type SummariesRepository = ReturnType<typeof createSummariesRepository>;
