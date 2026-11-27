import type { PrismaClient } from '../src/generated/prisma/client.ts';
import type { AIClient } from '@/ai/client.js';
import { createAISourcesRepository } from '@/repositories/ai-sources.repository.js';
import { createAISourcesService } from '@/services/ai-sources.service.js';
import { createAIUsageRepository } from '@/repositories/ai-usage.repository.js';
import { createAIUsageService } from '@/services/ai-usage.service.js';
import { createAIAdmissionRepository } from '@/repositories/ai-admission.repository.js';
import { createAIGenerationRepository } from '@/repositories/ai-generation.repository.js';
import { createAIGenerationService } from '@/services/ai-generation.service.js';
import { createSummaryGenerationService } from '@/services/summary-generation.service.js';
import { createSummariesRepository } from '@/repositories/summaries.repository.js';
import { createSummariesService } from '@/services/summaries.service.js';
import { createQuizGenerationService } from '@/services/quiz-generation.service.js';
import { createQuizzesRepository } from '@/repositories/quizzes.repository.js';
import { createQuizzesService } from '@/services/quizzes.service.js';
export function createStudyServices(db: PrismaClient, client: AIClient) {
  const aiUsageService = createAIUsageService(createAIUsageRepository(db));
  const generationService = createAIGenerationService({
    client,
    sources: createAISourcesService(createAISourcesRepository(db)),
    repository: createAIGenerationRepository(db),
    admission: createAIAdmissionRepository(db),
    usage: aiUsageService,
  });
  return {
    quizzesService: createQuizzesService(
      createQuizzesRepository(db),
      createQuizGenerationService(generationService),
    ),
    quizGenerationService: createQuizGenerationService(generationService),
    summariesService: createSummariesService(
      createSummariesRepository(db),
      createSummaryGenerationService(generationService),
    ),
    aiUsageService,
    generationService,
    summaryGenerationService: createSummaryGenerationService(generationService),
  };
}
