import { z } from 'zod';
import {
  emptyDocument,
  noteContentSchema,
} from '@/utils/input-validators/note-content.js';

export const noteParamsSchema = z
  .object({ projectId: z.string().uuid(), noteId: z.string().uuid() })
  .strict();

export const createNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(200).default('Untitled note'),
    content: noteContentSchema.default(emptyDocument),
  })
  .strict();

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
