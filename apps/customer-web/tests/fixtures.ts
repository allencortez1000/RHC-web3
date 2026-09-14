import { createHash } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

// Only synthetic identities and browser-intercepted endpoints are used by these journeys.
export const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api/v1').replace(
  /\/$/,
  '',
);
export const authUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhc-e2e.supabase.co'
).replace(/\/$/, '');
const subject = '11111111-1111-4111-8111-111111111111';
const user = {
  id: subject,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'alex@example.test',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
};
const jwt = (expiration: number) =>
  `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: subject, aud: 'authenticated', role: 'authenticated', exp: expiration, iat: 1767225600 })).toString('base64url')}.fixture-signature`;
export const token = jwt(4102444800);
const session = {
  access_token: token,
  refresh_token: 'fixture-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  user,
};
export type Captured = {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
  authorization?: string;
};
export async function installFixtures(
  page: Page,
  options: {
    authenticated?: boolean;
    businessVerified?: boolean;
    reviewCandidate?: boolean;
    expired?: boolean;
    deny?: string[];
    failOnce?: string[];
    loginError?: boolean;
    registrationEnabled?: boolean;
    empty?: boolean;
  } = {},
) {
  await page.route('**/*', (route) => {
    const origin = new URL(route.request().url()).origin;
    return ['http://127.0.0.1:3000', 'http://127.0.0.1:3002'].includes(origin)
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  const requests: Captured[] = [];
  const authRequests: Captured[] = [];
  const profile: Record<string, unknown> = {
    first_name: 'Alex',
    last_name: 'Rivera',
    rhc_id: options.businessVerified ? 'RHC-2026-00000042' : null,
    verification_status: options.businessVerified ? 'VERIFIED' : 'PENDING',
    country: 'Philippines',
  };
  const account = {
    id: '22222222-2222-4222-8222-222222222222',
    email: user.email,
    account_status: 'ACTIVE',
    verification_status: options.businessVerified ? 'VERIFIED' : 'PENDING',
    auth_email_confirmed_at: '2026-01-01T00:00:00.000Z' as string | null | undefined,
  };
  const candidate = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'sam@example.test',
    account_status: 'ACTIVE',
    verification_status: 'PENDING',
    auth_email_confirmed_at: '2026-01-01T00:00:00.000Z' as string | null | undefined,
    profile: {
      first_name: 'Sam',
      last_name: 'Morgan',
      rhc_id: null,
      verification_status: 'PENDING',
    },
  };
  const company = {
    id: '33333333-3333-4333-8333-333333333333',
    company_code: 'AMICA',
    display_name: 'Fixture Company',
    legal_name: 'Fixture Company Ltd',
    status: 'ACTIVE',
    integration_status: 'PREPARED',
  };
  const project = {
    id: '44444444-4444-4444-8444-444444444444',
    project_code: 'AMICA-T1',
    project_name: 'Fixture Tower',
    company_id: company.id,
    company,
    status: 'ACTIVE',
  };
  const property = {
    id: '55555555-5555-4555-8555-555555555555',
    property_code: 'FIX-1205',
    project_id: project.id,
    project,
    status: 'SOLD',
    asset_type: 'RESIDENTIAL',
    area: '52.5',
    list_price: '4200000',
    currency: 'PHP',
  };
  const relationship = {
    id: '66666666-6666-4666-8666-666666666666',
    customer: account,
    customer_id: account.id,
    property_id: property.id,
    property,
    relationship_type: 'OWNER',
    status: 'ACTIVE',
  };
  const flags = [
    {
      id: '77777777-7777-4777-8777-777777777777',
      key: 'ENABLE_PROPERTIES',
      description: 'Property records',
      enabled: true,
    },
    {
      id: '88888888-8888-4888-8888-888888888888',
      key: 'ENABLE_WALLET',
      description: 'Future wallet',
      enabled: false,
    },
  ];
  const lists: Record<string, unknown[]> = {
    '/me/properties': [relationship],
    '/me/notifications': [
      {
        id: 'notice-1',
        subject: 'Profile review complete',
        body: 'Your account records were reviewed.',
        status: 'DELIVERED',
        channel: 'IN_APP',
        created_at: '2026-09-01T12:00:00.000Z',
      },
    ],
    '/companies': [company],
    '/projects': [project],
    '/business-services': [
      {
        id: 'service-1',
        service_code: 'RESIDENT',
        service_name: 'Fixture Resident Services',
        status: 'PREPARED',
        company,
      },
    ],
    '/admin/companies': [company],
    '/admin/projects': [project],
    '/admin/properties': [property],
    '/admin/customer-properties': [
      {
        id: relationship.id,
        customer_id: relationship.customer_id,
        property_id: relationship.property_id,
        relationship_type: relationship.relationship_type,
        status: relationship.status,
      },
    ],
    '/admin/customers': [{ ...account, profile }, ...(options.reviewCandidate ? [candidate] : [])],
    '/admin/users': [{ ...account, profile }, ...(options.reviewCandidate ? [candidate] : [])],
    '/admin/feature-flags': flags,
    '/admin/roles': [{ id: 'role-1', code: 'OPERATOR', name: 'Fixture Operator' }],
    '/admin/permissions': [
      { id: 'permission-1', code: 'company.view', description: 'View companies' },
    ],
    '/admin/integrations': [
      {
        id: 'integration-1',
        integration_key: 'fixture',
        name: 'Fixture Integration',
        status: 'PREPARED',
        company,
      },
    ],
    '/admin/business-services': [
      {
        id: 'service-1',
        service_code: 'RESIDENT',
        service_name: 'Fixture Resident Services',
        status: 'PREPARED',
        company,
      },
    ],
    '/admin/audit-logs': [
      {
        id: 'audit-1',
        action: 'company.update',
        entity_type: 'company',
        entity_id: company.id,
        created_at: '2026-09-01T00:00:00.000Z',
      },
    ],
    '/admin/system-settings': [
      { id: 'setting-1', key: 'PLATFORM_NAME', description: 'Platform display name' },
    ],
  };
  const failures = new Set(options.failOnce || []);
  const pkceCodes = new Map<string, string>();
  await page.route(`${authUrl}/auth/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/auth/v1', '');
    const body = request.postDataJSON() as Record<string, unknown> | null;
    authRequests.push({
      method: request.method(),
      path,
      body,
      authorization: request.headers().authorization,
    });
    if (
      options.loginError &&
      path === '/token' &&
      url.searchParams.get('grant_type') === 'password'
    )
      return route.fulfill({
        status: 400,
        json: { code: 'invalid_credentials', msg: 'Invalid login credentials' },
      });
    const issuedCode = {
      '/recover': 'synthetic-recovery',
      '/resend': 'synthetic-confirmation',
      '/signup': 'synthetic-signup',
    }[path];
    if (issuedCode) {
      expect(body?.code_challenge_method).toBe('s256');
      expect(body?.code_challenge).toEqual(expect.any(String));
      pkceCodes.set(issuedCode, String(body?.code_challenge));
    }
    if (path === '/token' && url.searchParams.get('grant_type') === 'pkce') {
      const code = String(body?.auth_code || '');
      const verifier = String(body?.code_verifier || '');
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      if (!verifier || pkceCodes.get(code) !== challenge)
        return route.fulfill({
          status: 400,
          json: { code: 'bad_code_verifier', msg: 'Invalid or expired PKCE code/verifier' },
        });
      pkceCodes.delete(code);
      return route.fulfill({ json: session });
    }
    if (path === '/token' || path === '/verify') return route.fulfill({ json: session });
    if (path === '/user') return route.fulfill({ json: user });
    if (path === '/signup') return route.fulfill({ json: { ...user, identities: [] } });
    if (['/recover', '/resend', '/logout'].includes(path)) return route.fulfill({ json: {} });
    return route.fulfill({ status: 501, json: { message: `Unmocked auth request: ${path}` } });
  });
  await page.route(`${apiUrl}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.slice(new URL(apiUrl).pathname.replace(/\/$/, '').length);
    const method = request.method();
    if (method === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      });
    const body = request.postDataJSON() as Record<string, unknown> | null;
    requests.push({ method, path, body, authorization: request.headers().authorization });
    if (path === '/auth/config') expect(request.headers().authorization).toBeUndefined();
    else expect(request.headers().authorization).toBe(`Bearer ${token}`);
    if (options.deny?.includes(path))
      return route.fulfill({
        status: 403,
        json: { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
      });
    if (failures.delete(path))
      return route.fulfill({
        status: 503,
        json: {
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' },
        },
      });
    const ok = (data: unknown) =>
      route.fulfill({ json: { success: true, data, meta: { request_id: 'fixture-request' } } });
    if (path === '/auth/config') return ok({ registration_enabled: options.registrationEnabled !== false });
    if (path === '/auth/session') return ok({ authenticated: true, user: account });
    if (path === '/me') {
      if (method === 'PATCH') {
        const identityLocked =
          account.verification_status === 'VERIFIED' ||
          profile.verification_status === 'VERIFIED' ||
          Boolean(profile.rhc_id) ||
          Boolean(profile.rhc_id_issued_at);
        if (identityLocked && Object.keys(body || {}).some((key) => key !== 'mobile_number'))
          return route.fulfill({
            status: 403,
            json: {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Approved identity fields require a separately reviewed administrative change',
              },
            },
          });
        Object.assign(profile, body);
      }
      return ok(method === 'PATCH' ? profile : { user: account, profile });
    }
    if (path === '/me/rhc-id') {
      if (method === 'POST') {
        if (
          account.account_status !== 'ACTIVE' ||
          account.verification_status !== 'VERIFIED' ||
          !account.auth_email_confirmed_at ||
          !Number.isFinite(Date.parse(account.auth_email_confirmed_at)) ||
          Date.parse(account.auth_email_confirmed_at) > Date.now()
        )
          return route.fulfill({
            status: 403,
            json: { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
          });
        profile.rhc_id = 'RHC-2026-00000042';
      }
      return ok({ rhc_id: profile.rhc_id });
    }
    if (method === 'POST' && path.endsWith('/verification/approve')) {
      expect([...url.searchParams]).toHaveLength(0);
      expect(Object.keys(body || {}).sort()).toEqual(['expected_status', 'review_reference']);
      const targetId = path.split('/')[3];
      if (targetId === account.id)
        return route.fulfill({
          status: 403,
          json: { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        });
      expect(targetId).toBe(candidate.id);
      expect(['UNVERIFIED', 'PENDING', 'REJECTED']).toContain(body?.expected_status);
      expect(String(body?.review_reference)).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/);
      if (
        candidate.verification_status !== body?.expected_status ||
        candidate.account_status !== 'ACTIVE' ||
        candidate.auth_email_confirmed_at === null
      )
        return route.fulfill({
          status: 409,
          json: { success: false, error: { code: 'CONFLICT', message: 'Resource conflict' } },
        });
      candidate.verification_status = 'VERIFIED';
      candidate.profile.verification_status = 'VERIFIED';
      return ok({ id: candidate.id, verification_status: 'VERIFIED' });
    }
    if (path === '/admin/dashboard')
      return ok({
        totalUsers: 7,
        verifiedCustomers: 5,
        companies: 2,
        activeProjects: 1,
        totalAmicaProperties: 4,
        availableProperties: 2,
        reservedProperties: 1,
        auditCount: 12,
      });
    if (path === `/properties/${property.id}`) return ok(property);
    if (method === 'PATCH') {
      const parent = path.slice(0, path.lastIndexOf('/'));
      const row = lists[parent]?.find(
        (item) => (item as { id: string }).id === path.split('/').pop(),
      ) as Record<string, unknown> | undefined;
      if (row) {
        Object.assign(row, body);
        return ok(row);
      }
    }
    if (lists[path]) {
      if (method === 'POST') {
        const created = { id: '99999999-9999-4999-8999-999999999999', ...body };
        lists[path].push(created);
        return ok(created);
      }
      const skip = Number(url.searchParams.get('skip') || 0);
      return ok(
        options.empty
          ? []
          : lists[path].slice(skip, skip + Number(url.searchParams.get('take') || 100)),
      );
    }
    return route.fulfill({
      status: 501,
      json: { message: `Unmocked API request: ${method} ${path}` },
    });
  });
  if (options.authenticated || options.expired) {
    const storageKey = `sb-${new URL(authUrl).hostname.split('.')[0]}-auth-token`;
    await page.addInitScript(
      ({ storageKey, session }) => {
        if (!sessionStorage.getItem('fixture-initialized')) {
          localStorage.setItem(storageKey, JSON.stringify(session));
          sessionStorage.setItem('fixture-initialized', 'true');
        }
      },
      {
        storageKey,
        session: options.expired
          ? { ...session, access_token: jwt(1767225600), expires_at: 1767225600 }
          : session,
      },
    );
  }
  return {
    requests,
    authRequests,
    profile,
    lists,
    property,
    account,
    candidate,
    company,
    project,
    flags,
  };
}
export async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-42!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
