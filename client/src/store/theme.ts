import { create } from 'zustand';
type Theme = 'light' | 'dark';
const initial = (): Theme => {
  try {
    return localStorage.getItem('study-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};
export const useTheme = create<{ theme: Theme; toggle: () => void }>((set) => ({
  theme: initial(),
  toggle: () =>
    set((state) => {
      const theme = state.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('study-theme', theme);
      } catch {
        /* Theme remains available without storage. */
      }
      return { theme };
    }),
}));
