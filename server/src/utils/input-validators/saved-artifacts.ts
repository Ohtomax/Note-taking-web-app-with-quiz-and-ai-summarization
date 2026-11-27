import { z } from 'zod';
export const saveGenerationSchema = z
  .object({ generationId: z.string().uuid() })
  .strict();
export const summaryParamsSchema = z.object({ summaryId: z.string().uuid() }).strict();
export const confirmDeleteSchema = z.object({ confirmed: z.literal(true) }).strict();
