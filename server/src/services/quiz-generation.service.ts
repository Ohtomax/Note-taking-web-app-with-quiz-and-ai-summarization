import type { AIGenerationService } from './ai-generation.service.js';
import type { QuizGenerationInput } from '@/utils/input-validators/quizzes.js';
import { quizResultSchema } from '@/ai/schemas/quiz.js';
import { generationView } from './summary-generation.service.js';
export const createQuizGenerationService = (generation: AIGenerationService) => ({
  generate: async (
    ownerId: string,
    projectId: string,
    key: string,
    input: QuizGenerationInput,
  ) =>
    generationView(
      await generation.execute(
        ownerId,
        projectId,
        key,
        'QUIZ',
        input.source,
        input.settings,
        (manifest) =>
          quizResultSchema(
            input.settings,
            manifest.sources.map((source) => source.sourceKey),
          ),
      ),
    ),
});
export type QuizGenerationService = ReturnType<typeof createQuizGenerationService>;
