import type { Prisma } from '@/generated/prisma/client.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

// Lock parents before children. Every child write advances the parent's impact revision.
export async function lockProject(
  tx: Prisma.TransactionClient,
  ownerId: string,
  projectId: string,
  writable = true,
) {
  await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${projectId}::uuid AND "ownerId" = ${ownerId}::uuid AND "deletedAt" IS NULL FOR UPDATE`;
  const project = await tx.project.findFirst({
    where: { id: projectId, ownerId, deletedAt: null },
  });
  if (!project) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
  if (writable && project.archivedAt)
    throw new ServiceError('PROJECT_ARCHIVED', 'Restore the project before editing', 409);
  return project;
}

export function checkRevision(current: number, expected: number): void {
  if (current !== expected)
    throw new ServiceError(
      'REVISION_CONFLICT',
      'Reload the latest version before retrying',
      409,
    );
}
