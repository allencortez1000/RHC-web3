import { ForbiddenException } from '@nestjs/common';
import { MeController } from '../src/modules/customers/me.controller';
import { CompanyApiKeyService } from '../src/modules/security/company-api-key.service';

const userId = '10000000-0000-4000-8000-000000000001';
const companyId = '20000000-0000-4000-8000-000000000001';
const clientId = '30000000-0000-4000-8000-000000000001';

describe('approved profile mutation boundary', () => {
  function fixture() {
    const user = { verification_status: 'PENDING' };
    const profile = { id: userId, verification_status: 'PENDING', rhc_id: null as string | null, rhc_id_issued_at: null as Date | null };
    const tx = {
      $queryRaw: jest.fn(async () => []),
      user: { findUniqueOrThrow: jest.fn(async () => user) },
      userProfile: { findUniqueOrThrow: jest.fn(async () => profile), update: jest.fn(async ({ data }) => ({ ...profile, ...data })) },
    };
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    const audit = { record: jest.fn(async () => ({})) };
    const rhcId = { issueForUser: jest.fn() };
    const controller = new MeController(prisma as any, rhcId as any, audit as any);
    return { user, profile, tx, audit, rhcId, controller };
  }

  it.each(['user', 'profile', 'id', 'issued_at'])('returns an exact reviewed-change exception for protected %s state', async (state) => {
    const f = fixture();
    if (state === 'user') f.user.verification_status = 'VERIFIED';
    if (state === 'profile') f.profile.verification_status = 'VERIFIED';
    if (state === 'id') f.profile.rhc_id = 'RHC-2026-00000001';
    if (state === 'issued_at') f.profile.rhc_id_issued_at = new Date('2026-01-01');
    const error = await f.controller.updateMe({ id: userId, email: 'test@example.test', verification_status: 'PENDING' }, { nationality: null }).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toEqual({ statusCode: 403, error: 'Forbidden', message: 'Approved identity fields require a separately reviewed administrative change' });
    expect(f.tx.userProfile.update).not.toHaveBeenCalled();
    expect(f.audit.record).not.toHaveBeenCalled();
    expect(f.rhcId.issueForUser).not.toHaveBeenCalled();
  });

  it('rechecks persisted verification after locking instead of trusting stale authenticated state', async () => {
    const f = fixture();
    f.tx.$queryRaw.mockImplementation(async () => { f.user.verification_status = 'VERIFIED'; return []; });
    await expect(f.controller.updateMe({ id: userId, email: 'test@example.test', verification_status: 'PENDING' }, { city: 'New city' })).rejects.toThrow('Approved identity fields require a separately reviewed administrative change');
    expect(f.tx.$queryRaw.mock.calls[0]).toEqual([expect.arrayContaining([expect.stringContaining('FROM users')]), userId]);
    expect(f.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(f.tx.user.findUniqueOrThrow.mock.invocationCallOrder[0]);
    expect(f.tx.userProfile.update).not.toHaveBeenCalled();
  });

  it('updates only the contact field and audits through the same transaction client', async () => {
    const f = fixture(); f.user.verification_status = 'VERIFIED';
    await f.controller.updateMe({ id: userId, email: 'test@example.test' }, { mobile_number: ' +639171234567 ' });
    expect(f.tx.userProfile.update).toHaveBeenCalledWith({ where: { user_id: userId }, data: { mobile_number: '+639171234567' } });
    expect(f.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actor_user_id: userId, action: 'profile.update', after_data: { changed_fields: ['mobile_number'] } }), f.tx);
    expect(f.rhcId.issueForUser).not.toHaveBeenCalled();
  });
});

describe('machine credential delegation boundary', () => {
  function fixture(scopes = ['properties.read']) {
    const client = { id: clientId, client_id: clientId, company_id: companyId, status: 'ACTIVE', scopes, company: { status: 'ACTIVE', api_enabled: true } };
    const tx = {
      $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => []),
      company: { findUniqueOrThrow: jest.fn(async () => ({ status: 'ACTIVE', api_enabled: true })) },
      companyApiClient: { findUniqueOrThrow: jest.fn(async () => client), create: jest.fn(async () => client), update: jest.fn(async () => client) },
    };
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    const audit = { record: jest.fn(async () => ({})) };
    const rbac = { require: jest.fn(async (_actor: string, _permission: string, _scope: object) => {}) };
    const service = new CompanyApiKeyService(prisma as any, audit as any, {} as any, rbac as any);
    return { tx, rbac, service, client, audit };
  }

  it.each(['issue', 'rotate'] as const)('rechecks integration governance inside %s instead of relying on the controller guard', async (method) => {
    const f = fixture();
    f.rbac.require.mockRejectedValueOnce(new ForbiddenException('Insufficient permission for this resource'));
    const operation = method === 'issue' ? f.service.issue({ company_id: companyId, client_name: 'Partner', scopes: ['properties.read'] }, userId) : f.service.rotate(clientId, userId);
    await expect(operation).rejects.toThrow(/^Insufficient permission for this resource$/);
    expect(f.tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(f.rbac.require.mock.invocationCallOrder[0]);
    expect(f.rbac.require).toHaveBeenCalledWith(userId, 'integration.manage', { company_id: companyId });
    expect(f.tx.companyApiClient.create).not.toHaveBeenCalled();
    expect(f.tx.companyApiClient.update).not.toHaveBeenCalled();
    expect(f.audit.record).not.toHaveBeenCalled();
  });

  it('locks then authorizes every stored rotation scope against the stored company', async () => {
    const f = fixture(['properties.read', 'identity.verify', 'projects.read', 'events.write']);
    await f.service.rotate(clientId, userId);
    expect(f.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(f.tx.companyApiClient.findUniqueOrThrow.mock.invocationCallOrder[0]);
    expect(f.rbac.require.mock.calls).toEqual(['integration.manage', 'property.view', 'customer.view', 'project.view', 'integration.manage'].map((permission) => [userId, permission, { company_id: companyId }]));
    expect(f.rbac.require.mock.invocationCallOrder.at(-1)).toBeLessThan(f.tx.companyApiClient.update.mock.invocationCallOrder[0]);
    expect(f.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'company_api_key.rotate', company_id: companyId }), f.tx);
  });

  it.each([['unknown.scope'], []])('fails closed on unsupported or empty stored scopes %j', async (...scopes) => {
    const f = fixture(scopes);
    await expect(f.service.rotate(clientId, userId)).rejects.toThrow(scopes.length ? 'Unsupported API scope' : 'API scopes are required');
    expect(f.tx.companyApiClient.update).not.toHaveBeenCalled();
  });
});
