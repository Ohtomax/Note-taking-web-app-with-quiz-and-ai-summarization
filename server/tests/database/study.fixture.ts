import type { PrismaClient } from '../../src/generated/prisma/client.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { versionData } from '../../src/repositories/quizzes.repository.ts';
import { validQuiz } from '../fixtures/ai.ts';
export async function seedStudyQuiz(db: PrismaClient, projectId: string) {
  const settings = quizSettingsSchema.parse({
    title: 'Mixed study',
    questionCount: 4,
    difficulty: 'MEDIUM',
    questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'IDENTIFICATION'],
    defaultMode: 'PRACTICE',
    includeExplanations: true,
  });
  const source = {
    sourceKey: 'source',
    noteId: '',
    noteTitle: 'Synthetic notes',
    revision: 1,
    contentHash: 'a'.repeat(64),
    rangeStart: null,
    rangeEnd: null,
  };
  const quiz = await db.quiz.create({
    data: {
      projectId,
      title: settings.title,
      versions: {
        create: versionData(settings, validQuiz(settings, ['source']), [source], 1),
      },
    },
    include: {
      versions: {
        include: {
          questions: {
            orderBy: { position: 'asc' },
            include: { options: { orderBy: { position: 'asc' } } },
          },
        },
      },
    },
  });
  return { quiz, version: quiz.versions[0]!, settings };
}
