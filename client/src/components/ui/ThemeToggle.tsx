import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/store/theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const Icon = dark ? Sun : Moon;
  return (
    <button
      className="action w-10 px-0"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Dark theme"
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Icon aria-hidden="true" size={17} />
    </button>
  );
}
