import type { PrismaClient, Prisma } from '@/generated/prisma/client.js';
import { lockProject } from './workspace.repository.js';
import { jsonValue } from './ai-generation.repository.js';
import { storedGenerationSchema } from '@/utils/input-validators/generations.js';
import {
  quizSettingsSchema,
  type QuizSettings,
} from '@/utils/input-validators/quizzes.js';
import { quizResultSchema, type QuizDraft } from '@/ai/schemas/quiz.js';
import type { SourceSnapshot } from '@/services/ai-sources.service.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import { PROMPT_VERSION } from '@/ai/prompts/study.js';
import type { PublishQuizInput } from '@/utils/input-validators/saved-quizzes.js';
export const versionSelect = {
  id: true,
  quizId: true,
  version: true,
  difficulty: true,
  defaultMode: true,
  includeExplanations: true,
  generatedAt: true,
  promptVersion: true,
  sources: {
    select: {
      sourceKey: true,
      noteId: true,
      noteTitle: true,
      revision: true,
      contentHash: true,
      rangeStart: true,
      rangeEnd: true,
    },
    orderBy: { sourceKey: 'asc' },
  },
  questions: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      position: true,
      type: true,
      prompt: true,
      explanation: true,
      acceptedAnswers: true,
      sourceKeys: true,
      options: {
        orderBy: { position: 'asc' },
        select: { id: true, position: true, text: true, isCorrect: true },
      },
    },
  },
} as const;
export function versionData(
  settings: QuizSettings,
  draft: QuizDraft,
  sources: Omit<SourceSnapshot, 'text'>[],
  version: number,
): Prisma.QuizVersionCreateWithoutQuizInput {
  return {
    version,
    difficulty: settings.difficulty,
    defaultMode: settings.defaultMode,
    includeExplanations: settings.includeExplanations,
    promptVersion: PROMPT_VERSION,
    sources: {
      create: sources.map((source) => ({
        sourceKey: source.sourceKey,
        noteId: source.noteId || null,
        noteTitle: source.noteTitle,
        revision: source.revision,
        contentHash: source.contentHash,
        rangeStart: source.rangeStart,
        rangeEnd: source.rangeEnd,
      })),
    },
    questions: {
      create: draft.questions.map((question, index) => ({
        position: index + 1,
        type: question.type,
        prompt: question.prompt,
        explanation: question.explanation,
        acceptedAnswers: jsonValue(
          question.type === 'IDENTIFICATION' ? question.acceptedAnswers : [],
        ),
        sourceKeys: jsonValue(question.sourceKeys),
        ...(question.type === 'IDENTIFICATION'
          ? {}
          : {
              options: {
                create: question.options.map((option, position) => ({
                  position: position + 1,
                  text: option.text,
                  isCorrect: question.correctOptionIds.includes(option.id),
                })),
              },
            }),
      })),
    },
  };
}
export const createQuizzesRepository = (db: PrismaClient) => ({
  list: (
    ownerId: string,
    projectId: string,
    page: number,
    pageSize: number,
    search: string,
  ) =>
    db.$transaction(async (tx) => {
      if (
        !(await tx.project.findFirst({
          where: { id: projectId, ownerId, deletedAt: null },
          select: { id: true },
        }))
      )
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const where = {
        projectId,
        deletedAt: null,
        title: { contains: search, mode: 'insensitive' as const },
      };
      const [data, total] = await Promise.all([
        tx.quiz.findMany({
          where,
          select: {
            id: true,
            title: true,
            projectId: true,
            createdAt: true,
            updatedAt: true,
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
              select: {
                id: true,
                version: true,
                difficulty: true,
                generatedAt: true,
                _count: { select: { questions: true } },
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.quiz.count({ where }),
      ]);
      return { data, total, page, pageSize };
    }),
  versions: async (ownerId: string, quizId: string, page: number, pageSize: number) => {
    if (
      !(await db.quiz.findFirst({
        where: { id: quizId, deletedAt: null, project: { ownerId, deletedAt: null } },
        select: { id: true },
      }))
    )
      throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    const where = { quizId };
    const [data, total] = await db.$transaction([
      db.quizVersion.findMany({
        where,
        orderBy: { version: 'desc' },
        select: {
          id: true,
          quizId: true,
          version: true,
          difficulty: true,
          defaultMode: true,
          includeExplanations: true,
          generatedAt: true,
          _count: { select: { questions: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.quizVersion.count({ where }),
    ]);
    return { data, total, page, pageSize };
  },
  rename: (ownerId: string, quizId: string, title: string) =>
    db.$transaction(async (tx) => {
      const quiz = await tx.quiz.findFirst({
        where: { id: quizId, deletedAt: null, project: { ownerId, deletedAt: null } },
        select: { projectId: true },
      });
      if (!quiz) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      await lockProject(tx, ownerId, quiz.projectId);
      const updated = await tx.quiz.updateMany({
        where: { id: quizId, deletedAt: null },
        data: { title },
      });
      if (!updated.count)
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      await tx.project.update({
        where: { id: quiz.projectId },
        data: { revision: { increment: 1 } },
      });
      return tx.quiz.findUniqueOrThrow({
        where: { id: quizId },
        select: { id: true, projectId: true, title: true, updatedAt: true },
      });
    }),
  remove: (ownerId: string, quizId: string) =>
    db.$transaction(async (tx) => {
      const quiz = await tx.quiz.findFirst({
        where: { id: quizId, deletedAt: null, project: { ownerId, deletedAt: null } },
        select: { projectId: true },
      });
      if (!quiz) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      await lockProject(tx, ownerId, quiz.projectId);
      await tx.quiz.updateMany({
        where: { id: quizId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await tx.project.update({
        where: { id: quiz.projectId },
        data: { revision: { increment: 1 } },
      });
    }),
  duplicate: (ownerId: string, quizId: string, expectedVersion: number) =>
    db.$transaction(async (tx) => {
      const quiz = await tx.quiz.findFirst({
        where: { id: quizId, deletedAt: null, project: { ownerId, deletedAt: null } },
        select: { projectId: true, title: true },
      });
      if (!quiz) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      await lockProject(tx, ownerId, quiz.projectId);
      const latest = await tx.quizVersion.findFirst({
        where: { quizId, quiz: { deletedAt: null } },
        orderBy: { version: 'desc' },
        select: versionSelect,
      });
      if (!latest)
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      if (latest.version !== expectedVersion)
        throw new ServiceError(
          'VERSION_CONFLICT',
          'Reload the latest quiz version before duplicating.',
          409,
        );
      const title = quiz.title.slice(0, 193) + ' (copy)';
      const settings = quizSettingsSchema.parse({
        title,
        questionCount: latest.questions.length,
        questionTypes: [...new Set(latest.questions.map((question) => question.type))],
        difficulty: latest.difficulty,
        defaultMode: latest.defaultMode,
        includeExplanations: latest.includeExplanations,
      });
      const raw = {
        title,
        questions: latest.questions.map((question) => ({
          type: question.type,
          prompt: question.prompt,
          explanation: question.explanation,
          sourceKeys: question.sourceKeys,
          ...(question.type === 'IDENTIFICATION'
            ? { acceptedAnswers: question.acceptedAnswers }
            : {
                options: question.options.map((option) => ({
                  id: option.id,
                  text: option.text,
                })),
                correctOptionIds: question.options
                  .filter((option) => option.isCorrect)
                  .map((option) => option.id),
              }),
        })),
      };
      const content = quizResultSchema(
        settings,
        latest.sources.map((source) => source.sourceKey),
      ).parse(raw);
      const data = versionData(
        settings,
        content,
        latest.sources.map((source) => ({ ...source, noteId: source.noteId ?? '' })),
        1,
      );
      data.promptVersion = 'duplicate-v1';
      const copy = await tx.quiz.create({
        data: { projectId: quiz.projectId, title, versions: { create: data } },
        select: {
          id: true,
          title: true,
          projectId: true,
          versions: { select: versionSelect },
        },
      });
      await tx.project.update({
        where: { id: quiz.projectId },
        data: { revision: { increment: 1 } },
      });
      return copy;
    }),
  find: async (ownerId: string, id: string) => {
    const quiz = await db.quiz.findFirst({
      where: { id, deletedAt: null, project: { ownerId, deletedAt: null } },
      select: {
        id: true,
        projectId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!quiz) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    return quiz;
  },
  publish: (ownerId: string, quizId: string, input: PublishQuizInput) =>
    db.$transaction(async (tx) => {
      const quiz = await tx.quiz.findFirst({
        where: { id: quizId, deletedAt: null, project: { ownerId, deletedAt: null } },
        select: { projectId: true },
      });
      if (!quiz) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      await lockProject(tx, ownerId, quiz.projectId);
      if (
        !(await tx.quiz.findFirst({
          where: { id: quizId, deletedAt: null },
          select: { id: true },
        }))
      )
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const latest = await tx.quizVersion.findFirstOrThrow({
        where: { quizId },
        orderBy: { version: 'desc' },
        select: versionSelect,
      });
      let stored: ReturnType<typeof storedGenerationSchema.parse> | undefined;
      if ('generationId' in input) {
        const generation = await tx.aIUsage.findFirst({
          where: {
            id: input.generationId,
            userId: ownerId,
            operation: 'QUIZ',
            status: 'SUCCEEDED',
          },
        });
        if (!generation)
          throw new ServiceError(
            'RESOURCE_NOT_FOUND',
            'Completed generation not found',
            404,
          );
        stored = storedGenerationSchema.parse(generation.result);
        if (stored.projectId !== quiz.projectId || stored.operation !== 'QUIZ')
          throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
        if (generation.resultId) {
          if (generation.resultId !== quizId || !stored.acceptedVersionId)
            throw new ServiceError(
              'GENERATION_ACCEPTED',
              'This generation was already accepted.',
              409,
            );
          return tx.quizVersion.findUniqueOrThrow({
            where: { id: stored.acceptedVersionId },
            select: versionSelect,
          });
        }
      }
      if (input.expectedVersion !== latest.version)
        throw new ServiceError(
          'VERSION_CONFLICT',
          'Reload the latest quiz version before publishing.',
          409,
        );
      const settings =
        'settings' in input ? input.settings : quizSettingsSchema.parse(stored!.settings);
      const sources = stored
        ? stored.manifest.sources
        : latest.sources.map((source) => ({ ...source, noteId: source.noteId ?? '' }));
      const content = quizResultSchema(
        settings,
        sources.map((source) => source.sourceKey),
      ).parse('content' in input ? input.content : stored!.output);
      const available = await tx.note.findMany({
        where: {
          id: { in: sources.map((source) => source.noteId).filter(Boolean) },
          project: { ownerId },
        },
        select: { id: true },
      });
      const safeSources = sources.map((source) => ({
        ...source,
        noteId: available.some((note) => note.id === source.noteId) ? source.noteId : '',
      }));
      const data = versionData(settings, content, safeSources, latest.version + 1);
      if (!stored) data.promptVersion = 'manual-v1';
      const version = await tx.quizVersion.create({
        data: { quizId, ...data },
        select: versionSelect,
      });
      await tx.quiz.update({ where: { id: quizId }, data: { title: settings.title } });
      if ('generationId' in input)
        await tx.aIUsage.update({
          where: { id: input.generationId },
          data: {
            resultId: quizId,
            result: jsonValue({ ...stored, acceptedVersionId: version.id }),
          },
        });
      await tx.project.update({
        where: { id: quiz.projectId },
        data: { revision: { increment: 1 } },
      });
      return version;
    }),
  save: (
    ownerId: string,
    projectId: string,
    generationId: string,
    edited?: { settings: QuizSettings; content: QuizDraft },
  ) =>
    db.$transaction(async (tx) => {
      await lockProject(tx, ownerId, projectId);
      const usage = await tx.aIUsage.findFirst({
        where: {
          id: generationId,
          userId: ownerId,
          operation: 'QUIZ',
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
        const version = await tx.quizVersion.findFirst({
          where: {
            quizId: usage.resultId,
            version: 1,
            quiz: { projectId, deletedAt: null },
          },
          select: versionSelect,
        });
        if (!version)
          throw new ServiceError(
            'GENERATION_ACCEPTED',
            'This generation has already been accepted or removed.',
            409,
          );
        return version;
      }
      const stored = storedGenerationSchema.parse(usage.result);
      if (stored.projectId !== projectId || stored.operation !== 'QUIZ')
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const settings = quizSettingsSchema.parse(edited?.settings ?? stored.settings);
      const draft = quizResultSchema(
        settings,
        stored.manifest.sources.map((source) => source.sourceKey),
      ).parse(edited?.content ?? stored.output);
      const available = await tx.note.findMany({
        where: {
          id: { in: stored.manifest.sources.map((source) => source.noteId) },
          project: { ownerId },
        },
        select: { id: true },
      });
      const sources = stored.manifest.sources.map((source) => ({
        ...source,
        noteId: available.some((note) => note.id === source.noteId) ? source.noteId : '',
      }));
      const quiz = await tx.quiz.create({
        data: {
          projectId,
          title: draft.title,
          versions: { create: versionData(settings, draft, sources, 1) },
        },
        select: { id: true, versions: { select: versionSelect } },
      });
      await tx.aIUsage.update({
        where: { id: generationId },
        data: { resultId: quiz.id },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { revision: { increment: 1 } },
      });
      return quiz.versions[0]!;
    }),
  authoring: async (ownerId: string, quizId: string, versionId: string) => {
    const version = await db.quizVersion.findFirst({
      where: {
        id: versionId,
        quizId,
        quiz: { deletedAt: null, project: { ownerId, deletedAt: null } },
      },
      select: versionSelect,
    });
    if (!version) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    return version;
  },
});
export type QuizzesRepository = ReturnType<typeof createQuizzesRepository>;
