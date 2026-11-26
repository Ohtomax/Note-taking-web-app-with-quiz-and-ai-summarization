import type { PrismaClient } from '@/generated/prisma/client.js';

type OwnershipDatabase = Pick<
  PrismaClient,
  | 'project'
  | 'note'
  | 'summary'
  | 'quiz'
  | 'quizQuestion'
  | 'quizAttempt'
  | 'aIUsage'
  | 'quizVersion'
  | 'quizQuestionOption'
  | 'quizAttemptAnswer'
  | 'summarySource'
  | 'quizSource'
>;

export const createOwnershipRepository = (prisma: OwnershipDatabase) => ({
  version: (ownerId: string, quizId: string, versionId: string) =>
    prisma.quizVersion.findFirst({
      where: { id: versionId, quizId, quiz: { project: { ownerId } } },
      select: { id: true },
    }),
  option: (ownerId: string, questionId: string, optionId: string) =>
    prisma.quizQuestionOption.findFirst({
      where: {
        id: optionId,
        questionId,
        question: { version: { quiz: { project: { ownerId } } } },
      },
      select: { id: true },
    }),
  answer: (ownerId: string, attemptId: string, answerId: string) =>
    prisma.quizAttemptAnswer.findFirst({
      where: {
        id: answerId,
        attemptId,
        attempt: { version: { quiz: { project: { ownerId } } } },
      },
      select: { id: true },
    }),
  summarySource: (ownerId: string, summaryId: string, sourceId: string) =>
    prisma.summarySource.findFirst({
      where: { id: sourceId, summaryId, summary: { project: { ownerId } } },
      select: { id: true },
    }),
  quizSource: (ownerId: string, versionId: string, sourceId: string) =>
    prisma.quizSource.findFirst({
      where: {
        id: sourceId,
        quizVersionId: versionId,
        quizVersion: { quiz: { project: { ownerId } } },
      },
      select: { id: true },
    }),
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
