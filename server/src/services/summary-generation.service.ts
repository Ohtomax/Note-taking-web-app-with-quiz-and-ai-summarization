import { z } from 'zod';
import type { SummaryContent } from '@/utils/input-validators/summaries.js';
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
const partialEnvelope = z.object({
  title: z.string(),
  sections: z.array(z.unknown()).max(24),
});

export const createSummaryGenerationService = (generation: AIGenerationService) => ({
  generate: async (
    ownerId: string,
    projectId: string,
    key: string,
    input: SummaryGenerationInput,
    onSummary?: (content: SummaryContent) => void,
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
        onSummary &&
          ((manifest) => {
            const schema = summaryResultSchema(
              input.settings,
              manifest.sources.map((source) => source.sourceKey),
            );
            let sent = 0;
            return (value) => {
              const envelope = partialEnvelope.safeParse(value);
              if (!envelope.success || envelope.data.sections.length <= sent + 1) return;
              const parsed = schema.safeParse({
                ...envelope.data,
                sections: envelope.data.sections.slice(0, -1),
              });
              if (parsed.success) {
                sent = parsed.data.sections.length;
                onSummary(parsed.data);
              }
            };
          }),
      ),
    ),
  get: async (ownerId: string, id: string) =>
    generationView(await generation.get(ownerId, id)),
});
export type SummaryGenerationService = ReturnType<typeof createSummaryGenerationService>;
