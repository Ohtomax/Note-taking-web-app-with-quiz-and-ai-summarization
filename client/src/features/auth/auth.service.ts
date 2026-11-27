import {
  browserLocalPersistence,
  setPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { firebaseAuth } from '@/config/firebase';

function configuredAuth() {
  if (!firebaseAuth)
    throw new Error('Authentication is waiting for project configuration.');
  return firebaseAuth;
}
export async function signIn(email: string, password: string): Promise<void> {
  const auth = configuredAuth();
  await setPersistence(auth, browserLocalPersistence);
  await signInWithEmailAndPassword(auth, email, password);
}
export async function register(email: string, password: string): Promise<void> {
  const auth = configuredAuth();
  await setPersistence(auth, browserLocalPersistence);
  await createUserWithEmailAndPassword(auth, email, password);
}
export async function logOut(): Promise<void> {
  await signOut(configuredAuth());
}
export async function recoverPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(configuredAuth(), email);
}
export async function resetPassword(code: string, password: string): Promise<void> {
  const auth = configuredAuth();
  await verifyPasswordResetCode(auth, code);
  await confirmPasswordReset(auth, code, password);
}
export function authError(error: unknown): string {
  const code =
    typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (['auth/expired-action-code', 'auth/invalid-action-code'].includes(code))
    return 'This reset link is invalid or expired. Request a new one.';
  if (code === 'auth/weak-password') return 'Use a password with at least 8 characters.';
  if (code === 'auth/too-many-requests')
    return 'Too many attempts. Please try again later.';
  if (code === 'auth/network-request-failed')
    return 'Unable to connect. Check your connection and try again.';
  return 'Unable to complete this request. Check your details and try again.';
}
