import type { SummariesRepository } from '@/repositories/summaries.repository.js';
export const createSummariesService = (repository: SummariesRepository) => ({
  save: repository.save,
  find: repository.find,
  list: repository.list,
});
export type SummariesService = ReturnType<typeof createSummariesService>;
