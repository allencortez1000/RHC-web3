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
  role?: string;
  roles?: string[];
  is_admin?: boolean;
  permissions?: string[];
};

const demoAccessToken = 'rhc-demo-token';
const adminDemoEmails = new Set(['superadmin@example.com', 'systemadmin@example.com', 'sales@example.com', 'finance@example.com', 'propertyadmin@example.com', 'compliance@example.com', 'auditor@example.com']);
const demoRoles: Record<string, string> = {
  'superadmin@example.com': 'SUPER_ADMINISTRATOR',
  'systemadmin@example.com': 'SYSTEM_ADMINISTRATOR',
  'sales@example.com': 'AMICA_SALES',
  'finance@example.com': 'AMICA_FINANCE',
  'propertyadmin@example.com': 'PROPERTY_ADMINISTRATOR',
  'compliance@example.com': 'COMPLIANCE_OFFICER',
  'auditor@example.com': 'INTERNAL_AUDITOR',
};
const demoAccount: Account = {
  id: 'mock-user-customer',
  email: 'demo@rhc.local',
  account_status: 'ACTIVE',
  verification_status: 'VERIFIED',
  auth_email_confirmed_at: '2026-01-01T00:00:00.000Z',
  role: 'CUSTOMER',
  roles: ['CUSTOMER'],
  is_admin: false,
};
function accountForDemoToken(token: string): Account {
  const email = decodeURIComponent(token.slice(`${demoAccessToken}:`.length));
  if (!email || email === token || email === 'demo@rhc.local') return demoAccount;
  const role = demoRoles[email] || 'CUSTOMER';
  return {
    id: `mock-${role.toLowerCase().replaceAll('_', '-')}`,
    email,
    account_status: 'ACTIVE',
    verification_status: 'VERIFIED',
    auth_email_confirmed_at: '2026-01-01T00:00:00.000Z',
    role,
    roles: [role],
    is_admin: adminDemoEmails.has(email),
  };
}
function isDemoToken(token: string) { return token === demoAccessToken || token.startsWith(`${demoAccessToken}:`); }
export function isAdminAccount(account?: Account | null) { return Boolean(account?.is_admin || account?.roles?.some((role) => role !== 'CUSTOMER') || (account?.role && account.role !== 'CUSTOMER')); }
const demoProfile = {
  first_name: 'Demo',
  last_name: 'Customer',
  rhc_id: 'RHC-DEMO-0001',
  mobile_number: '+639123456789',
  country: 'Philippines',
};
const demoInventory = [
  {
    id: 'demo-property-available-1',
    property_code: 'AMICA-R1-A-01-01',
    asset_type: 'RESIDENTIAL',
    status: 'AVAILABLE',
    tower: 'Building A',
    floor: '1',
    unit_number: '101',
    area: '32.50',
    list_price: '2450000.00',
    currency: 'PHP',
    metadata: { unit_type: '1 BEDROOM', demo_data: true },
    project: { id: 'demo-project-1', project_code: 'AMICA-R1', project_name: 'Amica Residences 1', company: { company_code: 'AMICA', display_name: 'Amica' } },
  },
  {
    id: 'demo-property-reserved-1',
    property_code: 'AMICA-R1-A-01-03',
    asset_type: 'RESIDENTIAL',
    status: 'RESERVED',
    tower: 'Building A',
    floor: '1',
    unit_number: '103',
    area: '48.00',
    list_price: '3650000.00',
    currency: 'PHP',
    metadata: { unit_type: '2 BEDROOM', demo_data: true },
    project: { id: 'demo-project-1', project_code: 'AMICA-R1', project_name: 'Amica Residences 1', company: { company_code: 'AMICA', display_name: 'Amica' } },
  },
  {
    id: 'demo-property-blocked-1',
    property_code: 'AMICA-R2-A-04-01',
    asset_type: 'RESIDENTIAL',
    status: 'BLOCKED',
    tower: 'Building A',
    floor: '4',
    unit_number: '401',
    area: '48.00',
    list_price: '3780000.00',
    currency: 'PHP',
    metadata: { unit_type: '2 BEDROOM', demo_data: true },
    project: { id: 'demo-project-2', project_code: 'AMICA-R2', project_name: 'Amica Residences 2', company: { company_code: 'AMICA', display_name: 'Amica' } },
  },
];
const demoPropertyLinks = [
  {
    id: 'demo-property-link-1',
    relationship_type: 'Authorized viewer',
    status: 'ACTIVE',
    property: {
      ...demoInventory[1],
    },
  },
];

function demoResponse(path: string, token = demoAccessToken): unknown {
  const route = path.split('?')[0];
  const account = accountForDemoToken(token);
  if (route === '/auth/session') return { authenticated: true, user: account };
  if (route === '/me') return { user: account, profile: demoProfile };
  if (route === '/me/rhc-id') return { rhc_id: demoProfile.rhc_id };
  if (route === '/me/properties') return demoPropertyLinks;
  if (route === '/me/reservations') {
    return [
      {
        id: 'demo-reservation-1',
        reservation_number: 'RSV-DEMO-0001',
        status: 'PENDING',
        expires_at: '2026-01-04T08:00:00.000Z',
        created_at: '2026-01-01T08:00:00.000Z',
        property: demoPropertyLinks[0].property,
        events: [],
      },
    ];
  }
  if (route === '/me/notifications') {
    return [
      {
        id: 'demo-notification-1',
        subject: 'Welcome to RHC Digital',
        body: 'Sample records for testing and presentation. No real customer transaction is processed.',
        channel: 'IN_APP',
        status: 'Unread',
        created_at: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 'demo-notification-2',
        subject: 'Demo payment record posted',
        body: 'A fictional payment record was posted to your demo account.',
        channel: 'IN_APP',
        status: 'Unread',
        created_at: '2026-01-02T08:00:00.000Z',
      },
    ];
  }
  if (route === '/me/demo-records') {
    return {
      payments: [
        { id: 'pay-1', reference: 'DEMO-PAY-0001', property_code: 'DEMO-AMICA-T1-1204', due_date: '2026-09-20', amount: 125000, currency: 'PHP', status: 'POSTED', description: 'Reservation fee demo record', document_id: 'doc-1' },
        { id: 'pay-2', reference: 'DEMO-PAY-0002', property_code: 'DEMO-AMICA-T1-1204', due_date: '2026-10-20', amount: 275000, currency: 'PHP', status: 'PENDING', description: 'Contract milestone pending review', document_id: 'doc-2' },
        { id: 'pay-3', reference: 'DEMO-PAY-0003', property_code: 'DEMO-AMICA-T1-1204', due_date: '2026-08-20', amount: 25000, currency: 'PHP', status: 'REVERSED', description: 'Reversal preserves original posted entry', document_id: 'doc-3' },
      ],
      documents: [
        { id: 'doc-1', title: 'Demo Reservation Acknowledgement', category: 'Reservation', status: 'Issued', version: '1.0', issued_at: '2026-09-11', property_code: 'DEMO-AMICA-T1-1204', issuer: 'Amica Demo Records', hash: 'b96f1a3d7c2e-demo' },
        { id: 'doc-2', title: 'Demo Payment Evidence', category: 'Payment', status: 'Under review', version: '1.1', issued_at: '2026-09-12', property_code: 'DEMO-AMICA-T1-1204', issuer: 'RHC Finance Demo', hash: 'a81d4e29bc11-demo' },
        { id: 'doc-3', title: 'Demo Contract Summary', category: 'Contract', status: 'Issued', version: '2.0', issued_at: '2026-09-13', property_code: 'DEMO-AMICA-T1-1204', issuer: 'RHC Digital Demo', hash: 'cc317bc992af-demo' },
      ],
      certificates: [
        { id: 'cert-1', reference: 'DEMO-CERT-0001', type: 'RHC Customer Verification Certificate', status: 'ACTIVE', issued_at: '2026-09-14', linked_record: 'RHC-DEMO-0001', issuer: 'RHC Digital Demo' },
        { id: 'cert-2', reference: 'DEMO-CERT-0002', type: 'Demo Property Record Certificate', status: 'SUPERSEDED', issued_at: '2026-09-10', linked_record: 'DEMO-AMICA-T1-1204', issuer: 'Amica Demo Records' },
        { id: 'cert-3', reference: 'DEMO-CERT-0003', type: 'Demo Turnover Readiness Certificate', status: 'REVOKED', issued_at: '2026-09-09', linked_record: 'TURN-DEMO-0001', issuer: 'RHC Digital Demo' },
      ],
      milestones: [
        { id: 'mile-1', title: 'Foundation Works Demo Update', description: 'Fictional milestone update for presentation only; not an official project progress report.', status: 'Reviewed', date: '2026-09-01', reviewer: 'Property Admin Demo' },
        { id: 'mile-2', title: 'Structural Works Demo Update', description: 'Demo update connected to customer property lifecycle visibility.', status: 'In progress', date: '2026-09-08', reviewer: 'Amica Demo Reviewer' },
        { id: 'mile-3', title: 'Document Review Demo Update', description: 'Sample review queue activity for documents and certificates.', status: 'Pending review', date: '2026-09-15', reviewer: 'Compliance Demo' },
      ],
      benefits: [
        { id: 'benefit-1', title: 'Demo Amica Mart voucher', cost: 300, status: 'Available', detail: 'Fictional benefit offer; no merchant settlement occurs.' },
        { id: 'benefit-2', title: 'Demo Water service priority', cost: 500, status: 'Available', detail: 'Local mock connector only; no utility integration is active.' },
        { id: 'benefit-3', title: 'Demo document assistance', cost: 200, status: 'Available', detail: 'Creates a local demo request only.' },
      ],
      rewards: {
        balance: 1300,
        earned: 1500,
        redeemed: 200,
        entries: [
          { id: 'rw-1', date: '2026-09-01', source: 'Amica Demo', points: 1000, reason: 'Demo property milestone', reference: 'DEMO-RW-0001' },
          { id: 'rw-2', date: '2026-09-05', source: 'Amica Mart Demo', points: 500, reason: 'Demo retail event', reference: 'DEMO-RW-0002' },
          { id: 'rw-3', date: '2026-09-08', source: 'RHC Benefits Demo', points: -200, reason: 'Demo benefit redemption', reference: 'DEMO-RW-0003' },
        ],
      },
      turnover: {
        case_number: 'TURN-DEMO-0001',
        status: 'Checklist in progress',
        note: 'Turnover is a demo workflow only and is not a legal transfer or title issuance.',
        checklist: [
          { label: 'Demo identity verified', complete: true },
          { label: 'Demo payment records reviewed', complete: true },
          { label: 'Demo document package acknowledged', complete: true },
          { label: 'Demo site inspection scheduled', complete: false },
        ],
      },
    };
  }
  if (route === '/companies') {
    return [
      { id: 'demo-company-rhc', company_code: 'RHC', display_name: 'Rabino Holdings Corporation', legal_name: 'Rabino Holdings Corporation', status: 'ACTIVE' },
      { id: 'demo-company-amica', company_code: 'AMICA_CONDO', display_name: 'Amica', legal_name: 'Amica Condominium Realty Corporation', status: 'ACTIVE' },
    ];
  }
  if (route === '/projects') {
    return [
      { id: 'demo-project-1', project_code: 'AMICA-R1', project_name: 'Amica Residences 1', status: 'ACTIVE', company: { display_name: 'Amica' } },
    ];
  }
  if (route === '/properties') return demoInventory;
  if (route.startsWith('/properties/')) return demoInventory.find((property) => property.id === route.split('/').at(-1)) || null;
  if (route === '/admin/dashboard') return { totalUsers: 19, verifiedCustomers: 8, companies: 11, activeProjects: 2, totalAmicaProperties: 30, availableProperties: 12, reservedProperties: 4, activeIntegrations: 0, auditCount: 38 };
  if (route === '/admin/customers' || route === '/admin/users') return [
    { id: 'demo-customer-1', email: 'miguel.reyes@example.com', account_status: 'ACTIVE', verification_status: 'VERIFIED', created_at: '2026-09-01T08:00:00.000Z', profile: { first_name: 'Miguel', last_name: 'Reyes', rhc_id: 'RHC-2026-000001' } },
    { id: 'demo-customer-2', email: 'angela.santos@example.com', account_status: 'ACTIVE', verification_status: 'VERIFIED', created_at: '2026-09-02T08:00:00.000Z', profile: { first_name: 'Angela', last_name: 'Santos', rhc_id: 'RHC-2026-000002' } },
    { id: 'demo-customer-4', email: 'sofia.navarro@example.com', account_status: 'ACTIVE', verification_status: 'PENDING', created_at: '2026-09-04T08:00:00.000Z', profile: { first_name: 'Sofia', last_name: 'Navarro', rhc_id: null } },
  ];
  if (route === '/admin/companies') return [
    { id: 'demo-company-rhc', company_code: 'RHC', display_name: 'Rabino Holdings Corporation', legal_name: 'Rabino Holdings Corporation', status: 'ACTIVE', integration_status: 'ACTIVE' },
    { id: 'demo-company-amica', company_code: 'AMICA', display_name: 'Amica', legal_name: 'Amica', status: 'ACTIVE', integration_status: 'ACTIVE' },
  ];
  if (route === '/admin/projects') return [{ id: 'demo-project-1', project_code: 'AMICA-R1', project_name: 'Amica Residences 1', status: 'ACTIVE', location: 'Central Luzon, Philippines', company: { display_name: 'Amica' } }];
  if (route === '/admin/properties') return demoInventory;
  if (route === '/admin/reservations') return [{ id: 'demo-reservation-1', reservation_number: 'RES-2026-000001', status: 'CONFIRMED', expires_at: '2026-09-18T08:00:00.000Z', created_at: '2026-09-15T08:00:00.000Z', customer: { email: 'miguel.reyes@example.com', profile: { rhc_id: 'RHC-2026-000001' } }, property: demoInventory[1] }];
  if (route === '/admin/audit-logs') return [
    { id: 'demo-audit-1', action: 'RESERVATION_CONFIRMED', entity_type: 'reservation', entity_id: 'demo-reservation-1', created_at: '2026-09-16T08:00:00.000Z' },
    { id: 'demo-audit-2', action: 'DIGITAL_ID_CREATED', entity_type: 'rhc_digital_id', entity_id: 'RHC-2026-000001', created_at: '2026-09-15T08:00:00.000Z' },
  ];
  if (route === '/admin/roles') return [{ id: 'role-super', code: 'SUPER_ADMINISTRATOR', name: 'SUPER ADMINISTRATOR', is_system: true, role_permissions: [] }, { id: 'role-customer', code: 'CUSTOMER', name: 'CUSTOMER', is_system: true, role_permissions: [] }];
  if (route === '/admin/permissions') return [{ id: 'permission-customer-view', code: 'customer.view', description: 'customer.view' }, { id: 'permission-audit-view', code: 'audit.view', description: 'audit.view' }];
  if (route === '/admin/customer-properties') return [{ id: 'demo-customer-property-1', customer_id: 'demo-customer-1', property_id: 'demo-property-reserved-1', relationship_type: 'BUYER', status: 'ACTIVE', effective_from: '2026-09-01T08:00:00.000Z', created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-01T08:00:00.000Z' }];
  if (route === '/admin/business-services') return [{ id: 'demo-service-1', service_code: 'PROPERTY_SERVICES', service_name: 'Property Services', service_type: 'PROPERTY', status: 'ACTIVE', integration_status: 'PREPARED', company: { display_name: 'Amica' } }];
  if (route === '/admin/integrations') return [{ id: 'demo-integration-1', integration_key: 'AMICA_PROPERTY_SERVICES', name: 'Amica Property Services', status: 'PREPARED', updated_at: '2026-09-16T08:00:00.000Z', company: { display_name: 'Amica', company_code: 'AMICA' } }];
  if (route === '/admin/user-roles') return [{ id: 'demo-user-role-1', user_id: 'mock-superadmin', role: { name: 'SUPER ADMINISTRATOR', code: 'SUPER_ADMINISTRATOR' }, company_id: null, project_id: null, expires_at: null }];
  if (route === '/admin/feature-flags') return [{ id: 'flag-wallet', key: 'ENABLE_WALLET', enabled: false, scope: 'GLOBAL', description: 'Month 2 wallet flag', updated_at: '2026-09-16T08:00:00.000Z' }];
  if (route === '/admin/system-settings') return [{ id: 'setting-web3', key: 'web3_placeholder_status', value: { wallet_status: 'NOT_ACTIVATED', token_status: 'MONTH_2' }, description: 'Month 1 Web3 placeholder state', updated_at: '2026-09-16T08:00:00.000Z' }];
  if (route === '/business-services') {
    return [
      {
        id: 'demo-service-1',
        service_name: 'RHC Marketplace Preview',
        description: 'Sample marketplace service for local dashboard testing.',
        status: 'Coming soon',
        company: { display_name: 'Rabino Holdings Corporation' },
      },
    ];
  }
  return null;
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
  requireAdmin = false,
  children,
}: {
  auth: AuthAdapter;
  apiUrl?: string;
  pathname: string;
  navigate: (path: string) => void;
  publicRoutes: string[];
  requireAdmin?: boolean;
  children: ReactNode;
}) {
  const [session, setSession] = useState<BrowserSession | null>();
  const [user, setUser] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [dataRevision, setDataRevision] = useState(0);
  const isPublic = publicRoutes.some((route) => route.endsWith('/*') ? pathname.startsWith(route.slice(0, -1)) : route === pathname);
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
      if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path.');
      const current = await auth.session();
      if (!current) {
        setSession(null);
        setUser(null);
        throw new ApiError(401, 'Your session has ended. Please sign in again.');
      }
      if (isDemoToken(current.access_token)) {
        if (path.split('?')[0] === '/me/reservations' && init.method?.toUpperCase() === 'POST') {
          setDataRevision((n) => n + 1);
          return { id: 'demo-reservation-new', reservation_number: 'RSV-DEMO-NEW', status: 'PENDING' } as T;
        }
        const localDemoResponse = demoResponse(path, current.access_token);
        if (localDemoResponse !== null) return localDemoResponse as T;
      }
      if (!apiUrl) throw new Error('The public API URL is not configured.');
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
    if (isDemoToken(session.access_token)) {
      const demoUser = accountForDemoToken(session.access_token);
      setError('');
      setUser(demoUser);
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
      ) : user && session && requireAdmin && !isAdminAccount(user) ? (
        <section className="mx-auto max-w-xl p-8">
          <h1 className="rhc-page-title">Access denied</h1>
          <p role="alert" className="my-5">This dashboard is for authorized RHC administrators and staff only.</p>
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
        const session = await request<{ authenticated: boolean; user: Account }>('/auth/session');
        if (isAdminAccount(session.user)) window.location.assign(adminUrl('/'));
        else navigate('/dashboard');
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
