import { expect, type Page } from '@playwright/test';
import { apiUrl, installFixtures, token } from '../../customer-web/tests/fixtures';

type Row = { id: string; [key: string]: unknown };
export async function installManagementFixture(page: Page, options: { deny?: string[] } = {}) {
  const fixture = await installFixtures(page, {
    authenticated: true,
    reviewCandidate: true,
    ...options,
  });
  const permission = {
    id: '10000000-0000-4000-8000-000000000001',
    code: 'company.view',
    description: 'View companies',
  };
  const secondPermission = {
    id: '10000000-0000-4000-8000-000000000002',
    code: 'project.view',
    description: 'View projects',
  };
  const role = {
    id: '20000000-0000-4000-8000-000000000001',
    code: 'OPERATOR',
    name: 'Fixture Operator',
    description: 'Operations',
    company_id: null,
    is_system: false,
    role_permissions: [{ permission_id: permission.id, permission }],
  };
  const superRole = {
    ...role,
    id: '20000000-0000-4000-8000-000000000002',
    code: 'SUPER_ADMIN',
    name: 'Bootstrap administrator',
    is_system: true,
  };
  const assignment = {
    id: '30000000-0000-4000-8000-000000000001',
    user_id: fixture.candidate.id,
    role_id: role.id,
    company_id: null,
    project_id: null,
    expires_at: null,
    role: { name: role.name, code: role.code },
  };
  const integration = {
    id: '40000000-0000-4000-8000-000000000001',
    company_id: fixture.company.id,
    company: fixture.company,
    integration_key: 'fixture',
    name: 'Fixture Integration',
    status: 'PREPARED',
  };
  const service = {
    id: '50000000-0000-4000-8000-000000000001',
    company_id: fixture.company.id,
    company: fixture.company,
    service_code: 'RESIDENT',
    service_name: 'Fixture Resident Services',
    service_type: 'RESIDENT',
    description: 'Resident services',
    status: 'PREPARED',
    requires_property: true,
    requires_resident_status: false,
    integration_status: 'PREPARED',
  };
  const setting = {
    id: '60000000-0000-4000-8000-000000000001',
    key: 'support_contact',
    value: { email: 'support@example.test' },
  };
  Object.assign(fixture.project, {
    start_date: '2026-01-01T00:00:00.000Z',
    target_completion: '2027-01-01T00:00:00.000Z',
    description: 'Tower',
    location: 'Manila',
  });
  Object.assign(fixture.lists['/admin/customer-properties'][0] as object, {
    effective_from: '2026-01-01T00:00:00.000Z',
    effective_to: null,
  });
  Object.assign(fixture.lists, {
    '/admin/roles': [role, superRole],
    '/admin/permissions': [permission, secondPermission],
    '/admin/user-roles': [
      assignment,
      { ...assignment, id: '30000000-0000-4000-8000-000000000002', user_id: fixture.account.id },
      {
        ...assignment,
        id: '30000000-0000-4000-8000-000000000003',
        role_id: superRole.id,
        role: { name: superRole.name, code: superRole.code },
      },
    ],
    '/admin/integrations': [integration],
    '/admin/business-services': [service],
    '/admin/system-settings': [
      setting,
      { id: '60000000-0000-4000-8000-000000000002', key: 'authentication_policy' },
    ],
  });
  const fail = new Map<string, number>();
  let sequence = 10;
  await page.route(`${apiUrl}/admin/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.slice(new URL(apiUrl).pathname.length);
    const method = request.method();
    if (method === 'GET' || method === 'OPTIONS') return route.fallback();
    const parts = path.split('/');
    const resource = parts[2];
    if (
      ![
        'projects',
        'customer-properties',
        'users',
        'roles',
        'user-roles',
        'integrations',
        'business-services',
        'system-settings',
      ].includes(resource)
    )
      return route.fallback();
    const body = request.postDataJSON() as Record<string, unknown>;
    fixture.requests.push({ method, path, body, authorization: request.headers().authorization });
    expect(request.headers().authorization).toBe(`Bearer ${token}`);
    expect([...url.searchParams]).toEqual([]);
    const failure = (status: number) =>
      route.fulfill({
        status,
        json: {
          success: false,
          error: {
            code: status === 403 ? 'FORBIDDEN' : 'CONFLICT',
            message: status === 403 ? 'Access denied' : 'Resource conflict',
          },
        },
      });
    if (fail.has(path)) return failure(fail.get(path)!);
    const ok = (data: unknown) =>
      route.fulfill({ json: { success: true, data, meta: { request_id: 'management-fixture' } } });
    const rows = fixture.lists[`/admin/${resource}`] as Row[];
    const row = rows?.find((item) => item.id === parts[3]);
    const reviewed = () =>
      expect(String(body.review_reference)).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/);
    const keys = (allowed: string[]) => {
      expect(Object.keys(body).length).toBeGreaterThan(0);
      expect(Object.keys(body).filter((key) => !allowed.includes(key))).toEqual([]);
    };
    if (resource === 'users') {
      expect(method).toBe('PATCH');
      expect(parts[4]).toBe('status');
      expect(Object.keys(body).sort()).toEqual([
        'account_status',
        'expected_status',
        'review_reference',
      ]);
      reviewed();
      if (row?.account_status !== body.expected_status) return failure(409);
      Object.assign(row!, { account_status: body.account_status });
      return ok({ id: row!.id, account_status: row!.account_status });
    }
    if (resource === 'system-settings') {
      expect(method).toBe('PUT');
      expect(Object.keys(body).sort()).toEqual(['review_reference', 'value']);
      reviewed();
      const allowed: Record<string, string[]> = {
        support_contact: ['email'],
        maintenance_notice: ['enabled', 'message'],
        month_1_acceptance_state: ['status'],
      };
      expect(Object.keys(allowed)).toContain(parts[3]);
      expect(Object.keys(body.value as object).sort()).toEqual(allowed[parts[3]].sort());
      const settingRow = rows.find((item) => item.key === parts[3]);
      if (settingRow) Object.assign(settingRow, { value: body.value });
      else
        rows.push({
          id: `60000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`,
          key: parts[3],
          value: body.value,
        });
      return ok(settingRow || rows[rows.length - 1]);
    }
    if (method === 'PUT' && resource === 'roles') {
      expect(parts[4]).toBe('permissions');
      expect(Object.keys(body).sort()).toEqual(['permission_ids', 'review_reference']);
      reviewed();
      const ids = body.permission_ids as string[];
      expect(new Set(ids).size).toBe(ids.length);
      row!.role_permissions = ids.map((id) => ({
        permission_id: id,
        permission: [permission, secondPermission].find((item) => item.id === id),
      }));
      return ok({ id: row!.id, permission_ids: ids });
    }
    if (method === 'DELETE') {
      expect(['roles', 'user-roles']).toContain(resource);
      expect(Object.keys(body)).toEqual(['review_reference']);
      reviewed();
      rows.splice(rows.indexOf(row!), 1);
      return ok({ id: row!.id, removed: true });
    }
    const editable: Record<string, string[]> = {
      projects: [
        'project_name',
        'description',
        'location',
        'status',
        'start_date',
        'target_completion',
      ],
      'customer-properties': ['relationship_type', 'status', 'effective_from', 'effective_to'],
      roles: ['name', 'description'],
      integrations: ['name', 'status'],
      'business-services': [
        'service_name',
        'service_type',
        'description',
        'status',
        'requires_property',
        'requires_resident_status',
        'integration_status',
      ],
      'user-roles': [
        'user_id',
        'role_id',
        'company_id',
        'project_id',
        'expires_at',
        'review_reference',
      ],
    };
    keys([
      ...editable[resource],
      ...(method === 'POST' ? ['company_id', 'code', 'integration_key', 'service_code'] : []),
    ]);
    if (resource === 'user-roles') reviewed();
    if (method === 'PATCH') {
      Object.assign(row!, body);
      return ok(row);
    }
    expect(method).toBe('POST');
    const created = {
      id: `90000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`,
      ...body,
      ...(resource === 'user-roles' ? { role: { name: role.name, code: role.code } } : {}),
    };
    rows.push(created);
    return ok(created);
  });
  return {
    ...fixture,
    role,
    superRole,
    assignment,
    integration,
    service,
    setting,
    permission,
    secondPermission,
    fail,
  };
}
