import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { firebaseAuth } from '@/config/firebase';
import * as authService from './auth.service';

function AuthForm({ mode, code }: { mode: string; code: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const resetting = mode === 'resetPassword';
  const recovering = mode === 'recover';
  const registering = mode === 'register';
  const title = resetting
    ? 'Choose a new password'
    : recovering
      ? 'Reset your password'
      : registering
        ? 'Create your account'
        : 'Sign in to Studyspace';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    try {
      if (resetting) {
        await authService.resetPassword(code, password);
        setMessage('Password updated. You can sign in now.');
      } else if (recovering) {
        await authService.recoverPassword(email);
        setMessage('If this account exists, a reset email will arrive shortly.');
      } else {
        if (registering) await authService.register(email, password);
        else await authService.signIn(email, password);
        void navigate('/', { replace: true });
      }
    } catch (cause) {
      setError(authService.authError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <Link to="/" className="font-semibold text-teal-800 dark:text-teal-300">
          Studyspace
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {!firebaseAuth && (
          <p role="status" className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Sign-in is waiting for your Firebase project configuration.
          </p>
        )}
        <form onSubmit={submit} className="mt-6 grid gap-4">
          {!resetting && (
            <label className="grid gap-1 text-sm">
              Email address
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 p-3"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
          )}
          {!recovering && (
            <label className="grid gap-1 text-sm">
              Password
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 p-3"
                name="password"
                type="password"
                minLength={registering || resetting ? 8 : 1}
                maxLength={128}
                autoComplete={
                  registering || resetting ? 'new-password' : 'current-password'
                }
                required
              />
            </label>
          )}
          {resetting && !code && (
            <p role="alert">This reset link is missing its verification code.</p>
          )}
          <button
            className="rounded-lg bg-teal-800 px-4 py-3 font-medium text-white disabled:opacity-50"
            disabled={busy || !firebaseAuth || (resetting && !code)}
          >
            {busy
              ? 'Please wait…'
              : resetting
                ? 'Update password'
                : recovering
                  ? 'Send reset link'
                  : registering
                    ? 'Create account'
                    : 'Sign in'}
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm text-teal-800 dark:text-teal-300">
              {message}
            </p>
          )}
        </form>
        <nav
          aria-label="Account access"
          className="mt-6 flex flex-wrap gap-4 text-sm text-teal-800 dark:text-teal-300"
        >
          <Link to="/auth">Sign in</Link>
          <Link to="/auth?mode=register">Create account</Link>
          <Link to="/auth?mode=recover">Forgot password?</Link>
        </nav>
      </section>
    </main>
  );
}

export default function AuthPage() {
  const [params] = useSearchParams();
  const mode = params.get('mode') ?? 'signin';
  return <AuthForm key={mode} mode={mode} code={params.get('oobCode') ?? ''} />;
}
