import type { QuizzesRepository } from '@/repositories/quizzes.repository.js';
import type { QuizGenerationService } from './quiz-generation.service.js';
import type { QuizGenerationInput } from '@/utils/input-validators/quizzes.js';
export const createQuizzesService = (
  repository: QuizzesRepository,
  generation: QuizGenerationService,
) => ({
  save: repository.save,
  list: repository.list,
  versions: repository.versions,
  rename: repository.rename,
  remove: repository.remove,
  duplicate: repository.duplicate,
  authoring: repository.authoring,
  find: repository.find,
  publish: repository.publish,
  regenerate: async (
    ownerId: string,
    id: string,
    key: string,
    input: QuizGenerationInput,
  ) => {
    const quiz = await repository.find(ownerId, id);
    return generation.generate(ownerId, quiz.projectId, key, input);
  },
});
export type QuizzesService = ReturnType<typeof createQuizzesService>;
