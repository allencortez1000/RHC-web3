'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react';

export type BrowserSession = { access_token: string; user: { id: string; email?: string } };
export type AuthAdapter = {
  session: () => Promise<BrowserSession | null>;
  subscribe: (callback: (session: BrowserSession | null) => void) => () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, mobile: string, redirect: string) => Promise<boolean>;
  recover: (email: string, redirect: string) => Promise<void>;
  resend: (email: string, redirect: string) => Promise<void>;
  reset: (password: string) => Promise<void>;
  confirm: (url: string) => Promise<void>;
  logout: () => Promise<void>;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type Account = {
  id: string;
  email: string;
  account_status?: string;
  verification_status?: string;
  auth_email_confirmed_at?: string | null;
};

export function isAuthEmailConfirmed(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

export function isRhcIdEligible(account?: Account | null): boolean {
  return (
    account?.account_status === 'ACTIVE' &&
    account.verification_status === 'VERIFIED' &&
    isAuthEmailConfirmed(account.auth_email_confirmed_at)
  );
}

type Runtime = {
  auth: AuthAdapter;
  apiUrl?: string;
  user: Account | null;
  dataRevision: number;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  logout: () => Promise<void>;
  navigate: (path: string) => void;
};
const RuntimeContext = createContext<Runtime | null>(null);
export function useRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error('The authentication provider is missing.');
  return value;
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

export function PortalProvider({
  auth,
  apiUrl,
  pathname,
  navigate,
  publicRoutes,
  children,
}: {
  auth: AuthAdapter;
  apiUrl?: string;
  pathname: string;
  navigate: (path: string) => void;
  publicRoutes: string[];
  children: ReactNode;
}) {
  const [session, setSession] = useState<BrowserSession | null>();
  const [user, setUser] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [dataRevision, setDataRevision] = useState(0);
  const isPublic = publicRoutes.includes(pathname);
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    let changed = false;
    const unsubscribe = auth.subscribe((next) => {
      changed = true;
      if (active) {
        setSession(next);
        setUser(null);
        setError('');
      }
    });
    auth
      .session()
      .then((next) => {
        if (active && !changed) setSession(next);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);
  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!apiUrl) throw new Error('The public API URL is not configured.');
      if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path.');
      const current = await auth.session();
      if (!current) {
        setSession(null);
        setUser(null);
        throw new ApiError(401, 'Your session has ended. Please sign in again.');
      }
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${current.access_token}`);
      if (init.body) headers.set('Content-Type', 'application/json');
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        headers,
        cache: 'no-store',
        credentials: 'omit',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          response.status === 403
            ? 'You do not have permission to access this resource.'
            : response.status === 401
              ? 'Your session or account is unavailable. Please sign in again.'
              : Array.isArray(body?.message)
                ? body.message.join(', ')
                : typeof body?.error?.message === 'string'
                  ? body.error.message
                  : typeof body?.message === 'string'
                    ? body.message
                    : `Request failed (${response.status}). Please try again.`;
        if (response.status === 401) {
          setUser(null);
          setError(message);
        }
        throw new ApiError(response.status, message);
      }
      if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase()))
        setDataRevision((n) => n + 1);
      return (body?.success === true && 'data' in body ? body.data : body) as T;
    },
    [apiUrl, auth],
  );
  useEffect(() => {
    const id = ++generation.current;
    if (isPublic || session === undefined) return;
    if (!session) {
      navigate('/login');
      return;
    }
    setError('');
    request<{ authenticated: boolean; user: Account }>('/auth/session')
      .then((result) => {
        if (id !== generation.current) return;
        if (!result.authenticated || !result.user?.id)
          throw new Error('Unable to verify your application account.');
        setUser(result.user);
      })
      .catch((cause) => {
        if (id === generation.current) setError(errorMessage(cause));
      });
    return () => {
      generation.current++;
    };
  }, [isPublic, session, request, navigate, retry]);
  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
    setSession(null);
    navigate('/login');
  }, [auth, navigate]);
  const value = { auth, apiUrl, user, request, logout, navigate, dataRevision };
  return (
    <RuntimeContext.Provider value={value}>
      {isPublic ? (
        children
      ) : error ? (
        <section className="mx-auto max-w-xl p-8">
          <h1 className="rhc-page-title">Account access</h1>
          <p role="alert" className="my-5">
            {error}
          </p>
          <button
            onClick={() => setRetry((n) => n + 1)}
            className="rhc-web3-btn-secondary rounded-lg p-3"
          >
            Retry
          </button>{' '}
          <SignOutButton />
        </section>
      ) : user && session ? (
        children
      ) : (
        <p role="status" className="p-8">
          Verifying your session…
        </p>
      )}
    </RuntimeContext.Provider>
  );
}

export function SignOutButton({
  className = 'rhc-sign-out rounded-lg border px-3 py-2.5 text-sm font-bold',
}: {
  className?: string;
}) {
  const { logout } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await logout();
          } catch (cause) {
            setError(errorMessage(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function useResource<T>(path: string) {
  const { request, dataRevision } = useRuntime();
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({
    loading: true,
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    request<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setState({ error: errorMessage(cause), loading: false });
      });
    return () => controller.abort();
  }, [path, request, revision, dataRevision]);
  return { ...state, reload: () => setRevision((n) => n + 1) };
}
export function usePagedResource<T extends { id: string }>(path: string, paginated = true) {
  const { request } = useRuntime();
  const [data, setData] = useState<T[]>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    const url = paginated
      ? `${path}${path.includes('?') ? '&' : '?'}take=100&skip=${offset}`
      : path;
    request<T[]>(url, { signal: controller.signal })
      .then((rows) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(rows)) throw new Error('The API returned an invalid record list.');
        setData((previous) =>
          offset === 0
            ? rows
            : Array.from(
                new Map([...(previous || []), ...rows].map((row) => [row.id, row])).values(),
              ),
        );
        setHasMore(paginated && rows.length === 100 && offset < 100000);
        setLoading(false);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(cause));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [path, paginated, request, offset, revision]);
  return {
    data,
    error,
    loading,
    hasMore,
    loadMore: () => setOffset((n) => n + 100),
    reload: () => setRevision((n) => n + 1),
    refresh: () => {
      setOffset(0);
      setData(undefined);
      setRevision((n) => n + 1);
    },
  };
}

export function ResourceStatus({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error?: string;
  reload: () => void;
}) {
  if (loading)
    return (
      <p role="status" className="p-4">
        Loading records…
      </p>
    );
  if (error)
    return (
      <div className="p-4">
        <p role="alert">{error}</p>
        <button className="rhc-web3-btn-secondary mt-3 rounded-lg p-2" onClick={reload}>
          Retry
        </button>
      </div>
    );
  return null;
}

export type AuthMode =
  'login' | 'register' | 'forgot-password' | 'reset-password' | 'verification' | 'confirm';
export function AuthForm({ mode }: { mode: AuthMode }) {
  const { auth, apiUrl, request, navigate } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(mode !== 'confirm' && mode !== 'reset-password');
  const started = useRef(false);
  useEffect(() => {
    if (started.current || (mode !== 'confirm' && mode !== 'reset-password')) return;
    started.current = true;
    auth
      .confirm(window.location.href)
      .then(async () => {
        window.history.replaceState(null, '', window.location.pathname);
        if (!(await auth.session()))
          throw new Error('This link is invalid or expired. Request a new email link.');
        if (mode === 'confirm') {
          await request('/auth/session');
          setMessage(
            'Email confirmed. You can now continue to your account. Email confirmation does not approve business verification; new accounts require RHC review before ID issuance.',
          );
        }
        setReady(true);
      })
      .catch((cause) => {
        window.history.replaceState(null, '', window.location.pathname);
        setReady(false);
        setError(errorMessage(cause));
      });
  }, [auth, mode, request]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        await auth.login(email, password);
        await request('/auth/session');
        navigate('/dashboard');
      }
      if (mode === 'register') {
        if (password !== form.get('confirm_password')) throw new Error('Passwords do not match.');
        if (!form.get('privacy_terms_acceptance'))
          throw new Error('Privacy and terms acceptance is required.');
        if (!apiUrl) throw new Error('The public API URL is not configured.');
        // This precheck is UX only; Supabase must independently enforce signup policy.
        const response = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/config`, {
          cache: 'no-store',
          credentials: 'omit',
          signal: AbortSignal.timeout(10000),
        });
        const config = await response.json().catch(() => null);
        if (!response.ok || config?.success !== true || typeof config.data?.registration_enabled !== 'boolean')
          throw new Error('Registration availability could not be checked. Please try again.');
        if (!config.data.registration_enabled)
          throw new Error('Registration is currently disabled. Please try again later.');
        const signedIn = await auth.register(
          email,
          password,
          String(form.get('mobile_number')),
          `${window.location.origin}/auth/confirm`,
        );
        if (signedIn) {
          await request('/auth/session');
          navigate('/dashboard');
        } else
          setMessage(
            'Check your email for a confirmation link before signing in. Business verification remains PENDING until RHC reviews and approves your account.',
          );
      }
      if (mode === 'forgot-password') {
        await auth.recover(email, `${window.location.origin}/reset-password`);
        setMessage('If an account exists for this email, a password recovery link has been sent.');
      }
      if (mode === 'verification') {
        await auth.resend(email, `${window.location.origin}/auth/confirm`);
        setMessage('If confirmation is required, a new link has been sent. Check your email.');
      }
      if (mode === 'reset-password') {
        if (password !== form.get('confirm_password')) throw new Error('Passwords do not match.');
        await auth.reset(password);
        await auth.logout();
        setReady(false);
        setMessage('Password updated. Sign in with your new password.');
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  const input =
    'mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--rhc-primary)]';
  const passwordMode = ['login', 'register', 'reset-password'].includes(mode);
  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {!['confirm', 'reset-password'].includes(mode) && (
        <label className="block text-sm font-semibold">
          Email address
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
      )}
      {mode === 'register' && (
        <label className="block text-sm font-semibold">
          Mobile number
          <input
            name="mobile_number"
            type="tel"
            required
            minLength={7}
            maxLength={32}
            autoComplete="tel"
            className={input}
          />
        </label>
      )}
      {passwordMode && (
        <label className="block text-sm font-semibold">
          {mode === 'reset-password' ? 'New password' : 'Password'}
          <input
            name="password"
            type="password"
            required
            minLength={mode === 'login' ? 1 : 12}
            maxLength={128}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={input}
          />
        </label>
      )}
      {['register', 'reset-password'].includes(mode) && (
        <label className="block text-sm font-semibold">
          Confirm password
          <input
            name="confirm_password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            className={input}
          />
        </label>
      )}
      {mode === 'register' && (
        <label className="flex items-center gap-2 text-sm">
          <input name="privacy_terms_acceptance" type="checkbox" required />I accept the privacy
          policy and terms of use
        </label>
      )}
      {mode === 'login' && (
        <div className="flex justify-between text-sm">
          <span>Session stays signed in on this browser</span>
          <a href="/forgot-password" className="font-semibold text-[var(--rhc-primary)]">
            Forgot password?
          </a>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg border p-4">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg border p-4">
          {message}
        </p>
      )}
      {mode === 'confirm' ? (
        ready &&
        !error && (
          <a href="/dashboard" className="rhc-web3-btn-primary inline-block rounded-lg p-3">
            Continue to account
          </a>
        )
      ) : (
        <button
          disabled={busy || !ready}
          type="submit"
          className="rhc-web3-btn-primary w-full rounded-2xl px-6 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? 'Please wait…'
            : {
                login: 'Sign in',
                register: 'Create account',
                'forgot-password': 'Send recovery link',
                'reset-password': 'Update password',
                verification: 'Resend confirmation',
              }[mode]}
        </button>
      )}
      {mode !== 'login' && (
        <a href="/login" className="inline-block text-sm font-semibold">
          Back to Sign In
        </a>
      )}
      {error && ['confirm', 'reset-password'].includes(mode) && (
        <a
          className="block text-sm"
          href={mode === 'confirm' ? '/verification' : '/forgot-password'}
        >
          Request a new link
        </a>
      )}
    </form>
  );
}
