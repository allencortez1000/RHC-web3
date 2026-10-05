import 'reflect-metadata';
import { ExecutionContext, Type } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { lastValueFrom, of } from 'rxjs';
import { createReadProvider, type ReadProvider } from '@rhc/web3';
import type { Web3ReadResult } from '@rhc/types';
import { AppModule } from '../src/modules/app.module';
import { AuthGuard } from '../src/modules/security/auth.guard';
import { ApplicationUserService } from '../src/modules/security/application-user.service';
import { FeatureGuard, FeatureService } from '../src/modules/security/feature.guard';
import { PermissionGuard } from '../src/modules/security/permission.guard';
import { RateLimitGuard, RateLimitStore } from '../src/modules/security/rate-limit.guard';
import { SupabaseJwtService } from '../src/modules/security/supabase-jwt.service';
import { Web3Controller, ThirdwebIntegrationController } from '../src/modules/web3/web3.controller';
import { Web3Service } from '../src/modules/web3/web3.service';
import { ApiExceptionFilter } from '../src/platform/api-exception.filter';
import { PrismaService } from '../src/platform/prisma.service';
import { ResponseEnvelopeInterceptor } from '../src/platform/response-envelope.interceptor';

jest.mock('@rhc/web3', () => ({ createReadProvider: jest.fn() }));

const subject = '10000000-0000-4000-8000-000000000001';
const issuer = 'https://auth.example.test/auth/v1';
const env = {
  NODE_ENV: 'test', ENABLE_WEB3_READ_PREVIEW: 'false', RHC_WEB3_PROVIDER: 'disabled',
  RHC_APP_PROFILE: 'connected', RHC_DEMO_MODE: '0', NEXT_PUBLIC_RHC_DATA_MODE: 'connected',
  JWT_ISSUER: issuer, JWT_AUDIENCE: 'authenticated',
  SUPABASE_JWKS_URL: `${issuer}/.well-known/jwks.json`,
  SUPABASE_URL: 'https://auth.example.test', SUPABASE_SECRET_KEY: 'offline-fixture-only',
};

const disabledResult: Web3ReadResult = {
  source: 'disabled', connection: 'disabled', snapshot: 'absent', capability: 'read_only',
  restrictionAssessment: 'not_assessed', configuration: 'disabled', diagnosticCode: null,
  chain: null, contractAddress: null, explorerUrl: null, data: null, observedAt: null,
  lastSuccessAt: null, lastAttemptAt: null, block: null,
  inactiveCapabilities: ['customer_wallets', 'transfers', 'rewards', 'sponsorship', 'public_release'],
};

// No app.init(), listeners, real Prisma/Redis constructors, or remote JWKS.
function providerFixture() {
  return {
    getTokenSnapshot: jest.fn<ReturnType<ReadProvider['getTokenSnapshot']>, []>().mockResolvedValue(disabledResult),
    getReadStatus: jest.fn<ReturnType<ReadProvider['getReadStatus']>, []>().mockResolvedValue(disabledResult),
  } satisfies ReadProvider;
}

describe('Web3 API boundary (offline fixtures, not HTTP/provider acceptance)', () => {
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;
  let token: string;
  let savedEnv: Record<string, string | undefined>;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let provider: ReturnType<typeof providerFixture>;
  let module: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>>;
  let assignments: Array<{
    permission: string; company_id: string | null; project_id: string | null;
    expires_at: Date | null; role: { code: string; company_id: string | null };
    project: { company_id: string } | null;
  }>;
  let prisma: { userRole: { findMany: jest.Mock }; featureFlag: { findUnique: jest.Mock } };
  let provision: jest.Mock;
  let rates: RateLimitStore;
  let consume: jest.Mock;

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    token = await new SignJWT({ email: 'fixture@example.test' }).setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
      .setSubject(subject).setIssuer(issuer).setAudience('authenticated').setIssuedAt().setExpirationTime('1h').sign(keys.privateKey);
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
    Object.assign(process.env, env);
    assignments = [];
    prisma = {
      userRole: { findMany: jest.fn(async ({ where }) => assignments.filter((g) => g.permission === where.role.role_permissions.some.permission.code)) },
      featureFlag: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    provision = jest.fn().mockResolvedValue({ id: 'application-user', supabase_user_id: subject, email: 'fixture@example.test' });
    rates = Object.create(RateLimitStore.prototype) as RateLimitStore;
    consume = jest.fn().mockResolvedValue({ count: 1, retryAfter: 60 });
    rates.consume = consume;
    fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({
      id: subject, email: 'fixture@example.test', email_confirmed_at: '2026-01-01T00:00:00Z',
    }), { status: 200 }));
    provider = providerFixture();
    jest.mocked(createReadProvider).mockReset().mockReturnValue(provider);
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(ApplicationUserService).useValue({ provision })
      .overrideProvider(RateLimitStore).useValue(rates).compile();
    const jwk = { ...await exportJWK(keys.publicKey), kid: 'fixture', alg: 'RS256' };
    Object.assign(module.get(SupabaseJwtService), { jwks: createLocalJWKSet({ keys: [jwk] }) });
  });

  afterEach(() => {
    // No lifecycle hooks were started; do not invoke Prisma destruction hooks.
    jest.restoreAllMocks();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  function grant(permission = 'integration.view', company: string | null = null, project: string | null = null, role = 'SYSTEM_ADMIN') {
    assignments.push({ permission, company_id: company, project_id: project, expires_at: null,
      role: { code: role, company_id: null }, project: project ? { company_id: company ?? 'company-a' } : null });
  }

  function request(admin: boolean, authorization?: string) {
    const controller = admin ? ThirdwebIntegrationController : Web3Controller;
    const handler = admin ? ThirdwebIntegrationController.prototype.status : Web3Controller.prototype.token;
    const req = { headers: authorization ? { authorization } : {}, params: {}, ip: '127.0.0.1', requestId: 'offline-request' };
    const response = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const ctx = { getClass: () => controller, getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }) } as unknown as ExecutionContext;
    return { ctx, req, response, async run() {
      const reflector = new Reflector();
      await new RateLimitGuard(reflector, rates).canActivate(ctx);
      await new FeatureGuard(reflector, module.get(FeatureService)).canActivate(ctx);
      const guards = reflector.getAllAndOverride<Type<AuthGuard | PermissionGuard>[]>(GUARDS_METADATA, [handler, controller]);
      for (const guard of guards) await module.get(guard).canActivate(ctx);
      const data = admin ? await module.get(ThirdwebIntegrationController).status() : await module.get(Web3Controller).token();
      return lastValueFrom(new ResponseEnvelopeInterceptor().intercept(ctx, { handle: () => of(data) }));
    } };
  }

  it('registers the paths beneath the existing api/v1 prefix and instantiates no provider at module compilation', () => {
    expect(Reflect.getMetadata(PATH_METADATA, Web3Controller)).toBe('web3');
    expect(Reflect.getMetadata(PATH_METADATA, Web3Controller.prototype.token)).toBe('token');
    expect(Reflect.getMetadata(PATH_METADATA, ThirdwebIntegrationController)).toBe('admin/integrations/thirdweb');
    expect(Reflect.getMetadata(PATH_METADATA, ThirdwebIntegrationController.prototype.status)).toBe('/');
    expect(module.get(Web3Service)).toBeDefined();
    expect(createReadProvider).not.toHaveBeenCalled();
  });

  it.each([false, true])('requires bearer auth even when preview is disabled (admin=%s)', async (admin) => {
    const r = request(admin);
    await expect(r.run()).rejects.toMatchObject({ status: 401 });
    expect(provision).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createReadProvider).not.toHaveBeenCalled();
    expect(prisma.featureFlag.findUnique).not.toHaveBeenCalled();
  });

  it.each([false, true])('rejects demo bearer tokens using the real JWT verifier (admin=%s)', async (admin) => {
    await expect(request(admin, 'Bearer rhc-demo-customer').run()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(provision).not.toHaveBeenCalled();
    expect(createReadProvider).not.toHaveBeenCalled();
  });

  it('returns the token DTO in the standard envelope for an authenticated customer', async () => {
    await expect(request(false, `Bearer ${token}`).run()).resolves.toEqual({
      success: true, data: disabledResult, meta: { request_id: 'offline-request' },
    });
    expect(provider.getTokenSnapshot).toHaveBeenCalledTimes(1);
    expect(provider.getReadStatus).not.toHaveBeenCalled();
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
    expect(consume.mock.calls.some(([key]) => key.includes(':subject:user:'))).toBe(true);
    expect(createReadProvider).toHaveBeenCalledWith(process.env, 'connected');
  });

  it.each(['DISABLED', 'LOCKED'])('retains the existing application-user denial for a %s customer', async (account_status) => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1), $queryRaw: jest.fn().mockResolvedValue([]),
      user: { findUnique: jest.fn().mockResolvedValue({ account_status }), update: jest.fn() },
    };
    const database = { $transaction: jest.fn(async (callback) => callback(tx)) } as unknown as PrismaService;
    const applicationUsers = new ApplicationUserService(database);
    provision.mockImplementation((identity) => applicationUsers.provision(identity));
    await expect(request(false, `Bearer ${token}`).run()).rejects.toMatchObject({ status: 401 });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(createReadProvider).not.toHaveBeenCalled();
  });

  it.each(['ACTIVE', 'PENDING'])('retains existing self-service eligibility for a %s customer without adding verification requirements', async (account_status) => {
    const user = { id: 'application-user', supabase_user_id: subject, email: 'fixture@example.test',
      account_status, verification_status: 'PENDING' };
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1), $queryRaw: jest.fn().mockResolvedValue([]),
      user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue(user) },
    };
    const database = { $transaction: jest.fn(async (callback) => callback(tx)) } as unknown as PrismaService;
    const applicationUsers = new ApplicationUserService(database);
    provision.mockImplementation((identity) => applicationUsers.provision(identity));
    await expect(request(false, `Bearer ${token}`).run()).resolves.toMatchObject({ success: true, data: disabledResult });
    expect(tx.user.update).toHaveBeenCalledTimes(1);
  });

  it('returns the real provider disabled result without loading the SDK or making provider traffic', async () => {
    const actual = jest.requireActual<{ createReadProvider: typeof createReadProvider }>('@rhc/web3');
    jest.mocked(createReadProvider).mockImplementation(actual.createReadProvider);
    await expect(request(false, `Bearer ${token}`).run()).resolves.toEqual({
      success: true, data: disabledResult, meta: { request_id: 'offline-request' },
    });
    // Only the mocked identity lookup is allowed; the disabled read performs no fetch.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`https://auth.example.test/auth/v1/admin/users/${subject}`, expect.any(Object));
  });

  it('denies a customer admin status with the normal forbidden envelope, not a disabled-preview response', async () => {
    grant('integration.view', null, null, 'CUSTOMER');
    const r = request(true, `Bearer ${token}`);
    try { await r.run(); throw new Error('Expected denial'); } catch (error) {
      expect(error).toMatchObject({ status: 403 });
      new ApiExceptionFilter().catch(error, r.ctx);
    }
    expect(r.response.status).toHaveBeenCalledWith(403);
    expect(r.response.json).toHaveBeenCalledWith({ success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied' }, meta: { request_id: 'offline-request' } });
    expect(createReadProvider).not.toHaveBeenCalled();
  });

  it.each(['company.view', 'integration.manage', 'integration.*'])('does not substitute %s for integration.view', async (permission) => {
    grant(permission);
    await expect(request(true, `Bearer ${token}`).run()).rejects.toMatchObject({ status: 403 });
    expect(prisma.userRole.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      role: expect.objectContaining({ role_permissions: { some: { permission: { code: 'integration.view' } } } }),
    }) }));
    expect(createReadProvider).not.toHaveBeenCalled();
  });

  it.each([['company-a', null], ['company-a', 'project-a']])('does not elevate scoped integration.view (%s, %s) to global status access', async (company, project) => {
    grant('integration.view', company, project);
    await expect(request(true, `Bearer ${token}`).run()).rejects.toMatchObject({ status: 403 });
    expect(createReadProvider).not.toHaveBeenCalled();
  });

  it('denies an expired grant and a tenant-owned role with a null assignment', async () => {
    grant(); assignments[0].expires_at = new Date(0);
    await expect(request(true, `Bearer ${token}`).run()).rejects.toMatchObject({ status: 403 });
    assignments[0].expires_at = null; assignments[0].role.company_id = 'company-a';
    await expect(request(true, `Bearer ${token}`).run()).rejects.toMatchObject({ status: 403 });
    expect(createReadProvider).not.toHaveBeenCalled();
  });

  it('returns configuration-only status for global integration.view and reuses the lazy provider', async () => {
    grant();
    for (let i = 0; i < 2; i += 1) {
      await expect(request(true, `Bearer ${token}`).run()).resolves.toEqual({ success: true,
        data: disabledResult, meta: { request_id: 'offline-request' } });
    }
    expect(createReadProvider).toHaveBeenCalledTimes(1);
    expect(provider.getReadStatus).toHaveBeenCalledTimes(2);
    expect(provider.getTokenSnapshot).not.toHaveBeenCalled();
  });

  it('preserves fail-closed rate limiting before provider creation', async () => {
    consume.mockResolvedValue({ count: 301, retryAfter: 60 });
    await expect(request(false, `Bearer ${token}`).run()).rejects.toMatchObject({ status: 429 });
    expect(createReadProvider).not.toHaveBeenCalled();
  });

  it('keeps upstream exception details out of the API error envelope', async () => {
    grant(); provider.getReadStatus.mockRejectedValue(new Error('private-provider-diagnostic'));
    const r = request(true, `Bearer ${token}`);
    try { await r.run(); throw new Error('Expected failure'); } catch (error) {
      new ApiExceptionFilter().catch(error, r.ctx);
    }
    expect(r.response.status).toHaveBeenCalledWith(500);
    expect(r.response.json).toHaveBeenCalledWith({ success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, meta: { request_id: 'offline-request' } });
  });
});
