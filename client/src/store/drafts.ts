import { create } from 'zustand';
import type { NoteDraft } from '@/types/note';

interface DraftState {
  drafts: Record<string, NoteDraft>;
  setDraft: (key: string, draft: NoteDraft) => void;
  removeDraft: (key: string) => void;
  clear: () => void;
}

export const useDrafts = create<DraftState>((set) => ({
  drafts: {},
  setDraft: (key, draft) =>
    set((state) => ({ drafts: { ...state.drafts, [key]: draft } })),
  removeDraft: (key) =>
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[key];
      return { drafts };
    }),
  clear: () => set({ drafts: {} }),
}));
