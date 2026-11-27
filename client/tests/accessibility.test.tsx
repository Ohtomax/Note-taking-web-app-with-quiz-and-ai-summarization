import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/store/theme';
it('persists theme and returns dialog focus to its trigger', async () => {
  useTheme.setState({ theme: 'light' });
  function Demo() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <ThemeToggle />
        <button onClick={() => setOpen(true)}>Open dialog</button>
        {open && (
          <Modal title="Review" onClose={() => setOpen(false)}>
            <label>
              Answer
              <input />
            </label>
          </Modal>
        )}
      </>
    );
  }
  render(<Demo />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Dark theme' }));
  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem('study-theme')).toBe('dark');
  const trigger = screen.getByRole('button', { name: 'Open dialog' });
  await user.click(trigger);
  expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Dark theme' }));
  expect(document.documentElement).not.toHaveClass('dark');
});
