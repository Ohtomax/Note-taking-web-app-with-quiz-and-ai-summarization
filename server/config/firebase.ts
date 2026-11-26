import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { parseServiceAccount, type Environment } from './env.ts';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import type { TokenVerifier } from '@/types/auth.type.js';

export const createFirebaseVerifier = (
  environment: Environment,
): {
  verify: TokenVerifier;
  app: App | undefined;
} => {
  if (!environment.FIREBASE_SERVICE_ACCOUNT) {
    return {
      app: undefined,
      verify: async () => {
        throw new ServiceError(
          'SERVICE_UNAVAILABLE',
          'Authentication is unavailable',
          503,
        );
      },
    };
  }
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST && environment.NODE_ENV !== 'test') {
    throw new Error('Firebase emulator is allowed only in test mode');
  }
  const account = parseServiceAccount(environment.FIREBASE_SERVICE_ACCOUNT);
  const app = initializeApp(
    {
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
      projectId: account.project_id,
    },
    'study-api',
  );
  return {
    app,
    verify: async (token) => {
      const decoded = await getAuth(app).verifyIdToken(token, true);
      return {
        uid: decoded.uid,
        ...(decoded.email ? { email: decoded.email } : {}),
        ...(decoded.name && typeof decoded.name === 'string'
          ? { name: decoded.name }
          : {}),
      };
    },
  };
};
