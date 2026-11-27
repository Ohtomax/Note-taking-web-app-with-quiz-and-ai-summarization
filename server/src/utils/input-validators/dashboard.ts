import { z } from 'zod';
export const openNoteParamsSchema = z
  .object({ projectId: z.string().uuid(), noteId: z.string().uuid() })
  .strict();
export const dashboardQuerySchema = z.object({}).strict();
export const openNoteInputSchema = z.object({}).strict();
