import { Prisma, type PrismaClient } from '@/generated/prisma/client.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export async function serializable<T>(
  db: PrismaClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++)
    try {
      return await db.$transaction(run, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (!(
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
      ))
        throw error;
      if (attempt >= 4)
        throw new ServiceError('BUSY', 'Please retry this operation shortly.', 409);
    }
}
