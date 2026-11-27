import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const settings = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY ?? ''),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? ''),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? ''),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID ?? ''),
};
// Blank configuration leaves a useful setup state; the owner supplies actual settings.
export const firebaseAuth = Object.values(settings).every(Boolean)
  ? getAuth(initializeApp(settings))
  : null;
