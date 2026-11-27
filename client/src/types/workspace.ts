import { z } from 'zod';

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
