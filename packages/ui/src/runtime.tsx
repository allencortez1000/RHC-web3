'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react';
import {
  assertRequestAvailable,
  FeatureUnavailableError,
  getRequestAvailability,
  type FeatureUnavailable,
} from './api-capabilities';
import { RequestScope } from './request-scope';
import { ApiError, apiRequestUrl, fetchApiResponse } from './api-transport';
export { ApiError, publicApiRequest } from './api-transport';
export * from './api-capabilities';

export type BrowserSession = { access_token: string; user: { id: string; email?: string } };
export type DemoPersonaOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  application: 'customer' | 'admin';
  description: string;
  readOnly?: boolean;
};
export type DemoCredentialResult = { account: Account; target: 'customer' | 'admin' };
export type AuthAdapter = {
  mode: 'api' | 'demo';
  session: () => Promise<BrowserSession | null>;
  subscribe: (callback: (session: BrowserSession | null) => void) => () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, mobile: string, redirect: string) => Promise<boolean>;
  recover: (email: string, redirect: string) => Promise<void>;
  resend: (email: string, redirect: string) => Promise<void>;
  reset: (password: string) => Promise<void>;
  confirm: (url: string) => Promise<void>;
  logout: () => Promise<void>;
  demo?: {
    application: 'customer' | 'admin';
    hubUrl: string;
    personas: DemoPersonaOption[];
    selectPersona: (personaId: string) => Promise<DemoCredentialResult>;
    signInWithCredentials?: (email: string, password: string) => Promise<DemoCredentialResult>;
  };
};
export type Account = {
  id: string;
  email: string;
  account_status?: string;
  verification_status?: string;
  auth_email_confirmed_at?: string | null;
  role?: string;
  roles?: string[];
  is_admin?: boolean;
  permissions?: string[];
  company_ids?: string[];
  project_ids?: string[];
};

export function isAdminAccount(account?: Account | null) {
  return Boolean(
    account?.is_admin ||
      account?.roles?.some((role) => role !== 'CUSTOMER') ||
      (account?.role && account.role !== 'CUSTOMER'),
  );
}

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
  dataMode: 'api' | 'demo';
  demoRevision?: number;
  user: Account | null;
  hasSession: boolean;
  dataRevision: number;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  publicRequest: <T>(path: string, init?: RequestInit) => Promise<T>;
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

export function createDemoAuthAdapter({
  application,
  hubUrl,
  personas,
}: {
  application: 'customer' | 'admin';
  hubUrl: string;
  personas: DemoPersonaOption[];
}): AuthAdapter {
  const cookieName = application === 'customer' ? 'rhc_customer_demo_session' : 'rhc_admin_demo_session';
  const subscribers = new Set<(session: BrowserSession | null) => void>();

  function readCookie(name: string) {
    if (typeof document === 'undefined') return null;
    return document.cookie
      .split('; ')
      .find((part) => part.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=') || null;
  }
  function readSession(): BrowserSession | null {
    const encoded = readCookie(cookieName);
    if (!encoded) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(encoded)) as BrowserSession;
      return typeof parsed?.access_token === 'string' && /^rhc_demo_[a-f0-9]{32}$/.test(parsed.access_token) && typeof parsed?.user?.id === 'string' && parsed.user.id ? parsed : null;
    } catch {
      return null;
    }
  }
  function storeSession(target: 'customer' | 'admin', session: BrowserSession | null) {
    if (!['customer', 'admin'].includes(target) || (session && (!/^rhc_demo_[a-f0-9]{32}$/.test(session.access_token) || !session.user?.id))) {
      throw new ApiError(502, 'The local demo hub returned an invalid session.', 'INVALID_RESPONSE');
    }
    if (typeof document === 'undefined') return;
    const targetCookie = target === 'customer' ? 'rhc_customer_demo_session' : 'rhc_admin_demo_session';
    document.cookie = session
      ? `${targetCookie}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=43200; SameSite=Strict`
      : `${targetCookie}=; path=/; max-age=0; SameSite=Strict`;
    document.cookie = 'rhc_demo_email=; path=/; max-age=0; SameSite=Lax';
    if (target === application) {
      const next = readSession();
      subscribers.forEach((callback) => callback(next));
    }
  }
  async function hub<T>(path: string, init: RequestInit = {}) {
    const pending = new RequestScope().open(init.signal);
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    try {
      return (await fetchApiResponse<T>(apiRequestUrl(hubUrl, path), { ...init, headers }, pending)).data;
    } finally {
      pending.close();
    }
  }
  const unavailable = async () => {
    throw new Error('This provider action is unavailable in the isolated local demo profile.');
  };
  const adapter: AuthAdapter = {
    mode: 'demo',
    async session() {
      return readSession();
    },
    subscribe(callback) {
      subscribers.add(callback);
      queueMicrotask(() => { if (subscribers.has(callback)) callback(readSession()); });
      return () => subscribers.delete(callback);
    },
    async login() {
      throw new Error('Choose a named demo persona instead of entering credentials.');
    },
    register: unavailable,
    recover: unavailable,
    resend: unavailable,
    reset: unavailable,
    confirm: unavailable,
    async logout() {
      const current = readSession();
      storeSession(application, null);
      if (!current) return;
      await hub('/session', {
        method: 'DELETE',
        headers: { Authorization: `Demo ${current.access_token}` },
      });
    },
    demo: {
      application,
      hubUrl,
      personas,
      async selectPersona(personaId) {
        const result = await hub<{
          session: BrowserSession;
          account: Account;
          target: 'customer' | 'admin';
        }>('/session', {
          method: 'POST',
          body: JSON.stringify({ persona_id: personaId }),
        });
        storeSession(result.target, result.session);
        return { account: result.account, target: result.target };
      },
      async signInWithCredentials(email, password) {
        const result = await hub<{
          session: BrowserSession;
          account: Account;
          target: 'customer' | 'admin';
        }>('/session/credentials', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        storeSession(result.target, result.session);
        return { account: result.account, target: result.target };
      },
    },
  };
  return adapter;
}

function adminUrl(path = '/') {
  if (typeof window === 'undefined') return path;
  const configured = process.env.NEXT_PUBLIC_ADMIN_WEB_URL;
  if (configured) return `${configured.replace(/\/$/, '')}${path}`;
  return `${window.location.protocol}//${window.location.hostname}:3003${path}`;
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
  /** Legacy presentation hint only; server capabilities authorize admin access. */
  requireAdmin?: boolean;
  children: ReactNode;
}) {
  const [session, setSession] = useState<BrowserSession | null>();
  const [user, setUser] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [dataRevision, setDataRevision] = useState(0);
  const [demoRevision, setDemoRevision] = useState<number>();
  const isPublic = publicRoutes.some((route) => route.endsWith('/*') ? pathname.startsWith(route.slice(0, -1)) : route === pathname);
  const generation = useRef(0);
  const requestScope = useMemo(() => new RequestScope(), [auth, apiUrl]);
  const sessionSnapshot = useRef<BrowserSession | null | undefined>(undefined);
  const signingOut = useRef(false);
  const acceptSession = useCallback((next: BrowserSession | null) => {
    const previous = sessionSnapshot.current;
    // Supabase can emit the same session on refocus. Do not tear down resources.
    if (previous !== undefined && previous?.access_token === next?.access_token && previous?.user.id === next?.user.id) return;
    sessionSnapshot.current = next;
    requestScope.invalidate();
    generation.current++;
    setSession(next);
    setUser(null);
    setError('');
    setDemoRevision(undefined);
    setDataRevision((n) => n + 1);
  }, [requestScope]);
  useEffect(() => {
    let active = true;
    let changed = false;
    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = auth.subscribe((next) => {
        changed = true;
        if (active) acceptSession(next);
      });
    } catch (cause) {
      acceptSession(null);
      setError(errorMessage(cause));
    }
    const initial = requestScope.open();
    initial.wait(auth.session())
      .then((next) => {
        if (active && !changed) acceptSession(next);
      })
      .catch((cause) => {
        if (active && !changed) {
          acceptSession(null);
          setError(errorMessage(cause));
        }
      })
      .finally(() => initial.close());
    return () => {
      active = false;
      unsubscribe();
      requestScope.invalidate();
      sessionSnapshot.current = undefined;
    };
  }, [auth, acceptSession, requestScope]);
  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      assertRequestAvailable(auth.mode, path, init.method);
      const demo = auth.mode === 'demo';
      const baseUrl = demo ? auth.demo?.hubUrl : apiUrl;
      if (!baseUrl) throw new Error(demo ? 'The local demo fixture hub is not configured.' : 'The public API URL is not configured.');
      const url = apiRequestUrl(baseUrl, path);
      if (signingOut.current) throw new DOMException('Signing out.', 'AbortError');
      const pending = requestScope.open(init.signal);
      try {
        pending.assertCurrent();
        const current = await pending.wait(auth.session());
        pending.assertCurrent();
        if (!current) {
          throw new ApiError(401, 'Your session has ended. Please sign in again.', 'SESSION_REQUIRED');
        }
        // A misplaced demo cookie/token must never be sent as real Bearer authentication.
        const demoToken = /^(?:rhc_demo_|rhc-demo-token)/.test(current.access_token);
        if ((demo && !/^rhc_demo_[a-f0-9]{32}$/.test(current.access_token)) || (!demo && demoToken)) {
          throw new ApiError(401, 'The session does not belong to this data profile. Please sign in again.', 'SESSION_PROFILE_MISMATCH');
        }
        const headers = new Headers(init.headers);
        headers.set('Authorization', (demo ? 'Demo ' : 'Bearer ') + current.access_token);
        if (init.body) headers.set('Content-Type', 'application/json');
        const result = await fetchApiResponse<T>(url, { ...init, headers }, pending);
        // Session invalidation can occur after the helper resolves but before this continuation.
        pending.assertCurrent();
        if (demo && typeof result.meta?.revision === 'number' && Number.isSafeInteger(result.meta.revision)) setDemoRevision(result.meta.revision);
        if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) setDataRevision((n) => n + 1);
        return result.data;
      } catch (cause) {
        pending.assertCurrent();
        if (cause instanceof ApiError && cause.status === 401) {
          acceptSession(null);
          setError(cause.message);
        }
        throw cause;
      } finally {
        pending.close();
      }
    },
    [apiUrl, auth, acceptSession, requestScope],
  );
  const publicRequest = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      assertRequestAvailable(auth.mode, path, init.method);
      const url = apiRequestUrl(auth.mode === 'demo' ? auth.demo?.hubUrl : apiUrl, path);
      const pending = requestScope.open(init.signal);
      const headers = new Headers(init.headers);
      headers.delete('Authorization');
      if (init.body) headers.set('Content-Type', 'application/json');
      try {
        const result = await fetchApiResponse<T>(url, { ...init, headers }, pending);
        pending.assertCurrent();
        return result.data;
      } catch (cause) {
        pending.assertCurrent();
        throw cause;
      } finally {
        pending.close();
      }
    },
    [apiUrl, auth, requestScope],
  );
  useEffect(() => {
    const id = ++generation.current;
    if (isPublic || session === undefined) return;
    if (!session) {
      navigate('/login');
      return;
    }
    setError('');
    const controller = new AbortController();
    request<{ authenticated: boolean; user: Account }>('/auth/session', { signal: controller.signal })
      .then((result) => {
        if (id !== generation.current) return;
        if (!result.authenticated || !result.user?.id)
          throw new Error('Unable to verify your application account.');
        setUser(result.user);
      })
      .catch((cause) => {
        if (id === generation.current && !controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [isPublic, session, request, navigate, retry]);
  const logout = useCallback(async () => {
    signingOut.current = true;
    requestScope.invalidate();
    generation.current++;
    acceptSession(null);
    const pending = new RequestScope().open();
    try {
      await pending.wait(auth.logout());
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    } finally {
      pending.close();
      acceptSession(null);
      signingOut.current = false;
      navigate('/login');
    }
  }, [auth, navigate, acceptSession, requestScope]);
  const value = {
    auth,
    apiUrl,
    dataMode: auth.mode,
    demoRevision,
    user,
    hasSession: Boolean(session),
    request,
    publicRequest,
    logout,
    navigate,
    dataRevision,
  };
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
      {auth.mode === 'demo' ? <DemoEnvironmentControls active={Boolean(user && session)} /> : null}
    </RuntimeContext.Provider>
  );
}

type DemoControls = {
  scenario: 'baseline' | 'empty' | 'exceptions';
  latency_ms: number;
  fail_next_request: boolean;
  empty_state: boolean;
  clock: string;
};

function DemoEnvironmentControls({ active }: { active: boolean }) {
  const { request, user, logout, demoRevision } = useRuntime();
  const [open, setOpen] = useState(false);
  const [controls, setControls] = useState<DemoControls>();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!active) return;
    try {
      setControls(await request<DemoControls>('/control'));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [active, request]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function update(body: Partial<DemoControls>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const next = await request<DemoControls>('/control', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setControls(next);
      setMessage(success);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (confirmation !== 'RESET RHC DEMO') return;
    setBusy(true);
    setError('');
    try {
      await request('/reset', {
        method: 'POST',
        body: JSON.stringify({ confirmation }),
      });
      setMessage('Deterministic baseline restored. Choose a persona again.');
      setConfirmation('');
      await logout().catch(() => undefined);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rhc-demo-controls fixed bottom-3 left-14 z-[90] max-w-[calc(100vw-4.25rem)]">
      {open ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="rhc-demo-controls-title"
          className="mb-2 w-[min(420px,calc(100vw-1.5rem))] rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="rhc-eyebrow">Local fixture controls</p>
              <h2 id="rhc-demo-controls-title" className="text-lg font-bold text-[var(--rhc-heading)]">Demo environment</h2>
              <p className="mt-1 text-xs text-[var(--rhc-muted)]">Synthetic data · revision {demoRevision ?? '—'}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--rhc-border)]" aria-label="Close demo controls">×</button>
          </div>
          {active && controls ? (
            <div className="mt-4 grid gap-4">
              <div className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-3 text-sm">
                <p className="font-bold text-[var(--rhc-heading)]">{user?.email}</p>
                <p className="text-[var(--rhc-muted)]">{user?.role || 'Demo persona'} · session isolated by application</p>
              </div>
              <label className="text-sm font-semibold">
                Scenario
                <select className="mt-1 w-full rounded-xl border p-3" value={controls.scenario} disabled={busy} onChange={(event) => void update({ scenario: event.target.value as DemoControls['scenario'] }, 'Scenario updated.') }>
                  <option value="baseline">Baseline</option>
                  <option value="empty">Empty-state review</option>
                  <option value="exceptions">Exception review</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Deterministic latency
                <select className="mt-1 w-full rounded-xl border p-3" value={controls.latency_ms} disabled={busy} onChange={(event) => void update({ latency_ms: Number(event.target.value) }, 'Latency updated.') }>
                  <option value={0}>None</option>
                  <option value={250}>250 ms</option>
                  <option value={750}>750 ms</option>
                  <option value={1500}>1.5 seconds</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Demo clock (local display input)
                <input
                  type="datetime-local"
                  value={controls.clock.slice(0, 16)}
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.value) void update({ clock: new Date(event.target.value).toISOString() }, 'Demo clock updated.');
                  }}
                  className="mt-1 w-full rounded-xl border p-3"
                />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                <input type="checkbox" checked={controls.empty_state} disabled={busy} onChange={(event) => void update({ empty_state: event.target.checked }, event.target.checked ? 'Empty-state mode enabled.' : 'Populated records restored.') } />
                Show empty collection states
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void update({ fail_next_request: true }, 'The next data request will fail once, then recover.')} className="rhc-web3-btn-secondary min-h-11 rounded-xl px-3 py-2 text-sm font-bold">Fail next request</button>
                <button type="button" disabled={busy} onClick={() => void load()} className="rhc-web3-btn-secondary min-h-11 rounded-xl px-3 py-2 text-sm font-bold">Refresh controls</button>
              </div>
              <div className="border-t border-[var(--rhc-border)] pt-4">
                <label className="text-sm font-semibold">
                  Reset confirmation
                  <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="RESET RHC DEMO" className="mt-1 w-full rounded-xl border p-3" />
                </label>
                <button type="button" disabled={busy || confirmation !== 'RESET RHC DEMO'} onClick={() => void reset()} className="mt-2 min-h-11 rounded-xl border border-[var(--rhc-danger)] px-3 py-2 text-sm font-bold text-[var(--rhc-danger)] disabled:opacity-50">Restore deterministic baseline</button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--rhc-muted)]">Choose a named persona on the sign-in page to access scenario, latency, failure, empty-state, clock, and reset controls.</p>
          )}
          {message ? <p role="status" className="mt-3 text-sm text-[var(--rhc-success)]">{message}</p> : null}
          {error ? <p role="alert" className="mt-3 text-sm text-[var(--rhc-danger)]">{error}</p> : null}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,175,55,.45)] bg-[var(--rhc-surface)] px-3 py-2 text-xs font-bold text-[var(--rhc-heading)] shadow-lg"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--rhc-warning)]" aria-hidden="true" />
        Demo environment — synthetic data
      </button>
    </div>
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

export type ResourceState<T> = {
  data?: T;
  error?: string;
  status?: number;
  code?: string;
  requestId?: string;
  unavailable?: FeatureUnavailable;
  loading: boolean;
};

function resourceFailure(cause: unknown) {
  return {
    error: errorMessage(cause),
    status: cause instanceof ApiError ? cause.status : undefined,
    code: cause instanceof ApiError || cause instanceof FeatureUnavailableError ? cause.code : undefined,
    requestId: cause instanceof ApiError ? cause.requestId : undefined,
    unavailable: cause instanceof FeatureUnavailableError ? cause.unavailable : undefined,
    loading: false,
  };
}

export function useResource<T>(path: string) {
  const { request, dataRevision, dataMode } = useRuntime();
  const [revision, setRevision] = useState(0);
  const key = useMemo(() => ({ path, request, dataRevision, revision }), [path, request, dataRevision, revision]);
  const availability = useMemo(() => getRequestAvailability(dataMode, path), [dataMode, path]);
  const [state, setState] = useState<ResourceState<T> & { key?: object }>({ loading: true });
  useEffect(() => {
    if (!availability.available) return;
    const controller = new AbortController();
    setState({ key, loading: true });
    request<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, loading: false });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setState({ key, ...resourceFailure(cause) });
      });
    return () => controller.abort();
  }, [key, availability, path, request]);
  // Hide old data on the render that changes scope, not one effect later.
  const current: ResourceState<T> = !availability.available
    ? { unavailable: availability, code: availability.code, error: availability.message, loading: false }
    : state.key === key ? state : { loading: true };
  return {
    data: current.data,
    error: current.error,
    status: current.status,
    code: current.code,
    requestId: current.requestId,
    unavailable: current.unavailable,
    loading: current.loading,
    reload: () => setRevision((n) => n + 1),
  };
}

export function usePagedResource<T extends { id: string }>(path: string, paginated = true) {
  const { request, dataRevision, dataMode } = useRuntime();
  const [revision, setRevision] = useState(0);
  const key = useMemo(() => ({ path, paginated, request, dataRevision, revision }), [path, paginated, request, dataRevision, revision]);
  const availability = useMemo(() => getRequestAvailability(dataMode, path), [dataMode, path]);
  const [page, setPage] = useState<{ key: object; offset: number }>();
  const offset = page?.key === key ? page.offset : 0;
  const [state, setState] = useState<ResourceState<T[]> & { key?: object; hasMore: boolean; offset?: number }>({ loading: true, hasMore: false });
  useEffect(() => {
    if (!availability.available) return;
    const controller = new AbortController();
    setState((previous) => ({ key, offset, data: previous.key === key ? previous.data : undefined, loading: true, hasMore: false }));
    const url = paginated
      ? `${path}${path.includes('?') ? '&' : '?'}take=100&skip=${offset}`
      : path;
    request<T[]>(url, { signal: controller.signal })
      .then((rows) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(rows)) throw new Error('The API returned an invalid record list.');
        setState((previous) => ({
          key,
          offset,
          data: offset === 0 || previous.key !== key
            ? rows
            : Array.from(new Map([...(previous.data || []), ...rows].map((row) => [row.id, row])).values()),
          hasMore: paginated && rows.length === 100 && offset < 100000,
          loading: false,
        }));
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setState({ key, offset, ...resourceFailure(cause), hasMore: false });
      });
    return () => controller.abort();
  }, [key, availability, path, paginated, request, offset]);
  const current: ResourceState<T[]> & { hasMore: boolean } = !availability.available
    ? { unavailable: availability, code: availability.code, error: availability.message, loading: false, hasMore: false }
    : state.key === key ? { ...state, loading: state.loading || state.offset !== offset } : { loading: true, hasMore: false };
  const refresh = () => setRevision((n) => n + 1);
  return {
    data: current.data,
    error: current.error,
    status: current.status,
    code: current.code,
    requestId: current.requestId,
    unavailable: current.unavailable,
    loading: current.loading,
    hasMore: current.hasMore,
    loadMore: () => {
      if (current.hasMore && !current.loading) setPage({ key, offset: offset + 100 });
    },
    reload: refresh,
    refresh,
  };
}

export function UnavailableFeature({ unavailable, title }: { unavailable: FeatureUnavailable; title?: string }) {
  return (
    <section role="status" className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-5" data-capability={unavailable.capability}>
      <h2 className="font-bold text-[var(--rhc-heading)]">{title || unavailable.feature} — unavailable in API mode</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">{unavailable.message}</p>
    </section>
  );
}

export function ResourceStatus({
  loading,
  error,
  unavailable,
  reload,
}: {
  loading: boolean;
  error?: string;
  unavailable?: FeatureUnavailable;
  reload: () => void;
}) {
  if (unavailable) return <UnavailableFeature unavailable={unavailable} />;
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

function DemoPersonaForm({ auth, navigate }: { auth: AuthAdapter; navigate: (path: string) => void }) {
  const personas = auth.demo?.personas || [];
  const [selected, setSelected] = useState(personas[0]?.id || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setHydrated(true), []);
  const customerPersonas = personas.filter((persona) => persona.application === 'customer');
  const staffPersonas = personas.filter((persona) => persona.application === 'admin');

  function openResult(result: DemoCredentialResult) {
    if (result.target === 'admin') window.location.assign(adminUrl('/'));
    else navigate('/dashboard');
  }

  async function enterDemo() {
    if (!selected || !auth.demo || busy) return;
    setBusy(true);
    setError('');
    try {
      openResult(await auth.demo.selectPersona(selected));
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  async function enterWithCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.demo?.signInWithCredentials || busy) return;
    setBusy(true);
    setError('');
    try {
      openResult(await auth.demo.signInWithCredentials(email, password));
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  const group = (title: string, items: DemoPersonaOption[]) => items.length ? (
    <fieldset className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-3">
      <legend className="px-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--rhc-primary)]">{title}</legend>
      <div className="grid gap-2">
        {items.map((persona) => (
          <label key={persona.id} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selected === persona.id ? 'border-[var(--rhc-primary)] bg-[var(--rhc-accent-soft)]' : 'border-[var(--rhc-border)] bg-[var(--rhc-surface)]'}`}>
            <input type="radio" name="demo_persona" value={persona.id} checked={selected === persona.id} disabled={!hydrated || busy} onChange={() => setSelected(persona.id)} className="mt-1" />
            <span className="min-w-0">
              <span className="block font-bold text-[var(--rhc-heading)]">{persona.name}</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--rhc-primary)]">{persona.role.replaceAll('_', ' ')}{persona.readOnly ? ' · Read only' : ''}</span>
              <span className="mt-1 block text-sm leading-5 text-[var(--rhc-muted)]">{persona.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  ) : null;

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-xl border border-[rgba(212,175,55,.35)] bg-[var(--rhc-accent-soft)] p-4 text-sm leading-6">
        <p className="font-bold text-[var(--rhc-heading)]">Local presentation profile</p>
        <p className="text-[var(--rhc-secondary-text)]">Choose a named synthetic persona or use the local demo credential shortcut. No Supabase session, production credential, or real provider is used.</p>
      </div>
      {auth.demo?.signInWithCredentials ? (
        <form onSubmit={(event) => void enterWithCredentials(event)} className="space-y-3 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rhc-primary)]">Demo credential shortcut</p>
            <p className="mt-1 text-xs leading-5 text-[var(--rhc-muted)]">For local demo only. These are not Supabase or production credentials. Customer: demo@rhc.local · Admin: superadmin@example.com</p>
          </div>
          <label className="block text-sm font-semibold text-[var(--rhc-heading)]">
            Email
            <input type="email" autoComplete="username" required value={email} disabled={!hydrated || busy} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="demo@rhc.local" className="mt-1 min-h-11 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] px-3 text-[var(--rhc-heading)]" />
          </label>
          <label className="block text-sm font-semibold text-[var(--rhc-heading)]">
            Password
            <input type="password" autoComplete="current-password" required value={password} disabled={!hydrated || busy} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Local demo password" className="mt-1 min-h-11 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] px-3 text-[var(--rhc-heading)]" />
          </label>
          <button type="submit" disabled={!hydrated || busy || !email || !password} className="rhc-web3-btn-primary min-h-11 w-full rounded-xl px-5 py-2 font-bold disabled:opacity-60">
            {busy ? 'Opening workspace…' : 'Sign in to demo'}
          </button>
        </form>
      ) : null}
      {group('Customer journeys', customerPersonas)}
      {group('Authorized staff journeys', staffPersonas)}
      {error ? <p role="alert" className="rounded-xl border border-[var(--rhc-danger)] p-3 text-sm">{error}</p> : null}
      <button type="button" data-demo-ready={hydrated ? 'true' : 'false'} disabled={!hydrated || busy || !selected} onClick={() => void enterDemo()} className="rhc-web3-btn-primary min-h-12 w-full rounded-xl px-5 py-3 font-bold disabled:opacity-60">
        {busy ? 'Opening workspace…' : 'Enter selected workspace'}
      </button>
      <p className="text-xs leading-5 text-[var(--rhc-muted)]">Personas demonstrate workflow and scope behavior only. The local fixture hub is not a production authorization system.</p>
    </div>
  );
}

export function AuthForm({
  mode,
  admin = false,
  verificationPath = admin ? '/verify-email' : '/verification',
  continuePath = admin ? '/' : '/dashboard',
}: {
  mode: AuthMode;
  admin?: boolean;
  verificationPath?: string;
  continuePath?: string;
}) {
  const { auth, request, publicRequest, navigate } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(mode !== 'confirm' && mode !== 'reset-password');
  const started = useRef(false);
  useEffect(() => {
    if (started.current || (mode !== 'confirm' && mode !== 'reset-password')) return;
    started.current = true;
    const callbackUrl = window.location.href;
    window.history.replaceState(null, '', window.location.pathname);
    auth
      .confirm(callbackUrl)
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
  if (mode === 'login' && auth.demo) return <DemoPersonaForm auth={auth} navigate={navigate} />;
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
        navigate(continuePath);
      }
      if (mode === 'register') {
        if (password !== form.get('confirm_password')) throw new Error('Passwords do not match.');
        if (!form.get('privacy_terms_acceptance'))
          throw new Error('Privacy and terms acceptance is required.');
        // This precheck is UX only; Supabase must independently enforce signup policy.
        const config = await publicRequest<{ registration_enabled: boolean }>('/auth/config');
        if (typeof config?.registration_enabled !== 'boolean')
          throw new Error('Registration availability could not be checked. Please try again.');
        if (!config.registration_enabled)
          throw new Error('Registration is currently disabled. Please try again later.');
        const signedIn = await auth.register(
          email,
          password,
          String(form.get('mobile_number')),
          `${window.location.origin}/auth/confirm`,
        );
        if (signedIn) {
          await request('/auth/session');
          navigate(continuePath);
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
          <a href={continuePath} className="rhc-web3-btn-primary inline-block rounded-lg p-3">
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
          href={mode === 'confirm' ? verificationPath : '/forgot-password'}
        >
          Request a new link
        </a>
      )}
    </form>
  );
}
