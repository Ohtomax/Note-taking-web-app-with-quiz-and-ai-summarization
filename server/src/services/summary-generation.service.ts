import type { AIGenerationService } from './ai-generation.service.js';
import type { SummaryGenerationInput } from '@/utils/input-validators/generations.js';
import { storedGenerationSchema } from '@/utils/input-validators/generations.js';
import { summaryResultSchema } from '@/ai/schemas/summary.js';
export function generationView(record: Awaited<ReturnType<AIGenerationService['get']>>) {
  const parsed = storedGenerationSchema.safeParse(record.result);
  return {
    id: record.id,
    status: record.status,
    resultId: record.resultId,
    errorCode: record.errorCode,
    result:
      record.status === 'SUCCEEDED' && parsed.success
        ? {
            projectId: parsed.data.projectId,
            operation: parsed.data.operation,
            settings: parsed.data.settings,
            output: parsed.data.output,
            sources: parsed.data.manifest.sources.map(
              ({
                sourceKey,
                noteId,
                noteTitle,
                revision,
                contentHash,
                rangeStart,
                rangeEnd,
              }) => ({
                sourceKey,
                noteId,
                noteTitle,
                revision,
                contentHash,
                rangeStart,
                rangeEnd,
              }),
            ),
          }
        : null,
  };
}
export const createSummaryGenerationService = (generation: AIGenerationService) => ({
  generate: async (
    ownerId: string,
    projectId: string,
    key: string,
    input: SummaryGenerationInput,
  ) =>
    generationView(
      await generation.execute(
        ownerId,
        projectId,
        key,
        'SUMMARY',
        input.source,
        input.settings,
        (manifest) =>
          summaryResultSchema(
            input.settings,
            manifest.sources.map((s) => s.sourceKey),
          ),
      ),
    ),
  get: async (ownerId: string, id: string) =>
    generationView(await generation.get(ownerId, id)),
});
export type SummaryGenerationService = ReturnType<typeof createSummaryGenerationService>;
