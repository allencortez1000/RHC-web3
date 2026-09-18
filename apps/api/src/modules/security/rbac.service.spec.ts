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
