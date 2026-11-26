import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const requireOwnedResource = async <T extends { id: string }>(
  result: Promise<T | null>,
): Promise<T> => {
  const resource = await result;
  if (!resource) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
  return resource;
};
