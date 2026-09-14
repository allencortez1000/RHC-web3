import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { exportJWK, generateKeyPair, SignJWT, JWTPayload } from 'jose';
import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/platform/prisma.service';
import { RateLimitStore } from '../src/modules/security/rate-limit.guard';
import { RhcIdService } from '../src/modules/identity/rhc-id.service';

export const ids = { user: '10000000-0000-4000-8000-000000000001', subject: '10000000-0000-4000-8000-000000000002', companyA: '20000000-0000-4000-8000-000000000001', companyB: '20000000-0000-4000-8000-000000000002', projectA: '30000000-0000-4000-8000-000000000001', projectB: '30000000-0000-4000-8000-000000000002', propertyA: '40000000-0000-4000-8000-000000000001', propertyB: '40000000-0000-4000-8000-000000000002', flag: '50000000-0000-4000-8000-000000000001' };

function project(record: any, select?: Record<string, any>): any {
  if (record == null) return null;
  if (!select) return { ...record };
  return Object.fromEntries(Object.entries(select).filter(([, value]) => value).map(([key, value]) => [key, value === true ? record[key] : project(record[key], value.select)]));
}
function required(record: any) {
  if (!record) throw new Prisma.PrismaClientKnownRequestError('Fixture resource missing', { code: 'P2025', clientVersion: 'test' });
  return record;
}

// Only database/Redis boundaries are replaced. Auth, provisioning, ID issuance,
// guards, controllers, filters and audit/event services execute unmodified.
export function databaseFixture() {
  const grants = new Map<string, Array<{ company_id: string | null; project_id: string | null; expires_at: Date | null; role: { company_id: string | null }; project: { company_id: string } | null }>>();
  const flags = new Map(['ENABLE_RHC_ID', 'ENABLE_PROPERTIES', 'ENABLE_COMPANY_DIRECTORY', 'ENABLE_INTEGRATION_FRAMEWORK', 'ENABLE_REGISTRATION'].map((key) => [key, { id: ids.flag, key, enabled: true, scope: 'GLOBAL' }]));
  const user = { id: ids.user, email: 'customer@example.test', supabase_user_id: ids.subject, account_status: 'ACTIVE', verification_status: 'PENDING', auth_email_confirmed_at: new Date('2026-01-01') };
  const users = new Map<string, any>([[user.id, user]]);
  const profile = { id: ids.user, user_id: user.id, email: user.email, account_status: 'ACTIVE', verification_status: 'PENDING', first_name: 'Test', last_name: 'Customer', rhc_id: null, rhc_id_issued_at: null };
  const profiles = new Map<string, any>([[user.id, profile]]);
  const sequences = new Map<number, number>();
  const findUser = (where: any) => where.id ? users.get(where.id) : [...users.values()].find((value) => value.supabase_user_id === where.supabase_user_id);
  const userResult = (record: any, args: any) => project(record ? { ...record, ...(args.select?.profile || args.include?.profile ? { profile: profiles.get(record.id) ?? null } : {}) } : null, args.select);
  const findProfile = (where: any) => where.user_id ? profiles.get(where.user_id) : [...profiles.values()].find((value) => where.id ? value.id === where.id : value.rhc_id === where.rhc_id);
  const projects = [{ id: ids.projectA, company_id: ids.companyA }, { id: ids.projectB, company_id: ids.companyB }];
  const properties = [{ id: ids.propertyA, project_id: ids.projectA, property_code: 'A-101', status: 'AVAILABLE', project: projects[0] }, { id: ids.propertyB, project_id: ids.projectB, property_code: 'B-101', status: 'AVAILABLE', project: projects[1] }];
  const prisma: any = {
    mockMode: false,
    userRole: { findMany: jest.fn(async (args) => users.get(args.where.user_id)?.account_status === 'ACTIVE' ? grants.get(args.where.role.role_permissions.some.permission.code) ?? [] : []) },
    user: {
      findUnique: jest.fn(async (args) => userResult(findUser(args.where), args)),
      findUniqueOrThrow: jest.fn(async (args) => userResult(required(findUser(args.where)), args)),
      create: jest.fn(async ({ data, ...args }) => {
        const { profile: nested, ...fields } = data;
        if ([...users.values()].some((value) => value.supabase_user_id === fields.supabase_user_id || value.email === fields.email)) throw new Prisma.PrismaClientKnownRequestError('Fixture collision', { code: 'P2002', clientVersion: 'test' });
        const created = { id: ids.user, ...fields }; users.set(created.id, created);
        if (nested?.create) profiles.set(created.id, { id: created.id, user_id: created.id, rhc_id: null, rhc_id_issued_at: null, ...nested.create });
        return userResult(created, args);
      }),
      update: jest.fn(async ({ where, data, ...args }) => {
        const current = required(findUser(where));
        const { profile: nested, ...fields } = data;
        Object.assign(current, fields);
        if (nested?.upsert) {
          const existing = profiles.get(current.id);
          if (existing) Object.assign(existing, nested.upsert.update);
          else profiles.set(current.id, { id: current.id, user_id: current.id, rhc_id: null, rhc_id_issued_at: null, ...nested.upsert.create });
        }
        if (nested?.update) Object.assign(required(profiles.get(current.id)), nested.update);
        return userResult(current, args);
      }),
      findMany: jest.fn(async () => []), findFirstOrThrow: jest.fn(async () => ({ id: ids.user })), count: jest.fn(async () => 0),
    },
    userProfile: {
      findUnique: jest.fn(async (args) => project(findProfile(args.where), args.select)),
      findUniqueOrThrow: jest.fn(async (args) => project(required(findProfile(args.where)), args.select)),
      update: jest.fn(async ({ where, data, select }) => { const current = required(findProfile(where)); Object.assign(current, data); return project(current, select); }),
    },
    rhcIdSequence: { upsert: jest.fn(async ({ where }) => { const value = (sequences.get(where.year) ?? 0) + 1; sequences.set(where.year, value); return { year: where.year, last_value: value }; }) },
    featureFlag: { findUnique: jest.fn(async ({ where }) => flags.get(where.key) ?? null), findMany: jest.fn(async () => Array.from(flags.values())), findUniqueOrThrow: jest.fn(async () => flags.get('ENABLE_PROPERTIES')), update: jest.fn(async ({ data }) => ({ id: ids.flag, ...data })) },
    company: { findUnique: jest.fn(async ({ where }) => [ids.companyA, ids.companyB].includes(where.id) ? { id: where.id, api_enabled: true, status: 'ACTIVE' } : null), findUniqueOrThrow: jest.fn(async ({ where }) => ({ id: where.id, api_enabled: true, status: 'ACTIVE' })), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => ({ id: ids.companyA, ...data })), update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data })), count: jest.fn(async () => 0) },
    project: { findUnique: jest.fn(async ({ where }) => projects.find((p) => p.id === where.id) ?? null), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => ({ id: ids.projectA, ...data })), count: jest.fn(async () => 0) },
    property: { findUnique: jest.fn(async ({ where }) => properties.find((p) => p.id === where.id) ?? null), findUniqueOrThrow: jest.fn(async ({ where }) => properties.find((p) => p.id === where.id)), findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => ({ id: ids.propertyA, ...data })), update: jest.fn(async ({ where, data }) => ({ ...properties.find((p) => p.id === where.id), ...data })), count: jest.fn(async () => 0) },
    customerProperty: { findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => ({ id: ids.propertyA, ...data })) },
    auditLog: { create: jest.fn(async ({ data }) => ({ id: 'audit', ...data })), findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    activityEvent: { create: jest.fn(async ({ data }) => ({ id: 'event', ...data })) },
    companyIntegration: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    businessService: { findMany: jest.fn(async () => []) },
    companyApiClient: { findUnique: jest.fn(async () => null), findUniqueOrThrow: jest.fn(), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => { const safe = { ...data }; delete safe.credential_ref; return { id: ids.propertyA, status: 'ACTIVE', ...safe }; }), update: jest.fn(async ({ where, data }) => ({ id: where.id, company_id: ids.companyA, ...data })) },
    role: { findMany: jest.fn(async () => []) }, permission: { findMany: jest.fn(async () => []) }, systemSetting: { findMany: jest.fn(async () => []) }, notification: { findMany: jest.fn(async () => []) },
    $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => [{ '?column?': 1 }]),
  };
  prisma.$transaction = jest.fn(async (callback) => callback(prisma));
  return { prisma, grants, flags, user, users, profiles, sequences, grant(permission: string, company: string | null = null, project: string | null = null) { grants.set(permission, [{ company_id: company, project_id: project, expires_at: null, role: { company_id: null }, project: project ? { company_id: company ?? ids.companyA } : null }]); } };
}

export async function createHarness() {
  const database = databaseFixture();
  const [rsa, ec] = await Promise.all([generateKeyPair('RS256'), generateKeyPair('ES256')]);
  const jwks = [{ ...await exportJWK(rsa.publicKey), kid: 'test-rsa', alg: 'RS256', use: 'sig' }, { ...await exportJWK(ec.publicKey), kid: 'test-ec', alg: 'ES256', use: 'sig' }];
  const identity: { id: string; email: string; email_confirmed_at: string | null; user_metadata: Record<string, unknown> } = { id: ids.subject, email: database.user.email, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: {} };
  const identityRequests: string[] = [];
  const identityServer: Server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.endsWith('/.well-known/jwks.json')) res.end(JSON.stringify({ keys: jwks }));
    else if (req.url?.includes('/auth/v1/admin/users/')) {
      identityRequests.push(req.url);
      if (req.headers.authorization !== 'Bearer test-only-not-a-real-secret' || req.headers.apikey !== 'test-only-not-a-real-secret') { res.statusCode = 401; res.end('{}'); }
      else res.end(JSON.stringify(identity));
    } else { res.statusCode = 404; res.end('{}'); }
  });
  await new Promise<void>((resolve) => identityServer.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(identityServer.address() as AddressInfo).port}`;
  const env = { NODE_ENV: 'test', USE_MOCK_DATA: 'false', JWT_ISSUER: `${origin}/auth/v1`, JWT_AUDIENCE: 'authenticated', SUPABASE_URL: origin, SUPABASE_JWKS_URL: `${origin}/auth/v1/.well-known/jwks.json`, SUPABASE_SECRET_KEY: 'test-only-not-a-real-secret' };
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  const counters = new Map<string, number>();
  const rates = { consumeAuthenticated: RateLimitStore.prototype.consumeAuthenticated, unavailable: false, healthy: jest.fn(async () => true), consume: jest.fn(async (key: string) => {
    if (rates.unavailable) throw new ServiceUnavailableException();
    const count = (counters.get(key) ?? 0) + 1; counters.set(key, count);
    return { count, retryAfter: 60 };
  }) };
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(database.prisma).overrideProvider(RateLimitStore).useValue(rates).compile();
  const issuance = { issueForUser: jest.spyOn(module.get(RhcIdService), 'issueForUser') };
  const app: INestApplication = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  const signToken = (claims: JWTPayload = {}, algorithm: 'RS256' | 'ES256' = 'RS256') => new SignJWT({ email: database.user.email, role: 'authenticated', sub: ids.subject, iss: env.JWT_ISSUER, aud: 'authenticated', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, ...claims }).setProtectedHeader({ alg: algorithm, kid: algorithm === 'RS256' ? 'test-rsa' : 'test-ec' }).sign(algorithm === 'RS256' ? rsa.privateKey : ec.privateKey);
  const token = await signToken();
  return { app, token, signToken, identity, identityRequests, ...database, rates, counters, issuance,
    async close() {
      await app.close();
      await new Promise<void>((resolve, reject) => identityServer.close((error) => error ? reject(error) : resolve()));
      for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    },
  };
}
export type Harness = Awaited<ReturnType<typeof createHarness>>;
