import axios from 'axios';
import { useSession } from '@/store/session';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1',
  timeout: 20_000,
});
let sessionController = new AbortController();

export const cancelSessionRequests = (): void => {
  sessionController.abort();
  sessionController = new AbortController();
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const { user, version } = useSession.getState();
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
  const signal = sessionController.signal;
  const token = await user.getIdToken();
  const idempotencyKey = new Headers(options.headers).get('Idempotency-Key');
  if (useSession.getState().version !== version)
    throw new DOMException('Session changed', 'AbortError');
  try {
    const response = await apiClient.request<T>({
      url: path,
      method: options.method ?? 'GET',
      ...(options.body ? { data: options.body } : {}),
      signal: options.signal ? AbortSignal.any([signal, options.signal]) : signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
    });
    if (useSession.getState().version !== version)
      throw new DOMException('Session changed', 'AbortError');
    return response.data;
  } catch (error) {
    if (useSession.getState().version !== version)
      throw new DOMException('Session changed', 'AbortError');
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const body: unknown = error.response.data;
      const detail =
        body && typeof body === 'object' && 'error' in body ? body.error : undefined;
      const message =
        detail &&
        typeof detail === 'object' &&
        'message' in detail &&
        typeof detail.message === 'string'
          ? detail.message
          : 'Unable to complete this request.';
      const code =
        detail &&
        typeof detail === 'object' &&
        'code' in detail &&
        typeof detail.code === 'string'
          ? detail.code
          : 'REQUEST_FAILED';
      throw new ApiError(status, code, message);
    }
    throw error;
  }
};

export const queryString = (
  values: Record<string, string | number | boolean | undefined>,
): string =>
  new URLSearchParams(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  ).toString();
