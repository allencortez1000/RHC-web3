import { PrismaService } from '../../platform/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { RbacService } from './rbac.service';

const userId = '10000000-0000-4000-8000-000000000001';
const companyId = '20000000-0000-4000-8000-000000000001';

function grant() {
  return {
    company_id: companyId,
    project_id: null,
    expires_at: null,
    role: { company_id: null, code: 'SALES_AGENT' },
    project: null,
  };
}

describe('RbacService database client selection', () => {
  function fixture() {
    const outer = { userRole: { findMany: jest.fn(async () => []) } };
    const transaction = { userRole: { findMany: jest.fn(async () => [grant()]) } };
    const service = new RbacService(outer as any);
    return { outer, transaction, service };
  }

  it('uses the injected Prisma service when no transaction client is supplied', async () => {
    const f = fixture();

    await f.service.grants(userId, 'company.view');

    expect(f.outer.userRole.findMany).toHaveBeenCalledTimes(1);
    expect(f.transaction.userRole.findMany).not.toHaveBeenCalled();
  });

  it('denies when the transaction client has no grant even if the outer client would authorize', async () => {
    const outer = { userRole: { findMany: jest.fn(async () => [grant()]) } };
    const transaction = { userRole: { findMany: jest.fn(async () => []) } };
    const service = new RbacService(outer as any);

    await expect(service.require(userId, 'company.view', { company_id: companyId }, transaction as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.userRole.findMany).toHaveBeenCalledTimes(1);
    expect(outer.userRole.findMany).not.toHaveBeenCalled();
  });

  it('uses the transaction client for grants, hasPermission, and require', async () => {
    const f = fixture();

    await expect(f.service.grants(userId, 'company.view', f.transaction as any)).resolves.toEqual([{ company_id: companyId, project_id: null }]);
    await expect(f.service.hasPermission(userId, 'company.view', companyId, undefined, f.transaction as any)).resolves.toBe(true);
    await expect(f.service.require(userId, 'company.view', { company_id: companyId }, f.transaction as any)).resolves.toBeUndefined();

    expect(f.transaction.userRole.findMany).toHaveBeenCalledTimes(3);
    expect(f.outer.userRole.findMany).not.toHaveBeenCalled();
  });
});

type AssignmentOptions = {
  code: string;
  permissions: string[];
  company_id?: string | null;
  project_id?: string | null;
  role_company_id?: string | null;
  project_company_id?: string | null;
  expires_at?: Date | null;
};

function assignment({
  code,
  permissions,
  company_id = null,
  project_id = null,
  role_company_id = null,
  project_company_id = company_id,
  expires_at = null,
}: AssignmentOptions) {
  return {
    company_id,
    project_id,
    expires_at,
    role: {
      code,
      company_id: role_company_id,
      role_permissions: permissions.map((permission) => ({ permission: { code: permission } })),
    },
    project: project_id ? { company_id: project_company_id } : null,
  };
}

function fixture(assignments: ReturnType<typeof assignment>[]) {
  const findMany = jest.fn().mockResolvedValue(assignments);
  const service = new RbacService({ userRole: { findMany } } as unknown as PrismaService);
  return { service, findMany };
}

describe('RbacService.capabilities', () => {
  it('does not expose a CUSTOMER assignment even if returned by the query boundary', async () => {
    const f = fixture([assignment({ code: 'CUSTOMER', permissions: ['integration.view'] })]);

    await expect(f.service.capabilities('customer-1')).resolves.toEqual({
      is_admin: false, roles: [], permissions: [], company_ids: [], project_ids: [],
    });
    await expect(f.service.hasPermission('customer-1', 'integration.view')).resolves.toBe(false);
  });

  it('does not turn advertised scoped capabilities into global or cross-tenant authorization', async () => {
    const f = fixture([assignment({ code: 'AUDITOR', permissions: ['integration.view'], company_id: 'company-a' })]);

    await expect(f.service.capabilities('staff-1')).resolves.toMatchObject({
      is_admin: true, permissions: ['integration.view'], company_ids: ['company-a'],
    });
    await expect(f.service.hasPermission('staff-1', 'integration.view', 'company-a')).resolves.toBe(true);
    await expect(f.service.hasPermission('staff-1', 'integration.view', 'company-b')).resolves.toBe(false);
    await expect(f.service.hasPermission('staff-1', 'integration.view')).resolves.toBe(false);
  });

  it('derives sorted, de-duplicated admin capabilities and scopes from persisted assignments', async () => {
    const f = fixture([
      assignment({ code: 'SYSTEM_ADMIN', permissions: ['user.view', 'user.manage'] }),
      assignment({ code: 'SYSTEM_ADMIN', permissions: ['user.view'], company_id: 'company-a', project_id: 'project-a' }),
    ]);

    await expect(f.service.capabilities('user-1')).resolves.toEqual({
      is_admin: true,
      roles: ['SYSTEM_ADMIN'],
      permissions: ['user.manage', 'user.view'],
      company_ids: ['company-a'],
      project_ids: ['project-a'],
    });
  });

  it('treats a persisted read-only staff role as admin without adding write permissions', async () => {
    const f = fixture([
      assignment({
        code: 'AUDITOR',
        permissions: ['property.view', 'audit.view'],
        project_id: 'project-a',
        project_company_id: 'company-a',
      }),
    ]);

    await expect(f.service.capabilities('auditor-1')).resolves.toEqual({
      is_admin: true,
      roles: ['AUDITOR'],
      permissions: ['audit.view', 'property.view'],
      company_ids: ['company-a'],
      project_ids: ['project-a'],
    });
  });

  it('returns non-admin capabilities when no eligible assignment is stored', async () => {
    const f = fixture([]);

    await expect(f.service.capabilities('customer-1')).resolves.toEqual({
      is_admin: false,
      roles: [],
      permissions: [],
      company_ids: [],
      project_ids: [],
    });
    expect(f.findMany).toHaveBeenCalledWith({
      where: {
        user_id: 'customer-1',
        user: { account_status: 'ACTIVE' },
        OR: [{ expires_at: null }, { expires_at: { gt: expect.any(Date) } }],
        role: { code: { not: 'CUSTOMER' } },
      },
      select: {
        company_id: true,
        project_id: true,
        expires_at: true,
        role: {
          select: {
            code: true,
            company_id: true,
            role_permissions: { select: { permission: { select: { code: true } } } },
          },
        },
        project: { select: { company_id: true } },
      },
    });
  });

  it('does not expose expired or scope-inconsistent assignments returned by the query boundary', async () => {
    const f = fixture([
      assignment({ code: 'SYSTEM_ADMIN', permissions: ['user.manage'], expires_at: new Date(0) }),
      assignment({ code: 'SYSTEM_ADMIN', permissions: ['user.manage'], company_id: 'company-b', role_company_id: 'company-a' }),
      assignment({ code: 'SYSTEM_ADMIN', permissions: ['user.manage'], company_id: 'company-a', project_id: 'project-a', project_company_id: 'company-b' }),
    ]);

    await expect(f.service.capabilities('user-1')).resolves.toEqual({
      is_admin: false,
      roles: [],
      permissions: [],
      company_ids: [],
      project_ids: [],
    });
  });
});
