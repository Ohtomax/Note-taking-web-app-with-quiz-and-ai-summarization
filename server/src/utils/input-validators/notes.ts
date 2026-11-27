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

export const updateNoteSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    title: z.string().trim().min(1).max(200).optional(),
    content: noteContentSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 1);

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const noteListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(200).default(''),
    archived: z.enum(['true', 'false']).default('false'),
    sort: z.enum(['title', 'createdAt', 'updatedAt']).default('updatedAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export type NoteListInput = z.infer<typeof noteListSchema>;

export const pinNoteSchema = z
  .object({ expectedRevision: z.number().int().positive(), pinned: z.boolean() })
  .strict();

export const deleteNoteSchema = z
  .object({ expectedRevision: z.number().int().positive(), confirmed: z.literal(true) })
  .strict();

export const moveNoteSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    destinationProjectId: z.string().uuid(),
  })
  .strict();
