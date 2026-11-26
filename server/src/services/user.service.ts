import type { UserRepository } from '@/repositories/user.repository.js';
import type { VerifiedIdentity, UserProfile } from '@/types/auth.type.js';

export interface UserService {
  synchronize: (identity: VerifiedIdentity) => Promise<UserProfile>;
  updateProfile: (id: string, displayName: string) => Promise<UserProfile>;
}

export const createUserService = (repository: UserRepository): UserService => ({
  synchronize: async (identity) => repository.synchronize(identity),
  updateProfile: async (id, displayName) => repository.updateProfile(id, displayName),
});
