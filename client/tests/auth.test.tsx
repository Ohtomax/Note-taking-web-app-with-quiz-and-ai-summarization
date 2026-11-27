import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from '@/features/auth/AuthPage';
import * as service from '@/features/auth/auth.service';
import * as sdk from 'firebase/auth';

vi.mock('@/config/firebase', () => ({ firebaseAuth: {} }));
vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'local',
  setPersistence: vi.fn().mockResolvedValue(undefined),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({}),
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  verifyPasswordResetCode: vi.fn().mockResolvedValue('test@example.test'),
  confirmPasswordReset: vi.fn().mockResolvedValue(undefined),
}));
beforeEach(() => vi.clearAllMocks());

describe('authentication screens', () => {
  it('registers with persistent Firebase auth and supports sign-out', async () => {
    render(
      <MemoryRouter initialEntries={['/auth?mode=register']}>
        <AuthPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'test@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(sdk.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'test@example.test',
        'password123',
      ),
    );
    expect(sdk.setPersistence).toHaveBeenCalledWith({}, 'local');
    await service.logOut();
    expect(sdk.signOut).toHaveBeenCalled();
  });
  it('shows a neutral recovery result and handles expired reset links', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/auth?mode=recover']}>
        <AuthPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'test@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('If this account exists');
    view.unmount();
    vi.mocked(sdk.verifyPasswordResetCode).mockRejectedValueOnce({
      code: 'auth/expired-action-code',
    });
    render(
      <MemoryRouter initialEntries={['/auth?mode=resetPassword&oobCode=expired']}>
        <AuthPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or expired');
    expect(sdk.confirmPasswordReset).not.toHaveBeenCalled();
  });
  it('signs in and confirms valid reset codes before updating a password', async () => {
    await service.signIn('test@example.test', 'password123');
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalled();
    await service.resetPassword('valid-code', 'new-password');
    expect(sdk.verifyPasswordResetCode).toHaveBeenCalledWith({}, 'valid-code');
    expect(sdk.confirmPasswordReset).toHaveBeenCalledWith(
      {},
      'valid-code',
      'new-password',
    );
  });
});
