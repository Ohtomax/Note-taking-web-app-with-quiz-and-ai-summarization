import { useEffect, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/config/firebase';
import { resolveSession } from './session.service';

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!firebaseAuth) {
      resolveSession(null);
      return;
    }
    return onAuthStateChanged(firebaseAuth, resolveSession, () => resolveSession(null));
  }, []);
  return children;
}
