import { apiRequest } from './client';
import {
  profileInputSchema,
  profileResponseSchema,
  type ProfileInput,
} from '@/types/profile';
export const profileApi = {
  find: async (signal?: AbortSignal) =>
    profileResponseSchema.parse(
      await apiRequest<unknown>('/me', signal ? { signal } : {}),
    ),
  update: async (input: ProfileInput) =>
    profileResponseSchema.parse(
      await apiRequest<unknown>('/me', {
        method: 'PATCH',
        body: JSON.stringify(profileInputSchema.parse(input)),
      }),
    ),
};
