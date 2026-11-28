import { create } from 'zustand';
import type { NoteDraft } from '@/types/note';

import type { SaveAnswerInput } from '@/types/attempts';

interface DraftState {
  quizAnswers: Record<string, SaveAnswerInput>;
  setQuizAnswer: (key: string, answer: SaveAnswerInput) => void;
  removeQuizAnswer: (key: string) => void;
  drafts: Record<string, NoteDraft>;
  setDraft: (key: string, draft: NoteDraft) => void;
  removeDraft: (key: string) => void;
  clear: () => void;
}

export const useDrafts = create<DraftState>((set) => ({
  drafts: {},
  quizAnswers: {},
  setQuizAnswer: (key, answer) =>
    set((state) => ({ quizAnswers: { ...state.quizAnswers, [key]: answer } })),
  removeQuizAnswer: (key) =>
    set((state) => {
      const quizAnswers = { ...state.quizAnswers };
      delete quizAnswers[key];
      return { quizAnswers };
    }),
  setDraft: (key, draft) =>
    set((state) => ({ drafts: { ...state.drafts, [key]: draft } })),
  removeDraft: (key) =>
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[key];
      return { drafts };
    }),
  clear: () => set({ drafts: {}, quizAnswers: {} }),
}));
