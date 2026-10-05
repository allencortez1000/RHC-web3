import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, PropertyStatus, type Property, type PropertyStatusHistory } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { exportJWK, generateKeyPair, SignJWT, JWTPayload } from 'jose';
import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/platform/prisma.service';
import { RateLimitStore } from '../src/modules/security/rate-limit.guard';
import { RhcIdService } from '../src/modules/identity/rhc-id.service';
import { StructuredLogger, type StructuredLogEntry } from '../src/platform/structured-logger';
import { ConsentPolicyService, type PublishedConsentPolicy } from '../src/modules/security/consent-policy.service';

export const SYNTHETIC_CONSENT_POLICIES: readonly PublishedConsentPolicy[] = [
  { consent_type: 'PRIVACY_POLICY', version: '2026-09.v1', publication_reference: 'synthetic-test/privacy-2026-09' },
  { consent_type: 'TERMS', version: '2026-09.v1', publication_reference: 'synthetic-test/terms-2026-09' },
  { consent_type: 'MARKETING', version: '2026-09.v1', publication_reference: 'synthetic-test/marketing-2026-09' },
  { consent_type: 'DATA_SHARING', version: '2026-09.v1', publication_reference: 'synthetic-test/data-sharing-2026-09' },
  { consent_type: 'COMPANY_SERVICE', version: '2026-09.v1', publication_reference: 'synthetic-test/company-service-2026-09' },
];

const lockedFeatureFixtures = [
  'ENABLE_REWARDS',
  'ENABLE_WALLET',
  'ENABLE_MARKETPLACE',
  'ENABLE_BLOCKCHAIN',
  'ENABLE_EXTERNAL_WALLET',
  'ENABLE_TOKEN',
  'ENABLE_TOKEN_TRANSFER',
  'ENABLE_TOKEN_SALE',
  'ENABLE_CRYPTO_PAYMENT',
  'ENABLE_STAKING',
] as const;
const lockedFeatureFixtureSet = new Set<string>(lockedFeatureFixtures);

export const ids = { user: '10000000-0000-4000-8000-000000000001', subject: '10000000-0000-4000-8000-000000000002', companyA: '20000000-0000-4000-8000-000000000001', companyB: '20000000-0000-4000-8000-000000000002', projectA: '30000000-0000-4000-8000-000000000001', projectB: '30000000-0000-4000-8000-000000000002', propertyA: '40000000-0000-4000-8000-000000000001', propertyB: '40000000-0000-4000-8000-000000000002', flag: '50000000-0000-4000-8000-000000000001' };

function project(record: any, select?: Record<string, any>): any {
  if (record == null) return null;
  if (!select) return { ...record };
  return Object.fromEntries(Object.entries(select).filter(([, value]) => value).map(([key, value]) => [key, value === true ? record[key] : project(record[key], value.select)]));
}
function required<T>(record: T | null | undefined): T {
  if (record == null) throw new Prisma.PrismaClientKnownRequestError('Fixture resource missing', { code: 'P2025', clientVersion: 'test' });
  return record;
}

// Only database/Redis boundaries are replaced. Auth, provisioning, ID issuance,
// guards, controllers, filters and audit/event services execute unmodified.
type FixtureGrant = {
  company_id: string | null;
  project_id: string | null;
  expires_at: Date | null;
  role: {
    company_id: string | null;
    code: string;
    role_permissions: Array<{ permission: { code: string } }>;
  };
  project: { company_id: string } | null;
};

export function databaseFixture() {
  const grants = new Map<string, FixtureGrant[]>();
  const featureKeys = ['ENABLE_RHC_ID', 'ENABLE_PROPERTIES', 'ENABLE_COMPANY_DIRECTORY', 'ENABLE_INTEGRATION_FRAMEWORK', 'ENABLE_REGISTRATION', ...lockedFeatureFixtures];
  const flags = new Map(featureKeys.map((key, index) => [key, { id: index === 0 ? ids.flag : `50000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, key, enabled: !lockedFeatureFixtureSet.has(key), scope: 'GLOBAL' }]));
  const findFlag = (where: any) => where.key ? flags.get(where.key) : [...flags.values()].find((flag) => flag.id === where.id);
  const user = { id: ids.user, email: 'customer@example.test', supabase_user_id: ids.subject, account_status: 'ACTIVE', verification_status: 'PENDING', auth_email_confirmed_at: new Date('2026-01-01') };
  const users = new Map<string, any>([[user.id, user]]);
  const profile = { id: ids.user, user_id: user.id, email: user.email, account_status: 'ACTIVE', verification_status: 'PENDING', first_name: 'Test', last_name: 'Customer', rhc_id: null, rhc_id_issued_at: null };
  const profiles = new Map<string, any>([[user.id, profile]]);
  const sequences = new Map<number, number>();
  const findUser = (where: any) => where.id ? users.get(where.id) : [...users.values()].find((value) => value.supabase_user_id === where.supabase_user_id);
  const userResult = (record: any, args: any) => project(record ? { ...record, ...(args.select?.profile || args.include?.profile ? { profile: profiles.get(record.id) ?? null } : {}) } : null, args.select);
  const findProfile = (where: any) => where.user_id ? profiles.get(where.user_id) : [...profiles.values()].find((value) => where.id ? value.id === where.id : value.rhc_id === where.rhc_id);
  const projects = [{ id: ids.projectA, company_id: ids.companyA }, { id: ids.projectB, company_id: ids.companyB }];
  const properties: Array<Pick<Property, 'id' | 'project_id' | 'property_code' | 'status' | 'floor'> & { project: typeof projects[number] }> = [
    { id: ids.propertyA, project_id: ids.projectA, property_code: 'A-101', status: PropertyStatus.AVAILABLE, floor: null, project: projects[0] },
    { id: ids.propertyB, project_id: ids.projectB, property_code: 'B-101', status: PropertyStatus.AVAILABLE, floor: null, project: projects[1] },
  ];
  const propertyResult = (record: typeof properties[number] | undefined, args: any) => {
    if (!record) return null;
    const { project: relation, ...scalars } = record;
    return project({ ...scalars, ...(args.select?.project || args.include?.project ? { project: relation } : {}) }, args.select);
  };
  const propertyHistory: PropertyStatusHistory[] = [];
  const auditLogs: Array<Prisma.AuditLogUncheckedCreateInput & { id: string }> = [];
  const activityEvents: Array<Prisma.ActivityEventUncheckedCreateInput & { id: string }> = [];
  const prisma: any = {
    mockMode: false,
    userRole: { findMany: jest.fn(async (args) => {
      if (users.get(args.where.user_id)?.account_status !== 'ACTIVE') return [];
      const permission = args.where.role.role_permissions?.some?.permission?.code;
      const assignments = permission ? grants.get(permission) ?? [] : [...grants.values()].flat();
      return assignments.filter((assignment) => assignment.role.code !== 'CUSTOMER' && (!assignment.expires_at || assignment.expires_at > new Date()));
    }) },
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
    featureFlag: {
      findUnique: jest.fn(async ({ where }) => findFlag(where) ?? null),
      findMany: jest.fn(async () => Array.from(flags.values())),
      findUniqueOrThrow: jest.fn(async ({ where }) => required(findFlag(where))),
      update: jest.fn(async ({ where, data, select }) => { const flag = required(findFlag(where)); Object.assign(flag, data); return project(flag, select); }),
    },
    company: { findUnique: jest.fn(async ({ where }) => [ids.companyA, ids.companyB].includes(where.id) ? { id: where.id, api_enabled: true, status: 'ACTIVE' } : null), findUniqueOrThrow: jest.fn(async ({ where }) => ({ id: where.id, api_enabled: true, status: 'ACTIVE' })), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => ({ id: ids.companyA, ...data })), update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data })), count: jest.fn(async () => 0) },
    project: { findUnique: jest.fn(async ({ where }) => projects.find((p) => p.id === where.id) ?? null), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => ({ id: ids.projectA, ...data })), count: jest.fn(async () => 0) },
    property: {
      findUnique: jest.fn(async (args) => propertyResult(properties.find((p) => p.id === args.where.id), args)),
      findUniqueOrThrow: jest.fn(async (args) => propertyResult(required(properties.find((p) => p.id === args.where.id)), args)),
      findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }) => ({ id: ids.propertyA, ...data })),
      update: jest.fn(async ({ where, data, ...args }) => { const property = required(properties.find((p) => p.id === where.id)); Object.assign(property, data); return propertyResult(property, args); }),
      count: jest.fn(async () => 0),
    },
    propertyStatusHistory: { create: jest.fn(async ({ data }: { data: Prisma.PropertyStatusHistoryUncheckedCreateInput }) => {
      const history: PropertyStatusHistory = { id: data.id ?? randomUUID(), property_id: data.property_id, previous_status: data.previous_status ?? null, next_status: data.next_status, reason: data.reason ?? null, actor_user_id: data.actor_user_id ?? null, reservation_id: data.reservation_id ?? null, created_at: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at ?? new Date() };
      propertyHistory.push(history);
      return { ...history };
    }) },
    customerProperty: { findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => ({ id: ids.propertyA, ...data })) },
    // Keep the first synthetic receipt IDs stable for existing shared-fixture consumers.
    auditLog: { create: jest.fn(async ({ data }: { data: Prisma.AuditLogUncheckedCreateInput }) => { const audit = { ...data, id: data.id ?? (auditLogs.length ? `audit-${auditLogs.length + 1}` : 'audit') }; auditLogs.push(audit); return { ...audit }; }), findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    activityEvent: { create: jest.fn(async ({ data }: { data: Prisma.ActivityEventUncheckedCreateInput }) => { const event = { ...data, id: data.id ?? (activityEvents.length ? `event-${activityEvents.length + 1}` : 'event') }; activityEvents.push(event); return { ...event }; }) },
    companyIntegration: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    businessService: { findMany: jest.fn(async () => []) },
    companyApiClient: { findUnique: jest.fn(async () => null), findUniqueOrThrow: jest.fn(), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }) => { const safe = { ...data }; delete safe.credential_ref; return { id: ids.propertyA, status: 'ACTIVE', ...safe }; }), update: jest.fn(async ({ where, data }) => ({ id: where.id, company_id: ids.companyA, ...data })) },
    role: { findMany: jest.fn(async () => []) }, permission: { findMany: jest.fn(async () => []) }, systemSetting: { findMany: jest.fn(async () => []) }, notification: { findMany: jest.fn(async () => []) },
    $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => [{ '?column?': 1 }]),
  };
  prisma.$transaction = jest.fn(async (callback) => {
    // Model rollback for the manual property mutation and all of its evidence writes.
    // This does not simulate PostgreSQL locking, isolation, or concurrent transactions.
    const snapshot = structuredClone({ properties, propertyHistory, auditLogs, activityEvents });
    // Distinct delegates expose accidental root-client writes through mock.contexts,
    // while sharing jest functions keeps per-test failure injection configurable.
    const tx = { ...prisma, property: { ...prisma.property }, propertyStatusHistory: { ...prisma.propertyStatusHistory }, auditLog: { ...prisma.auditLog }, activityEvent: { ...prisma.activityEvent } };
    try {
      return await callback(tx);
    } catch (error) {
      properties.splice(0, properties.length, ...snapshot.properties);
      propertyHistory.splice(0, propertyHistory.length, ...snapshot.propertyHistory);
      auditLogs.splice(0, auditLogs.length, ...snapshot.auditLogs);
      activityEvents.splice(0, activityEvents.length, ...snapshot.activityEvents);
      throw error;
    }
  });
  return { prisma, grants, flags, user, users, profiles, sequences, properties, propertyHistory, auditLogs, activityEvents, grant(permission: string, company: string | null = null, project: string | null = null, role = 'SYSTEM_ADMIN') { grants.set(permission, [{ company_id: company, project_id: project, expires_at: null, role: { company_id: null, code: role, role_permissions: [{ permission: { code: permission } }] }, project: project ? { company_id: company ?? ids.companyA } : null }]); } };
}

export async function createHarness(options: { consentPolicies?: readonly PublishedConsentPolicy[] } = {}) {
  const database = databaseFixture();
  const [rsa, ec] = await Promise.all([generateKeyPair('RS256'), generateKeyPair('ES256')]);
  const jwks = [{ ...await exportJWK(rsa.publicKey), kid: 'test-rsa', alg: 'RS256', use: 'sig' }, { ...await exportJWK(ec.publicKey), kid: 'test-ec', alg: 'ES256', use: 'sig' }];
  const identity: { id: string; email: string; email_confirmed_at: string | null; user_metadata: Record<string, unknown> } = { id: ids.subject, email: database.user.email, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: {} };
  const identityRequests: string[] = [];
  let identityStatus = 200;
  const identityServer: Server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.endsWith('/.well-known/jwks.json')) res.end(JSON.stringify({ keys: jwks }));
    else if (req.url?.includes('/auth/v1/admin/users/')) {
      identityRequests.push(req.url);
      if (identityStatus !== 200) { res.statusCode = identityStatus; res.end('{}'); }
      else if (req.headers.authorization !== 'Bearer test-only-not-a-real-secret' || req.headers.apikey !== 'test-only-not-a-real-secret') { res.statusCode = 401; res.end('{}'); }
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
  const logs: StructuredLogEntry[] = [];
  const logger = new StructuredLogger('debug', (entry) => logs.push(entry));
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(database.prisma).overrideProvider(RateLimitStore).useValue(rates).overrideProvider(StructuredLogger).useValue(logger).overrideProvider(ConsentPolicyService).useValue(new ConsentPolicyService(options.consentPolicies ?? SYNTHETIC_CONSENT_POLICIES)).compile();
  const issuance = { issueForUser: jest.spyOn(module.get(RhcIdService), 'issueForUser') };
  const app: INestApplication = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  const signToken = (claims: JWTPayload = {}, algorithm: 'RS256' | 'ES256' = 'RS256') => new SignJWT({ email: database.user.email, role: 'authenticated', sub: ids.subject, iss: env.JWT_ISSUER, aud: 'authenticated', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, ...claims }).setProtectedHeader({ alg: algorithm, kid: algorithm === 'RS256' ? 'test-rsa' : 'test-ec' }).sign(algorithm === 'RS256' ? rsa.privateKey : ec.privateKey);
  const token = await signToken();
  return { app, token, signToken, identity, identityRequests, setIdentityStatus: (status: number) => { identityStatus = status; }, logs, logger, ...database, rates, counters, issuance,
    async close() {
      await app.close();
      await new Promise<void>((resolve, reject) => identityServer.close((error) => error ? reject(error) : resolve()));
      for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    },
  };
}
export type Harness = Awaited<ReturnType<typeof createHarness>>;
