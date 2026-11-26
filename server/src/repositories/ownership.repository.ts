import type { PrismaClient } from '@/generated/prisma/client.js';

export const createOwnershipRepository = (prisma: PrismaClient) => ({
  project: (ownerId: string, projectId: string) =>
    prisma.project.findFirst({
      where: { id: projectId, ownerId, deletedAt: null },
      select: { id: true },
    }),
  note: (ownerId: string, projectId: string, noteId: string) =>
    prisma.note.findFirst({
      where: {
        id: noteId,
        projectId,
        deletedAt: null,
        project: { ownerId, deletedAt: null },
      },
      select: { id: true },
    }),
  summary: (ownerId: string, summaryId: string) =>
    prisma.summary.findFirst({
      where: { id: summaryId, deletedAt: null, project: { ownerId, deletedAt: null } },
      select: { id: true },
    }),
  quiz: (ownerId: string, quizId: string) =>
    prisma.quiz.findFirst({
      where: { id: quizId, deletedAt: null, project: { ownerId, deletedAt: null } },
      select: { id: true },
    }),
  question: (ownerId: string, questionId: string) =>
    prisma.quizQuestion.findFirst({
      where: { id: questionId, version: { quiz: { project: { ownerId } } } },
      select: { id: true },
    }),
  attempt: (ownerId: string, attemptId: string) =>
    prisma.quizAttempt.findFirst({
      where: { id: attemptId, version: { quiz: { project: { ownerId } } } },
      select: { id: true },
    }),
  usage: (ownerId: string, usageId: string) =>
    prisma.aIUsage.findFirst({
      where: { id: usageId, userId: ownerId },
      select: { id: true },
    }),
});
