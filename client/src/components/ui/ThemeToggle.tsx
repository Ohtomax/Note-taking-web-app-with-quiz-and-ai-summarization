import { useEffect } from 'react';
import { useTheme } from '@/store/theme';
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return (
    <button
      className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
      onClick={toggle}
      aria-pressed={theme === 'dark'}
    >
      Dark theme
    </button>
  );
}
