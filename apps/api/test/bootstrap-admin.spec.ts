import { Prisma, PrismaClient } from '@prisma/client';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { bootstrapAdmin, BootstrapOptions, parseOptions } from '../scripts/bootstrap-admin';

const ids = {
  user: '10000000-0000-4000-8000-000000000001', subject: '10000000-0000-4000-8000-000000000002',
  other: '10000000-0000-4000-8000-000000000003', otherSubject: '10000000-0000-4000-8000-000000000004',
  role: '20000000-0000-4000-8000-000000000001', otherRole: '20000000-0000-4000-8000-000000000002',
  company: '30000000-0000-4000-8000-000000000001', project: '40000000-0000-4000-8000-000000000001',
};
const requiredPermissions = ['role.manage', 'user.manage', 'integration.manage', 'feature_flag.manage'];
const anotherHolderError = 'Another user already holds the global SUPER_ADMIN grant; manual review is required';

describe('administrator bootstrap (loopback Auth; mocked transactions, no live database)', () => {
  const options: BootstrapOptions = { 'supabase-user-id': ids.subject, 'confirm-email': 'admin@example.test', 'confirm-database-host': 'db.example.test', apply: false };
  const apply: BootstrapOptions = { ...options, apply: true, 'confirm-grant': 'GRANT_SUPER_ADMIN' };
  const databaseUrl = 'postgresql://test:test@db.example.test:5432/rhc';
  const roleQuery = { where: { code: 'SUPER_ADMIN', company_id: null, is_system: true }, include: { role_permissions: { include: { permission: true } } } };
  const modes = [{ mode: 'dry-run', bootstrapOptions: options }, { mode: 'apply', bootstrapOptions: apply }];
  let server: Server;
  let previous: Record<string, string | undefined>;
  let identity: any;
  let identityResponses: Map<string, any>;
  let responseStatus: number;
  let received: Array<{ path?: string; authorization?: string }>;
  beforeEach(async () => {
    identity = { id: ids.subject, email: options['confirm-email'], email_confirmed_at: '2026-01-01T00:00:00Z' };
    responseStatus = 200; received = []; identityResponses = new Map();
    server = createServer((req, res) => {
      received.push({ path: req.url, authorization: req.headers.authorization });
      res.statusCode = responseStatus;
      res.setHeader('Content-Type', 'application/json');
      if (responseStatus === 302) res.setHeader('Location', '/redirect-must-not-be-followed');
      res.end(JSON.stringify(identityResponses.get(req.url ?? '') ?? identity));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    previous = Object.fromEntries(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NODE_ENV', 'USE_MOCK_DATA'].map((key) => [key, process.env[key]]));
    Object.assign(process.env, { SUPABASE_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, SUPABASE_SECRET_KEY: 'test-only-secret', NODE_ENV: 'test', USE_MOCK_DATA: 'false' });
  });
  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  });

  function grant(userId = ids.user, overrides: Record<string, unknown> = {}) {
    return { id: 'grant', role_id: ids.role, user_id: userId, company_id: null, project_id: null, expires_at: null, ...overrides };
  }

  // Honor equality predicates and pagination instead of returning every fixture row.
  function findRows(rows: any[], { where = {}, skip = 0, take }: any) {
    const matches = rows.filter((row) => Object.entries(where).every(([key, value]) => value === undefined || row[key] === value));
    return matches.slice(skip, take === undefined ? undefined : skip + take);
  }

  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => { resolve = done; });
    return { promise, resolve };
  }

  function expectSerializable(transaction: jest.Mock, attempts = 1) {
    expect(transaction).toHaveBeenCalledTimes(attempts);
    for (const call of transaction.mock.calls) expect(call).toEqual([expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }]);
  }

  function expectAdvisoryLock(tx: any) {
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const [sql, ...parameters] = tx.$executeRaw.mock.calls[0];
    expect(sql.join('')).toBe('SELECT pg_advisory_xact_lock(734821906)');
    expect(parameters).toEqual([]);
  }

  function fixture(shared?: { users: any[]; grants: any[] }) {
    const user: any = shared?.users[0] ?? { id: ids.user, supabase_user_id: ids.subject, email: options['confirm-email'], account_status: 'ACTIVE', verification_status: 'REJECTED', auth_email_confirmed_at: null, profile: { id: ids.user, account_status: 'PENDING', verification_status: 'VERIFIED' } };
    const users: any[] = shared?.users ?? [user];
    const grants: any[] = shared?.grants ?? [];
    const roles: any[] = [{ id: ids.role, code: 'SUPER_ADMIN', company_id: null, is_system: true, role_permissions: requiredPermissions.map((code) => ({ permission: { code } })) }];
    const tx: any = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: {
        findUnique: jest.fn(async ({ where }: any) => users.find((value) => where.id ? value.id === where.id : value.supabase_user_id === where.supabase_user_id) ?? null),
        findMany: jest.fn(async ({ where }: any) => users.filter((value) => value.email.toLowerCase() === where.email.equals)),
        create: jest.fn(async ({ data }: any) => { const created = { ...data, id: ids.user, profile: { id: ids.user, ...data.profile.create } }; users.push(created); return created; }),
        update: jest.fn(async ({ where, data }: any) => { const existing = users.find((value) => value.id === where.id); Object.assign(existing, data); return existing; }),
      },
      userProfile: { create: jest.fn(async ({ data }: any) => { const profile = { id: ids.user, ...data }; users.find((value) => value.id === data.user_id).profile = profile; return profile; }) },
      role: { findMany: jest.fn(async (query: any) => findRows(roles, query)) },
      userRole: {
        findMany: jest.fn(async (query: any) => findRows(grants, query)),
        create: jest.fn(async ({ data }: any) => { const created = grant(data.user_id, { id: `grant-${grants.length + 1}`, ...data }); grants.push(created); return created; }),
      },
      auditLog: { create: jest.fn() },
    };
    const transaction = jest.fn(async (callback: (client: typeof tx) => Promise<unknown>, _options?: unknown) => callback(tx));
    const prisma = { $transaction: transaction } as unknown as PrismaClient;
    const expectNoWrites = () => { for (const call of [tx.user.create, tx.user.update, tx.userProfile.create, tx.userRole.create, tx.auditLog.create]) expect(call).not.toHaveBeenCalled(); };
    const expectGrantReads = (attempts = 1) => {
      expect(tx.role.findMany).toHaveBeenCalledTimes(attempts);
      for (const call of tx.role.findMany.mock.calls) expect(call).toEqual([roleQuery]);
      expect(tx.userRole.findMany).toHaveBeenCalledTimes(attempts);
      for (const call of tx.userRole.findMany.mock.calls) expect(call).toEqual([{ where: { role_id: ids.role } }]);
    };
    return { user, users, grants, roles, tx, transaction, prisma, expectNoWrites, expectGrantReads };
  }

  function addOtherUser(f: ReturnType<typeof fixture>) {
    const other = { ...f.user, id: ids.other, supabase_user_id: ids.otherSubject, email: 'other-admin@example.test', profile: { ...f.user.profile, id: ids.other } };
    f.users.push(other);
    return other;
  }

  it('requires explicit apply confirmation, with user-id optional and unknown arguments rejected', () => {
    const args = ['--supabase-user-id', ids.subject, '--confirm-email', options['confirm-email'], '--confirm-database-host', options['confirm-database-host']];
    expect(parseOptions(args)).toEqual(options);
    expect(() => parseOptions([...args, '--apply'])).toThrow();
    expect(() => parseOptions([...args, '--unknown', 'x'])).toThrow();
    expect(() => parseOptions([...args, '--supabase-user-id', ids.subject])).toThrow();
    expect(parseOptions([...args, '--apply', '--confirm-grant', 'GRANT_SUPER_ADMIN']).apply).toBe(true);
  });

  it('rejects missing confirmation and host mismatches before any remote or database call', async () => {
    const { prisma } = fixture();
    await expect(bootstrapAdmin(prisma, { ...options, apply: true }, databaseUrl)).rejects.toThrow('Explicit grant confirmation');
    await expect(bootstrapAdmin(prisma, options, 'postgresql://test:test@other.example.test/rhc')).rejects.toThrow('Database host');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(received).toEqual([]);
  });

  it('dry-runs without writes, then grants an existing user with no assignments via loopback Auth', async () => {
    const f = fixture();
    await expect(bootstrapAdmin(f.prisma, options, databaseUrl)).resolves.toEqual({ status: 'dry_run', operation: 'existing_user', would_grant: 'SUPER_ADMIN', user_id: ids.user });
    expect(received).toEqual([{ path: `/auth/v1/admin/users/${ids.subject}`, authorization: 'Bearer test-only-secret' }]);
    f.expectNoWrites();
    f.expectGrantReads();
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).resolves.toEqual({ status: 'granted', user_id: ids.user });
    expect(f.tx.userRole.create).toHaveBeenCalledWith({ data: { user_id: ids.user, role_id: ids.role } });
    expect(f.grants).toEqual([grant(ids.user, { id: 'grant-1' })]);
    expect(f.user.verification_status).toBe('REJECTED');
    expect(f.user.profile).toEqual({ id: ids.user, account_status: 'PENDING', verification_status: 'VERIFIED' });
    f.expectGrantReads(2);
  });

  it.each([
    { id: ids.other }, { email: 'other@example.test' }, { email_confirmed_at: null, user_metadata: { email_confirmed_at: '2026-01-01T00:00:00Z' } },
    { email_confirmed_at: 'not-a-date' }, { email_confirmed_at: '2999-01-01T00:00:00Z' }, { is_anonymous: true }, { banned_until: '2999-01-01T00:00:00Z' }, { deleted_at: '2026-01-01T00:00:00Z' },
  ])('refuses invalid or ineligible live identity %j, regardless of local business verification', async (patch) => {
    Object.assign(identity, patch);
    const f = fixture(); f.user.verification_status = 'VERIFIED'; f.user.auth_email_confirmed_at = new Date();
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).rejects.toThrow('Live Supabase identity verification failed');
    expect(f.prisma.$transaction).not.toHaveBeenCalled(); f.expectNoWrites();
  });

  it.each([401, 404, 503, 302])('fails closed on HTTP %s, never following redirects with the secret', async (status) => {
    responseStatus = status;
    const f = fixture();
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).rejects.toThrow('Live Supabase identity verification failed');
    expect(received).toHaveLength(1); f.expectNoWrites();
  });

  it('creates an ACTIVE/PENDING user and profile only on apply, without upgrading business verification', async () => {
    const f = fixture(); f.users.length = 0;
    await expect(bootstrapAdmin(f.prisma, options, databaseUrl)).resolves.toEqual({ status: 'dry_run', operation: 'create_user', would_grant: 'SUPER_ADMIN' });
    f.expectNoWrites();
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).resolves.toEqual({ status: 'granted', user_id: ids.user });
    expect(f.tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: { email: identity.email, supabase_user_id: ids.subject, auth_email_confirmed_at: new Date(identity.email_confirmed_at), account_status: 'ACTIVE', verification_status: 'PENDING', profile: { create: { email: identity.email, account_status: 'ACTIVE', verification_status: 'PENDING' } } } }));
    expect(f.tx.userRole.create).toHaveBeenCalledTimes(1);
    expect(f.tx.auditLog.create.mock.calls.map(([arg]: any) => arg.data.action)).toEqual(['admin.bootstrap.user_create', 'admin.bootstrap']);
    expect(f.grants).toEqual([grant(ids.user, { id: 'grant-1' })]);
    f.expectGrantReads(2);
  });

  it('never auto-links by email; explicit matching user-id links an unlinked user', async () => {
    const f = fixture(); f.user.supabase_user_id = null;
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).rejects.toThrow('Email collision'); f.expectNoWrites();
    await expect(bootstrapAdmin(f.prisma, { ...options, 'user-id': ids.user }, databaseUrl)).resolves.toEqual({ status: 'dry_run', operation: 'link_user', would_grant: 'SUPER_ADMIN', user_id: ids.user }); f.expectNoWrites();
    await expect(bootstrapAdmin(f.prisma, { ...apply, 'user-id': ids.user }, databaseUrl)).resolves.toEqual({ status: 'granted', user_id: ids.user });
    expect(f.tx.user.update.mock.calls[0][0]).toMatchObject({ where: { id: ids.user, AND: [{ supabase_user_id: null }] }, data: { supabase_user_id: ids.subject, auth_email_confirmed_at: new Date(identity.email_confirmed_at) } });
    expect(f.user.verification_status).toBe('REJECTED');
    expect(f.user.profile).toEqual({ id: ids.user, account_status: 'PENDING', verification_status: 'VERIFIED' });
    expect(f.tx.auditLog.create.mock.calls.map(([arg]: any) => arg.data.action)).toEqual(['admin.bootstrap.user_link', 'admin.bootstrap']);
    expect(f.grants).toEqual([grant(ids.user, { id: 'grant-1' })]);
    f.expectGrantReads(2);
  });

  it('refuses linking a row bound to another subject, even with explicit user-id and matching email', async () => {
    const f = fixture(); f.user.supabase_user_id = ids.other;
    await expect(bootstrapAdmin(f.prisma, { ...apply, 'user-id': ids.user }, databaseUrl)).rejects.toThrow('Application identity mismatch'); f.expectNoWrites();
  });

  it('refuses a different explicit user when the subject already has an application user', async () => {
    const f = fixture(); f.users.push({ ...f.user, id: ids.other, supabase_user_id: null });
    await expect(bootstrapAdmin(f.prisma, { ...apply, 'user-id': ids.other }, databaseUrl)).rejects.toThrow('already belongs'); f.expectNoWrites();
  });

  it.each(['DISABLED', 'LOCKED'])('never reactivates an existing %s account', async (status) => {
    const f = fixture(); f.user.account_status = status;
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).rejects.toThrow('manual review'); f.expectNoWrites();
  });

  it('preserves pending account and rejected business state when repairing a missing profile', async () => {
    const f = fixture(); f.user.account_status = 'PENDING'; f.user.profile = null;
    await bootstrapAdmin(f.prisma, apply, databaseUrl);
    expect(f.tx.user.update.mock.calls[0][0].data).toEqual({ auth_email_confirmed_at: new Date(identity.email_confirmed_at) });
    expect(f.tx.userProfile.create).toHaveBeenCalledWith({ data: { user_id: ids.user, email: identity.email, account_status: 'PENDING', verification_status: 'REJECTED' } });
    expect(f.user.account_status).toBe('PENDING');
  });

  it('repeated apply re-verifies Auth without duplicating the grant or leaking identity data into audits', async () => {
    const f = fixture();
    await bootstrapAdmin(f.prisma, apply, databaseUrl);
    const auditCount = f.tx.auditLog.create.mock.calls.length;
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).resolves.toEqual({ status: 'already_granted', user_id: ids.user });
    expect(f.tx.auditLog.create).toHaveBeenCalledTimes(auditCount);
    expect(f.tx.userRole.create).toHaveBeenCalledTimes(1);
    expect(received).toHaveLength(2);
    expect(JSON.stringify(f.tx.auditLog.create.mock.calls)).not.toMatch(/test-only-secret|admin@example/);
    expect(f.tx.user.update).toHaveBeenCalledTimes(1);
    expect(f.grants).toEqual([grant(ids.user, { id: 'grant-1' })]);
    f.expectGrantReads(2);
  });

  describe.each(modes)('$mode assignment and role checks', ({ bootstrapOptions }) => {
    it('is idempotent for the sole non-expiring global holder', async () => {
      const f = fixture();
      f.user.auth_email_confirmed_at = new Date(identity.email_confirmed_at);
      f.grants.push(grant());
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).resolves.toEqual(bootstrapOptions.apply
        ? { status: 'already_granted', user_id: ids.user }
        : { status: 'dry_run', operation: 'existing_user', would_grant: null, user_id: ids.user });
      expect(received).toEqual([{ path: `/auth/v1/admin/users/${ids.subject}`, authorization: 'Bearer test-only-secret' }]);
      f.expectNoWrites();
      f.expectGrantReads();
    });

    it.each(['existing', 'new', 'unlinked'])('refuses another holder before writing for an %s nominee', async (nominee) => {
      const f = fixture();
      if (nominee === 'new') f.users.length = 0;
      if (nominee === 'unlinked') f.user.supabase_user_id = null;
      addOtherUser(f);
      f.grants.push(grant(ids.other));
      const selected = nominee === 'unlinked' ? { ...bootstrapOptions, 'user-id': ids.user } : bootstrapOptions;
      await expect(bootstrapAdmin(f.prisma, selected, databaseUrl)).rejects.toThrow(anotherHolderError);
      f.expectNoWrites();
      f.expectGrantReads();
      expect(f.grants).toEqual([grant(ids.other)]);
    });

    it.each([false, true])('rejects two distinct global holders, with selected holder last=%s', async (reverse) => {
      const f = fixture();
      addOtherUser(f);
      const assignments = [grant(), grant(ids.other, { id: 'grant-2' })];
      f.grants.push(...(reverse ? assignments.reverse() : assignments));
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).rejects.toThrow('Multiple global SUPER_ADMIN users require manual review');
      f.expectNoWrites();
      f.expectGrantReads();
    });

    it.each([
      { name: 'selected holder', holders: [ids.user, ids.user] },
      { name: 'another holder', holders: [ids.other, ids.other] },
      { name: 'duplicate among distinct holders', holders: [ids.user, ids.other, ids.other] },
    ])('rejects duplicate rows for $name', async ({ holders }) => {
      const f = fixture();
      addOtherUser(f);
      f.grants.push(...holders.map((holder, index) => grant(holder, { id: `grant-${index + 1}` })));
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).rejects.toThrow('Duplicate grants require manual review');
      f.expectNoWrites();
      f.expectGrantReads();
    });

    it.each([
      { name: 'expired', expires_at: new Date('2000-01-01T00:00:00Z') },
      { name: 'future', expires_at: new Date('2999-01-01T00:00:00Z') },
      { name: 'invalid Date', expires_at: new Date(NaN) },
      { name: 'malformed string', expires_at: 'not-a-date' },
      { name: 'missing', expires_at: undefined },
      { name: 'empty string', expires_at: '' },
      { name: 'zero', expires_at: 0 },
      { name: 'false', expires_at: false },
    ])('rejects $name expiry rather than treating it as a permanent grant', async ({ expires_at }) => {
      const f = fixture();
      f.grants.push(grant(ids.user, { expires_at }));
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).rejects.toThrow('An expiring grant requires manual review');
      f.expectNoWrites();
      f.expectGrantReads();
    });

    it.each([
      { name: 'company only', company_id: ids.company, project_id: null },
      { name: 'project only', company_id: null, project_id: ids.project },
      { name: 'company and project', company_id: ids.company, project_id: ids.project },
      { name: 'missing company scope', company_id: undefined, project_id: null },
      { name: 'missing project scope', company_id: null, project_id: undefined },
    ])('rejects $name assignments even when they belong to another user', async ({ company_id, project_id }) => {
      const f = fixture();
      addOtherUser(f);
      f.grants.push(grant(ids.other, { company_id, project_id }));
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).rejects.toThrow('Scoped SUPER_ADMIN grants require manual review');
      f.expectNoWrites();
      f.expectGrantReads();
    });

    it('does not hide a scoped assignment behind the selected user\'s valid global grant', async () => {
      const f = fixture();
      addOtherUser(f);
      f.grants.push(grant(), grant(ids.other, { id: 'grant-2', project_id: ids.project }));
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).rejects.toThrow('Scoped SUPER_ADMIN grants require manual review');
      f.expectNoWrites();
      f.expectGrantReads();
    });

    it('ignores assignments to other roles', async () => {
      const f = fixture();
      addOtherUser(f);
      const unrelated = grant(ids.other, { role_id: ids.otherRole, company_id: ids.company, expires_at: new Date(0) });
      f.grants.push(unrelated);
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).resolves.toEqual(bootstrapOptions.apply
        ? { status: 'granted', user_id: ids.user }
        : { status: 'dry_run', operation: 'existing_user', would_grant: 'SUPER_ADMIN', user_id: ids.user });
      if (!bootstrapOptions.apply) f.expectNoWrites();
      expect(f.grants[0]).toEqual(unrelated);
      expect(f.grants).toHaveLength(bootstrapOptions.apply ? 2 : 1);
      f.expectGrantReads();
    });

    it.each(['missing', 'multiple', 'non-system', 'company-scoped', 'wrong code'])('rejects %s SUPER_ADMIN role definitions before any writes', async (definition) => {
      const f = fixture();
      if (definition === 'missing') f.roles.length = 0;
      if (definition === 'multiple') f.roles.push({ ...f.roles[0], id: ids.otherRole });
      if (definition === 'non-system') f.roles[0].is_system = false;
      if (definition === 'company-scoped') f.roles[0].company_id = ids.company;
      if (definition === 'wrong code') f.roles[0].code = 'COMPANY_ADMIN';
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).rejects.toThrow('Exactly one preconfigured SUPER_ADMIN role with required permissions is required');
      expect(f.tx.role.findMany).toHaveBeenCalledWith(roleQuery);
      expect(f.tx.userRole.findMany).not.toHaveBeenCalled();
      f.expectNoWrites();
    });

    it.each(requiredPermissions)('rejects a role missing %s before any writes', async (missing) => {
      const f = fixture();
      f.roles[0].role_permissions = f.roles[0].role_permissions.filter(({ permission }: any) => permission.code !== missing);
      await expect(bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl)).rejects.toThrow('Exactly one preconfigured SUPER_ADMIN role with required permissions is required');
      expect(f.tx.role.findMany).toHaveBeenCalledWith(roleQuery);
      expect(f.tx.userRole.findMany).not.toHaveBeenCalled();
      f.expectNoWrites();
    });
  });

  it.each(modes)('awaits the advisory lock before inspecting grants in a Serializable $mode transaction', async ({ bootstrapOptions }) => {
    const f = fixture();
    const entered = deferred();
    const release = deferred();
    f.tx.$executeRaw.mockImplementation(async () => { entered.resolve(); await release.promise; return 1; });
    const pending = bootstrapAdmin(f.prisma, bootstrapOptions, databaseUrl);
    try {
      await Promise.race([entered.promise, pending]);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expectSerializable(f.transaction);
      expectAdvisoryLock(f.tx);
      expect(f.tx.role.findMany).not.toHaveBeenCalled();
      expect(f.tx.userRole.findMany).not.toHaveBeenCalled();
      f.expectNoWrites();
    } finally {
      release.resolve();
      await pending;
    }
    f.expectGrantReads();
    await expect(pending).resolves.toMatchObject({ status: bootstrapOptions.apply ? 'granted' : 'dry_run' });
  });

  it('allows only one of two independent nominees through a controlled serialized mock lock', async () => {
    const first = fixture();
    const other = addOtherUser(first);
    const second = fixture(first);
    const secondOptions = { ...apply, 'supabase-user-id': ids.otherSubject, 'confirm-email': other.email };
    identityResponses.set(`/auth/v1/admin/users/${ids.otherSubject}`, { ...identity, id: ids.otherSubject, email: other.email });
    const firstEntered = deferred();
    const secondEntered = deferred();
    const releaseFirst = deferred();
    const firstFinished = deferred();
    first.tx.$executeRaw.mockImplementation(async () => { firstEntered.resolve(); await releaseFirst.promise; return 1; });
    second.tx.$executeRaw.mockImplementation(async () => { secondEntered.resolve(); await firstFinished.promise; return 1; });
    // This gate models transaction completion, not PostgreSQL locking or snapshot isolation.
    first.transaction.mockImplementation(async (callback) => {
      try { return await callback(first.tx); } finally { firstFinished.resolve(); }
    });
    const outcomes = Promise.allSettled([
      bootstrapAdmin(first.prisma, apply, databaseUrl),
      bootstrapAdmin(second.prisma, secondOptions, databaseUrl),
    ]);
    try {
      await Promise.race([Promise.all([firstEntered.promise, secondEntered.promise]), outcomes]);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expectAdvisoryLock(first.tx);
      expectAdvisoryLock(second.tx);
      expect(first.tx.userRole.findMany).not.toHaveBeenCalled();
      expect(second.tx.userRole.findMany).not.toHaveBeenCalled();
      first.expectNoWrites();
      second.expectNoWrites();
    } finally {
      releaseFirst.resolve();
      await outcomes;
    }
    expect(await outcomes).toEqual([
      { status: 'fulfilled', value: { status: 'granted', user_id: ids.user } },
      { status: 'rejected', reason: expect.objectContaining({ message: anotherHolderError }) },
    ]);
    expectSerializable(first.transaction);
    expectSerializable(second.transaction);
    first.expectGrantReads();
    second.expectGrantReads();
    expect(first.tx.userRole.create).toHaveBeenCalledTimes(1);
    second.expectNoWrites();
    expect(first.grants).toEqual([grant(ids.user, { id: 'grant-1' })]);
    expect(first.tx.userRole.create.mock.invocationCallOrder[0]).toBeLessThan(second.tx.userRole.findMany.mock.invocationCallOrder[0]);
    expect(received).toHaveLength(2);
    expect(received.map(({ path }) => path)).toEqual(expect.arrayContaining([`/auth/v1/admin/users/${ids.subject}`, `/auth/v1/admin/users/${ids.otherSubject}`]));
  });

  it.each(['P2034', 'P2002'])('refreshes all assignments after a mocked %s conflict and refuses the losing nominee', async (code) => {
    const stale = fixture();
    const committed = fixture();
    addOtherUser(committed);
    committed.grants.push(grant(ids.other));
    const conflict = new Prisma.PrismaClientKnownRequestError('Simulated transaction conflict', { code, clientVersion: 'test' });
    // Discard the failed attempt's private state; the next callback sees the winner's committed snapshot.
    stale.transaction.mockImplementationOnce(async (callback) => { await callback(stale.tx); throw conflict; });
    stale.transaction.mockImplementationOnce(async (callback) => callback(committed.tx));
    await expect(bootstrapAdmin(stale.prisma, apply, databaseUrl)).rejects.toThrow(anotherHolderError);
    expectSerializable(stale.transaction, 2);
    expectAdvisoryLock(stale.tx);
    expectAdvisoryLock(committed.tx);
    stale.expectGrantReads();
    committed.expectGrantReads();
    await expect(stale.tx.userRole.findMany.mock.results[0].value).resolves.toEqual([]);
    await expect(committed.tx.userRole.findMany.mock.results[0].value).resolves.toEqual([grant(ids.other)]);
    expect(stale.tx.userRole.create).toHaveBeenCalledTimes(1);
    expect(stale.tx.user.findUnique).toHaveBeenCalledTimes(1);
    expect(committed.tx.user.findUnique).toHaveBeenCalledTimes(1);
    committed.expectNoWrites();
    expect(committed.grants).toEqual([grant(ids.other)]);
    expect(committed.user.auth_email_confirmed_at).toBeNull();
  });
});
