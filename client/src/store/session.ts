import { create } from 'zustand';

export interface SessionUser {
  uid: string;
  email: string | null;
  getIdToken: () => Promise<string>;
}

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  version: number;
  resolve: (user: SessionUser | null) => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  loading: true,
  version: 0,
  resolve: (user) =>
    set((state) => ({
      user,
      loading: false,
      version: state.version + 1,
    })),
}));
