import type { SummariesRepository } from '@/repositories/summaries.repository.js';
import type { SummaryGenerationService } from './summary-generation.service.js';
import type { SummaryGenerationInput } from '@/utils/input-validators/generations.js';
export const createSummariesService = (
  repository: SummariesRepository,
  generation: SummaryGenerationService,
) => ({
  save: repository.save,
  find: repository.find,
  list: repository.list,
  update: repository.update,
  remove: repository.remove,
  regenerate: async (
    ownerId: string,
    id: string,
    key: string,
    input: SummaryGenerationInput,
  ) => {
    const summary = await repository.find(ownerId, id);
    return generation.generate(ownerId, summary.projectId, key, input);
  },
});
export type SummariesService = ReturnType<typeof createSummariesService>;
