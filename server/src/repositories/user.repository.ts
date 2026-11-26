import type { PrismaClient } from '@/generated/prisma/client.js';
import { Prisma } from '@/generated/prisma/client.js';
import type { VerifiedIdentity, UserProfile } from '@/types/auth.type.js';

const profileSelect = {
  id: true,
  displayName: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export interface UserRepository {
  synchronize: (identity: VerifiedIdentity) => Promise<UserProfile>;
  updateProfile: (id: string, displayName: string) => Promise<UserProfile>;
}

export const createUserRepository = (prisma: PrismaClient): UserRepository => ({
  synchronize: async (identity) => {
    try {
      return await prisma.user.upsert({
        where: { firebaseUid: identity.uid },
        create: {
          firebaseUid: identity.uid,
          displayName: identity.name?.trim().slice(0, 100) ?? '',
          email: identity.email ?? null,
        },
        update: {},
        select: profileSelect,
      });
    } catch (error) {
      // A concurrent first request may win the unique-UID insert.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return prisma.user.findUniqueOrThrow({
          where: { firebaseUid: identity.uid },
          select: profileSelect,
        });
      }
      throw error;
    }
  },
  updateProfile: async (id, displayName) =>
    prisma.user.update({ where: { id }, data: { displayName }, select: profileSelect }),
});
