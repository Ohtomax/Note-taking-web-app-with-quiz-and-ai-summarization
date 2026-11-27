import { z } from 'zod';
import { noteContentSchema } from './note-content';

export const projectSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  color: z.enum(['slate', 'blue', 'green', 'purple', 'rose', 'amber']),
  icon: z.enum(['folder', 'book', 'code', 'science', 'language']),
  revision: z.number().int().positive(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  noteCount: z.number().int().nonnegative().optional(),
});
export type Project = z.infer<typeof projectSchema>;
export const projectResponseSchema = z.object({ data: projectSchema });
export const projectPageSchema = z.object({
  data: z.array(projectSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export interface ListQuery {
  page: number;
  pageSize: number;
  search: string;
  archived: boolean;
  sort: 'title' | 'createdAt' | 'updatedAt';
  order: 'asc' | 'desc';
}
export interface ProjectInput {
  title: string;
  description: string;
  color: Project['color'];
  icon: Project['icon'];
}
export const deletionPreviewSchema = z.object({
  data: z.object({
    projectId: z.string().uuid(),
    title: z.string(),
    impactRevision: z.number().int(),
    notes: z.number().int(),
    summaries: z.number().int(),
    quizzes: z.number().int(),
    retainedAttempts: z.number().int(),
  }),
});
export type DeletionPreview = z.infer<typeof deletionPreviewSchema>['data'];

export const noteItemSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  revision: z.number().int().positive(),
  pinned: z.boolean(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NoteItem = z.infer<typeof noteItemSchema>;
export const noteSchema = noteItemSchema.extend({
  content: noteContentSchema,
  contentSchemaVersion: z.number().int(),
});
export type Note = z.infer<typeof noteSchema>;
export const noteResponseSchema = z.object({ data: noteSchema });
export const notePageSchema = z.object({
  data: z.array(noteItemSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
