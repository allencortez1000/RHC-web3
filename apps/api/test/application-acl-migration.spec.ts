import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  APPLICATION_ACL_TABLES,
  assessReachableAuthority,
  collectMigrationLedgerPrivileges,
  collectReachableTablePrivileges,
  collectRoleMemberships,
  helpText,
  parseArgs,
  readOnlyUrl,
  run,
} from '../../../packages/database/prisma/application-acl-preflight';

jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
  PrismaClient: jest.fn(),
}));

const migrationPath = resolve(__dirname, '../../../packages/database/prisma/migrations/202609210001_application_acl_hardening/migration.sql');
const schemaPath = resolve(__dirname, '../../../packages/database/prisma/schema.prisma');
const preflightPath = resolve(__dirname, '../../../packages/database/prisma/application-acl-preflight.ts');
const migration = readFileSync(migrationPath, 'utf8');
const schema = readFileSync(schemaPath, 'utf8');
const preflight = readFileSync(preflightPath, 'utf8');

const expectedTables = [
  'users',
  'rhc_id_sequences',
  'user_profiles',
  'companies',
  'projects',
  'permissions',
  'roles',
  'role_permissions',
  'user_roles',
  'properties',
  'property_status_history',
  'reservations',
  'reservation_events',
  'customer_properties',
  'business_services',
  'company_integrations',
  'company_api_clients',
  'company_events',
  'integration_logs',
  'notifications',
  'consent_records',
  'feature_flags',
  'audit_logs',
  'activity_events',
  'rewards_accounts',
  'rewards_rules',
  'rewards_transactions',
  'rewards_redemptions',
  'system_settings',
] as const;

function sorted(values: readonly string[]) {
  return [...values].sort();
}

function authorityFixture() {
  return {
    roles: [
      { rolname: 'creator_a', rolinherit: true },
      { rolname: 'anon', rolinherit: false },
      { rolname: 'authenticated', rolinherit: false },
    ] as Record<string, unknown>[],
    tables: [{ owner_name: 'creator_a' }],
    memberships: [] as Record<string, unknown>[],
    runtimeRoles: [] as string[],
    reachableTablePrivileges: [] as Record<string, unknown>[],
    reachableColumnPrivileges: [] as Record<string, unknown>[],
    reachableSequencePrivileges: [] as Record<string, unknown>[],
    reachableSchemaPrivileges: [] as Record<string, unknown>[],
    migrationLedgerPrivileges: [] as Record<string, unknown>[],
  };
}

type CapturedQuery = { strings: readonly string[]; values: readonly unknown[] };

function collectorClient(resultFor: (query: { text: string; values: readonly unknown[] }) => Record<string, unknown>[]) {
  const calls: Array<{ text: string; values: readonly unknown[] }> = [];
  const transaction = {
    $queryRaw: jest.fn(async (statement: unknown) => {
      const sql = statement as CapturedQuery;
      const query = { text: sql.strings.join(' '), values: sql.values };
      calls.push(query);
      return resultFor(query);
    }),
  } as unknown as Parameters<typeof collectMigrationLedgerPrivileges>[0];
  return { transaction, calls };
}

function membershipEdge(member_role: string, reachable_role: string, options: Record<string, unknown> = {}) {
  return {
    member_role,
    reachable_role,
    grantor_role: 'grantor_a',
    admin_option: false,
    set_option: false,
    inherit_option: false,
    ...options,
  };
}

describe('preflight transaction safety', () => {
  const directUrl = 'postgresql://inspection:synthetic@db.example.test:5432/postgres?schema=public';
  const requiredArgs = ['--target-host', 'db.example.test', '--target-database', 'postgres', '--creator-role', 'postgres'];
  const safeSettings = {
    transaction_read_only: 'on',
    statement_timeout: '10s',
    lock_timeout: '2s',
    idle_in_transaction_session_timeout: '15s',
  };
  let originalDirectUrl: string | undefined;

  beforeEach(() => {
    originalDirectUrl = process.env.DIRECT_URL;
    process.env.DIRECT_URL = directUrl;
  });

  afterEach(() => {
    if (originalDirectUrl === undefined) delete process.env.DIRECT_URL;
    else process.env.DIRECT_URL = originalDirectUrl;
    jest.mocked(PrismaClient).mockReset();
  });

  function options(extraArgs: string[] = []) {
    const parsed = parseArgs([...requiredArgs, ...extraArgs]);
    if ('help' in parsed) throw new Error('Unexpected help result');
    return parsed;
  }

  function fixture(settings: Record<string, unknown>[] = [safeSettings]) {
    const commands: string[] = [];
    const catalogReached = jest.fn(() => { throw new Error('catalog collection reached'); });
    const sqlText = (statement: unknown) => {
      const strings = Array.isArray(statement) ? statement : (statement as CapturedQuery).strings;
      return strings.join(' ').trim().replace(/\s+/g, ' ');
    };
    const transaction = {
      $executeRaw: jest.fn(async (statement: unknown) => { commands.push(sqlText(statement)); return 0; }),
      $queryRaw: jest.fn(async (statement: unknown) => {
        const sql = sqlText(statement);
        commands.push(sql);
        if (sql.includes('current_database()')) return catalogReached();
        return settings;
      }),
    };
    const client = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(transaction)),
      $disconnect: jest.fn(async () => undefined),
    };
    jest.mocked(PrismaClient).mockImplementation(() => client as unknown as PrismaClient);
    return { commands, catalogReached, transaction, client };
  }

  it('bounds the read-only transaction acquisition and lifetime explicitly', async () => {
    const f = fixture();

    await expect(run(options())).rejects.toThrow('catalog collection reached');

    expect(f.client.$transaction).toHaveBeenCalledTimes(1);
    expect(f.client.$transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 8000, timeout: 30000 });
    expect(PrismaClient).toHaveBeenCalledWith({ datasources: { db: { url: readOnlyUrl(directUrl) } } });
    expect(f.client.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('enforces and verifies all transaction-local controls before collect()', async () => {
    const f = fixture();

    await expect(run(options())).rejects.toThrow('catalog collection reached');

    expect(f.commands.slice(0, 4)).toEqual([
      'SET TRANSACTION READ ONLY',
      "SET LOCAL statement_timeout = '10s'",
      "SET LOCAL lock_timeout = '2s'",
      "SET LOCAL idle_in_transaction_session_timeout = '15s'",
    ]);
    expect(f.commands[4]).toMatch(/^SELECT current_setting\('transaction_read_only'\)/);
    for (const key of Object.keys(safeSettings)) expect(f.commands[4]).toContain(`current_setting('${key}')`);
    expect(f.commands[5]).toMatch(/^SELECT current_database\(\)/);
    expect(f.commands).toHaveLength(6);
    expect(f.catalogReached).toHaveBeenCalledTimes(1);
    expect(f.client.$transaction).toHaveBeenCalledTimes(1);
    expect(f.client.$disconnect).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing verification row', []],
    ['read-write transaction', [{ ...safeSettings, transaction_read_only: 'off' }]],
    ['disabled statement timeout', [{ ...safeSettings, statement_timeout: '0' }]],
    ['wrong lock timeout', [{ ...safeSettings, lock_timeout: '10s' }]],
    ['disabled idle timeout', [{ ...safeSettings, idle_in_transaction_session_timeout: '0' }]],
    ['missing timeout field', [{ transaction_read_only: 'on', statement_timeout: '10s', lock_timeout: '2s' }]],
  ] as Array<[string, Record<string, unknown>[]]>)('stops before collect() with %s', async (_name, settings) => {
    const f = fixture(settings);

    await expect(run(options())).rejects.toThrow('Read-only preflight transaction safety verification failed');

    expect(f.transaction.$executeRaw).toHaveBeenCalledTimes(4);
    expect(f.transaction.$queryRaw).toHaveBeenCalledTimes(1);
    expect(f.catalogReached).not.toHaveBeenCalled();
    expect(f.client.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('does not query safety state or catalogs after an enforcement command fails', async () => {
    const f = fixture();
    f.transaction.$executeRaw.mockRejectedValueOnce(new Error('transaction enforcement rejected'));

    await expect(run(options())).rejects.toThrow('transaction enforcement rejected');

    expect(f.transaction.$queryRaw).not.toHaveBeenCalled();
    expect(f.catalogReached).not.toHaveBeenCalled();
    expect(f.client.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps explicitly confirmed apply mode separate from the read-only budget, enforcement and URL rewriting', async () => {
    const f = fixture();

    await expect(run(options(['--apply-defaults', '--approve-global-defaults']))).rejects.toThrow('catalog collection reached');

    expect(f.transaction.$executeRaw).not.toHaveBeenCalled();
    expect(f.commands).toHaveLength(1);
    expect(f.commands[0]).toMatch(/^SELECT current_database\(\)/);
    expect(f.client.$transaction).toHaveBeenCalledTimes(1);
    expect(f.client.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(PrismaClient).toHaveBeenCalledWith({ datasources: { db: { url: directUrl } } });
    expect(f.client.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('retains both explicit mutation confirmations and defaults to read-only', () => {
    expect(options()).toMatchObject({ applyDefaults: false, approveGlobalDefaults: false });
    expect(() => options(['--apply-defaults'])).toThrow('--apply-defaults requires --approve-global-defaults');
    expect(() => options(['--approve-global-defaults'])).toThrow('--approve-global-defaults requires --apply-defaults');
    expect(options(['--apply-defaults', '--approve-global-defaults'])).toMatchObject({ applyDefaults: true, approveGlobalDefaults: true });
    expect(PrismaClient).not.toHaveBeenCalled();
  });
});

describe('application ACL correction contract', () => {
  const safeStartupOptions = '-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=15000';

  it.each([
    { name: 'absent options', options: [] },
    { name: 'empty options', options: [''] },
    { name: 'existing safety timeouts', options: [safeStartupOptions] },
    { name: 'unsafe inherited options', options: ['-c default_transaction_read_only=off -c statement_timeout=0 -c lock_timeout=0 -c idle_in_transaction_session_timeout=0'] },
    { name: 'duplicate options', options: [safeStartupOptions, '-c default_transaction_read_only=off -c statement_timeout=0'] },
  ])('enforces the complete read-only startup contract with $name', ({ options }) => {
    const original = new URL('postgresql://inspection:synthetic%40password@db.example.test:5432/postgres');
    for (const value of options) original.searchParams.append('options', value);

    const transformed = new URL(readOnlyUrl(original.toString()));

    expect(transformed.searchParams.getAll('options')).toEqual([safeStartupOptions]);
    expect(readOnlyUrl(transformed.toString())).toBe(transformed.toString());
  });

  it('preserves target, credentials, strict TLS trust, and client bounds outside startup options', () => {
    const original = new URL('postgresql://inspection:synthetic%40password@db.example.test:5432/postgres');
    const parameters = {
      schema: 'public',
      sslmode: 'require',
      sslaccept: 'strict',
      sslcert: 'C:/local trust/test-ca.crt',
      connection_limit: '1',
      connect_timeout: '8',
      pool_timeout: '8',
      socket_timeout: '10',
      application_name: 'bounded-acl-inspection',
    };
    for (const [key, value] of Object.entries(parameters)) original.searchParams.set(key, value);
    const rawUrl = original.toString();

    const transformed = new URL(readOnlyUrl(rawUrl));

    expect(transformed.searchParams.get('options')).toBe(safeStartupOptions);
    transformed.searchParams.delete('options');
    expect(transformed.toString()).toBe(rawUrl);
    expect(original.toString()).toBe(rawUrl);
  });

  it.each([
    { name: 'direct ADMIN with SET and INHERIT disabled', executable: true, edges: [
      membershipEdge('authenticated', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'SET then ADMIN', executable: true, edges: [
      membershipEdge('authenticated', 'helper', { set_option: true }),
      membershipEdge('helper', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'transitive SET then ADMIN', executable: true, edges: [
      membershipEdge('authenticated', 'hop', { set_option: true }),
      membershipEdge('hop', 'helper', { set_option: true }),
      membershipEdge('helper', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'INHERIT-only access to an ADMIN grantor', executable: true, edges: [
      membershipEdge('authenticated', 'helper', { inherit_option: true }),
      membershipEdge('helper', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'SET then INHERIT then ADMIN', executable: true, edges: [
      membershipEdge('authenticated', 'hop', { set_option: true }),
      membershipEdge('hop', 'helper', { inherit_option: true }),
      membershipEdge('helper', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'ADMIN regrant then SET', executable: true, edges: [
      membershipEdge('authenticated', 'helper', { admin_option: true }),
      membershipEdge('helper', 'dangerous_helper', { set_option: true }),
    ] },
    { name: 'successive ADMIN regrants', executable: true, edges: [
      membershipEdge('authenticated', 'helper', { admin_option: true }),
      membershipEdge('helper', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'ADMIN regrant then INHERIT of another ADMIN grantor', executable: true, edges: [
      membershipEdge('authenticated', 'hop', { admin_option: true }),
      membershipEdge('hop', 'helper', { inherit_option: true }),
      membershipEdge('helper', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'unusable membership before ADMIN', executable: false, edges: [
      membershipEdge('authenticated', 'helper'),
      membershipEdge('helper', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'INHERIT then SET does not expose an ADMIN grantor', executable: false, edges: [
      membershipEdge('authenticated', 'hop', { inherit_option: true }),
      membershipEdge('hop', 'helper', { set_option: true }),
      membershipEdge('helper', 'dangerous_helper', { admin_option: true }),
    ] },
    { name: 'ADMIN does not enable an unrelated unusable membership', executable: false, edges: [
      membershipEdge('authenticated', 'helper', { admin_option: true }),
      membershipEdge('helper', 'dangerous_helper'),
    ] },
  ])('models $name without treating ADMIN as immediate SET/INHERIT', async ({ edges, executable }) => {
    const collector = collectorClient(() => edges);
    const memberships = await collectRoleMemberships(collector.transaction, ['authenticated']);
    const path = memberships.find((row) => row.reachable_role === 'dangerous_helper');
    expect(collector.calls).toHaveLength(1);
    expect(collector.calls[0].text).toContain('membership.admin_option');
    expect(collector.calls[0].text).toContain('membership.set_option');
    expect(collector.calls[0].text).toContain('membership.inherit_option');
    expect(collector.calls[0].text).toContain('membership.grantor');
    expect(path).toMatchObject({ settable: false, inheritable: false, regrant_settable: executable, regrant_privileges_usable: executable });
    expect(path?.role_path).toEqual(['authenticated', ...edges.map((edge) => edge.reachable_role)]);
    expect(path?.grantor_path).toEqual(edges.map((edge) => edge.grantor_role));

    const fixture = authorityFixture();
    fixture.reachableTablePrivileges.push({ role_name: 'dangerous_helper', can_truncate: true });
    expect(assessReachableAuthority({ ...fixture, memberships })).toEqual(executable ? [
      `authenticated can reach dangerous_helper through ADMIN regrant path ${path?.role_path?.join(' -> ')} with dangerous application authority`,
    ] : []);
  });

  it('reports executable ADMIN independently of already-usable SET authority', async () => {
    const collector = collectorClient(() => [membershipEdge('anon', 'helper', { admin_option: true, set_option: true })]);
    const memberships = await collectRoleMemberships(collector.transaction, ['anon']);
    expect(memberships[0]).toMatchObject({ admin_option: true, admin_exercisable: true, settable: true, inheritable: false, regrant_settable: true });
    const fixture = authorityFixture();
    fixture.reachableColumnPrivileges.push({ role_name: 'helper', can_select: true });
    expect(assessReachableAuthority({ ...fixture, memberships })).toEqual(expect.arrayContaining([
      'anon can reach helper through SET ROLE or membership with dangerous application authority',
      'anon can reach helper through ADMIN regrant path anon -> helper with dangerous application authority',
    ]));
  });

  it('retains alternate grantors and does not combine an unusable prefix with ADMIN', async () => {
    const collector = collectorClient(() => [
      membershipEdge('authenticated', 'helper', { grantor_role: 'grantor_a' }),
      membershipEdge('authenticated', 'helper', { grantor_role: 'grantor_b', set_option: true }),
      membershipEdge('helper', 'dangerous_helper', { grantor_role: 'grantor_c', admin_option: true }),
    ]);
    const memberships = await collectRoleMemberships(collector.transaction, ['authenticated']);
    const paths = memberships.filter((path) => path.reachable_role === 'dangerous_helper');
    expect(paths).toHaveLength(2);
    expect(paths).toEqual(expect.arrayContaining([
      expect.objectContaining({ grantor_path: ['grantor_a', 'grantor_c'], admin_option: true, admin_exercisable: false, regrant_settable: false }),
      expect.objectContaining({ grantor_path: ['grantor_b', 'grantor_c'], admin_option: true, admin_exercisable: true, regrant_settable: true }),
    ]));
    const fixture = authorityFixture();
    fixture.reachableTablePrivileges.push({ role_name: 'dangerous_helper', can_truncate: true });
    expect(assessReachableAuthority({ ...fixture, memberships })).toEqual([
      'authenticated can reach dangerous_helper through ADMIN regrant path authenticated -> helper -> dangerous_helper with dangerous application authority',
    ]);
  });

  it('distinguishes unsafe runtime DML regrant authority from harmless or ordinary DML memberships', async () => {
    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'runtime_role' });
    fixture.runtimeRoles.push('runtime_role');
    fixture.reachableTablePrivileges.push({ role_name: 'dml_helper', can_select: true, can_insert: true, can_update: true });
    for (const admin_option of [false, true]) {
      const collector = collectorClient(() => [
        membershipEdge('runtime_role', 'dml_helper', { set_option: true, admin_option }),
        membershipEdge('runtime_role', 'harmless_helper', { admin_option: true }),
      ]);
      const memberships = await collectRoleMemberships(collector.transaction, fixture.runtimeRoles);
      expect(assessReachableAuthority({ ...fixture, memberships })).toEqual(admin_option ? [
        'runtime_role can reach dml_helper through ADMIN regrant path runtime_role -> dml_helper with dangerous application authority',
      ] : []);
    }
  });

  it('protects declared creator/runtime identities even without current object grants', async () => {
    const collector = collectorClient(() => [
      membershipEdge('anon', 'future_creator', { admin_option: true }),
      membershipEdge('anon', 'runtime_role', { admin_option: true }),
    ]);
    const memberships = await collectRoleMemberships(collector.transaction, ['anon']);
    const fixture = authorityFixture();
    fixture.runtimeRoles.push('runtime_role');
    expect(assessReachableAuthority({ ...fixture, memberships, creatorRoles: ['future_creator'] })).toEqual(expect.arrayContaining([
      'anon can reach future_creator through ADMIN regrant path anon -> future_creator with dangerous application authority',
      'anon can reach runtime_role through ADMIN regrant path anon -> runtime_role with dangerous application authority',
    ]));
  });

  it('does not let non-superuser ADMIN regrant a superuser role or inherit special attributes', async () => {
    const collector = collectorClient(() => [
      membershipEdge('authenticated', 'super_helper', { admin_option: true, reachable_rolsuper: true }),
      membershipEdge('authenticated', 'admin_helper', { admin_option: true }),
      membershipEdge('admin_helper', 'createdb_helper', { inherit_option: true, reachable_rolcreatedb: true }),
    ]);
    const memberships = await collectRoleMemberships(collector.transaction, ['authenticated']);
    expect(memberships.find((path) => path.reachable_role === 'super_helper')).toMatchObject({ admin_option: true, admin_exercisable: false, regrant_settable: false });
    expect(memberships.find((path) => path.reachable_role === 'createdb_helper')).toMatchObject({ regrant_settable: false, regrant_privileges_usable: true });
    expect(assessReachableAuthority({ ...authorityFixture(), memberships })).toEqual([]);
  });

  it.each(['anon', 'authenticated', 'runtime_role'])('blocks direct CREATEDB for %s', (rolname) => {
    const fixture = authorityFixture();
    const role = fixture.roles.find((row) => row.rolname === rolname);
    if (role) role.rolcreatedb = true;
    else fixture.roles.push({ rolname, rolcreatedb: true });
    if (rolname === 'runtime_role') fixture.runtimeRoles.push(rolname);
    expect(assessReachableAuthority(fixture)).toContain(rolname === 'runtime_role'
      ? 'runtime_role has dangerous application authority available to the declared runtime role'
      : `${rolname} has dangerous direct role attributes`);
  });

  it.each(['set_option', 'inherit_option', 'admin_option'])(
    'assesses transitive CREATEDB reached through %s with special-attribute semantics',
    async (option) => {
      const collector = collectorClient(() => [
        membershipEdge('authenticated', 'helper', { set_option: true }),
        membershipEdge('helper', 'createdb_helper', { [option]: true, reachable_rolcreatedb: true }),
      ]);
      const memberships = await collectRoleMemberships(collector.transaction, ['authenticated']);
      expect(collector.calls[0].text).toContain('granted.rolcreatedb AS reachable_rolcreatedb');
      const findings = assessReachableAuthority({ ...authorityFixture(), memberships });
      if (option === 'inherit_option') expect(findings).toEqual([]);
      else expect(findings).toEqual([option === 'set_option'
        ? 'authenticated can reach createdb_helper through SET ROLE or membership with dangerous application authority'
        : 'authenticated can reach createdb_helper through ADMIN regrant path authenticated -> helper -> createdb_helper with dangerous application authority']);
    },
  );

  it('casts catalog char projections for the actual Prisma raw-query transport', () => {
    expect(preflight).toContain('c.relkind::text AS relkind');
    expect(preflight).toContain('d.defaclobjtype::text AS object_type');
    expect(preflight).not.toMatch(/c\.relkind\s*,|d\.defaclobjtype\s+AS\s+object_type/);
    expect(preflight).toMatch(/rolcreaterole,\s+rolcreatedb,/);
  });

  it('collects column-only migration-ledger writes before assessing browser and runtime paths', async () => {
    const roles = ['anon', 'authenticated', 'runtime_role', 'browser_helper', 'runtime_helper', 'ledger_super_helper'];
    const grants = [
      { role: 'anon', kind: 'column', privilege: 'UPDATE' },
      { role: 'authenticated', kind: 'column', privilege: 'INSERT' },
      { role: 'runtime_role', kind: 'column', privilege: 'UPDATE' },
      { role: 'browser_helper', kind: 'column', privilege: 'UPDATE' },
      { role: 'runtime_helper', kind: 'column', privilege: 'INSERT' },
      { role: 'ledger_super_helper', kind: 'column', privilege: 'UPDATE' },
    ];
    const collector = collectorClient((query) => {
      const hasColumnChecks = query.text.includes('has_column_privilege') && query.text.includes('ledger_column.attnum');
      const hasSuperuserColumnChecks = query.text.includes('pg_catalog.aclexplode(ledger_column.attacl)') && query.text.includes('membership.inherit_option');
      const hasTableChecks = query.text.includes('has_table_privilege');
      return roles.map((role_name) => ({
        role_name,
        can_mutate_migration_ledger: grants.some((grant) => grant.role === role_name && (
          grant.kind === 'column' && (role_name === 'ledger_super_helper' ? hasSuperuserColumnChecks : hasColumnChecks) && query.values.includes(grant.privilege)
          || grant.kind === 'table' && hasTableChecks && query.values.includes(grant.privilege)
        )),
      }));
    });

    const collected = await collectMigrationLedgerPrivileges(collector.transaction, roles);
    expect(collector.calls).toHaveLength(1);
    expect(collector.calls[0].text).toContain('has_column_privilege');
    expect(collector.calls[0].text).toContain('ledger_column.attnum');
    expect(collector.calls[0].values).toEqual(expect.arrayContaining(['INSERT', 'UPDATE', 'TRUNCATE']));

    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'runtime_role' }, { rolname: 'ledger_super_helper', rolsuper: true });
    fixture.runtimeRoles.push('runtime_role');
    fixture.memberships.push(
      { subject_role: 'authenticated', reachable_role: 'browser_helper', settable: false, inheritable: true },
      { subject_role: 'runtime_role', reachable_role: 'runtime_helper', settable: false, inheritable: true },
      { subject_role: 'authenticated', reachable_role: 'ledger_super_helper', settable: false, inheritable: true, reachable_rolsuper: true },
    );
    expect(assessReachableAuthority({ ...fixture, migrationLedgerPrivileges: collected })).toEqual(expect.arrayContaining([
      'anon has dangerous direct migration-ledger authority',
      'authenticated has dangerous direct migration-ledger authority',
      'runtime_role has dangerous application authority available to the declared runtime role',
      'authenticated can reach browser_helper through inherited membership with dangerous application authority',
      'runtime_role can reach runtime_helper through inherited membership with dangerous application authority',
      'authenticated can reach ledger_super_helper through inherited membership with dangerous application authority',
    ]));
  });

  it.each(['anon', 'authenticated', 'runtime_role'])(
    'collects and blocks %s ledger ownership with all DML revoked',
    async (owner_name) => {
      const roles = ['anon', 'authenticated', 'runtime_role'];
      const collector = collectorClient(() => roles.map((role_name) => ({
        role_name,
        owner_name,
        owns_migration_ledger: role_name === owner_name,
        has_migration_ledger_owner_authority: role_name === owner_name,
        can_mutate_migration_ledger: false,
      })));
      const migrationLedgerPrivileges = await collectMigrationLedgerPrivileges(collector.transaction, roles);
      expect(collector.calls[0].text).toContain('pg_get_userbyid(ledger.relowner)::text AS owner_name');
      expect(collector.calls[0].text).toContain('COALESCE(r.oid = ledger.relowner, false) AS owns_migration_ledger');
      expect(collector.calls[0].text).toContain('owner_path.grant_oid = ledger.relowner');
      expect(collector.calls[0].text).toContain('AS has_migration_ledger_owner_authority');
      // The owner shortcut must not fabricate DML in the superuser ACL branch.
      expect(collector.calls[0].text).not.toContain('acl_path.grant_oid = ledger.relowner OR');
      const fixture = authorityFixture();
      fixture.roles.push({ rolname: 'runtime_role' });
      fixture.runtimeRoles.push('runtime_role');
      expect(assessReachableAuthority({ ...fixture, migrationLedgerPrivileges })).toEqual([
        owner_name === 'runtime_role'
          ? 'runtime_role has dangerous application authority available to the declared runtime role'
          : `${owner_name} has direct migration-ledger owner authority`,
      ]);
    },
  );

  it.each(['authenticated', 'runtime_role'])(
    'blocks %s paths to a ledger owner independently of revoked DML',
    async (subject) => {
      const fixture = authorityFixture();
      if (subject === 'runtime_role') fixture.runtimeRoles.push(subject);
      for (const option of ['set_option', 'inherit_option', 'admin_option']) {
        const collector = collectorClient(() => [membershipEdge(subject, 'ledger_owner', { [option]: true })]);
        const memberships = await collectRoleMemberships(collector.transaction, [subject]);
        // The owner identity alone is enough; it is not a DML grant or a
        // superuser shortcut, and may be outside the scoped role metadata.
        const migrationLedgerPrivileges = [{ role_name: subject, owner_name: 'ledger_owner', can_mutate_migration_ledger: false }];
        const path = option === 'admin_option' ? `ADMIN regrant path ${subject} -> ledger_owner`
          : option === 'set_option' ? 'SET ROLE or membership' : 'inherited membership';
        expect(assessReachableAuthority({ ...fixture, memberships, migrationLedgerPrivileges })).toContain(
          `${subject} can reach ledger_owner through ${path} with dangerous application authority`,
        );
      }
    },
  );

  it.each(['ledger_owner', 'pg_database_owner'])('retains inherited %s ledger ownership behind a SET-reachable helper but not behind an unusable helper', async (owner_name) => {
    const roles = ['authenticated', 'helper', 'super_helper'];
    const ledgerCollector = collectorClient(() => roles.map((role_name) => ({
      role_name,
      owner_name,
      owns_migration_ledger: false,
      has_migration_ledger_owner_authority: role_name === 'helper' || role_name === 'super_helper',
      can_mutate_migration_ledger: false,
    })));
    const migrationLedgerPrivileges = await collectMigrationLedgerPrivileges(ledgerCollector.transaction, roles);
    expect(ledgerCollector.calls[0].text).toContain('membership.inherit_option');
    const fixture = authorityFixture();
    fixture.memberships.push(
      { subject_role: 'authenticated', reachable_role: 'helper', settable: true, inheritable: false },
      { subject_role: 'authenticated', reachable_role: 'super_helper', settable: false, inheritable: true, reachable_rolsuper: true },
    );
    expect(assessReachableAuthority({ ...fixture, migrationLedgerPrivileges })).toEqual(expect.arrayContaining([
      'authenticated can reach helper through SET ROLE or membership with dangerous application authority',
      'authenticated can reach super_helper through inherited membership with dangerous application authority',
    ]));
    fixture.memberships = [{ subject_role: 'authenticated', reachable_role: 'helper', settable: false, inheritable: false }];
    expect(assessReachableAuthority({ ...fixture, migrationLedgerPrivileges })).toEqual([]);
  });

  it.each([
    { name: 'role paths', collect: collectRoleMemberships },
    { name: 'application ACLs', collect: collectReachableTablePrivileges },
    { name: 'ledger ownership', collect: collectMigrationLedgerPrivileges },
  ])('includes the current database owner implicit membership in $name', async ({ collect }) => {
    const collector = collectorClient(() => []);
    await collect(collector.transaction, ['runtime_role']);
    const sql = collector.calls[0].text;
    expect(sql).toContain('FROM pg_catalog.pg_auth_members');
    expect(sql).toContain('FROM pg_catalog.pg_database AS db');
    expect(sql).toContain("owner_role.rolname = 'pg_database_owner'");
    expect(sql).toContain('WHERE db.datname = current_database()');
    expect(sql).toMatch(/db\.datdba AS member,\s+owner_role\.oid AS roleid,\s+NULL::oid AS grantor/);
    expect(sql).toMatch(/false AS admin_option,\s+true AS set_option,\s+true AS inherit_option/);
    expect(sql.match(/JOIN role_membership_edges AS membership/g)).toHaveLength(collect === collectRoleMemberships ? 2 : 1);
    if (collect !== collectRoleMemberships) {
      expect(sql).toContain('WHERE membership.inherit_option');
      expect(sql).not.toContain('pg_has_role');
    }
  });

  it.each([
    { name: 'direct ownership', settable: true, inheritable: true, regrant: false, edges: [] },
    { name: 'SET-only membership', settable: true, inheritable: false, regrant: false, edges: [
      membershipEdge('runtime_role', 'database_owner', { set_option: true }),
    ] },
    { name: 'INHERIT-only membership', settable: false, inheritable: true, regrant: false, edges: [
      membershipEdge('runtime_role', 'database_owner', { inherit_option: true }),
    ] },
    { name: 'ADMIN regrant', settable: false, inheritable: false, regrant: true, edges: [
      membershipEdge('runtime_role', 'database_owner', { admin_option: true }),
    ] },
    { name: 'unusable membership', settable: false, inheritable: false, regrant: false, edges: [
      membershipEdge('runtime_role', 'database_owner'),
    ] },
    { name: 'inherited superuser ownership without special attributes', settable: false, inheritable: true, regrant: false, edges: [
      membershipEdge('runtime_role', 'database_owner', { inherit_option: true, reachable_rolsuper: true, reachable_rolcreatedb: true }),
    ] },
    { name: 'unexercisable ADMIN on a superuser owner', settable: false, inheritable: false, regrant: false, edges: [
      membershipEdge('runtime_role', 'database_owner', { admin_option: true, reachable_rolsuper: true }),
    ] },
  ])('models implicit pg_database_owner access through $name', async ({ edges, settable, inheritable, regrant }) => {
    const databaseOwner = edges.length > 0 ? 'database_owner' : 'runtime_role';
    const collector = collectorClient(() => [
      ...edges,
      membershipEdge(databaseOwner, 'pg_database_owner', {
        grantor_role: null, set_option: true, inherit_option: true, reachable_rolsuper: false, reachable_rolcreatedb: false,
      }),
    ]);
    const memberships = await collectRoleMemberships(collector.transaction, ['runtime_role']);
    const path = memberships.find((row) => row.reachable_role === 'pg_database_owner');
    expect(path).toMatchObject({
      settable, inheritable, privileges_usable: settable || inheritable,
      admin_option: false, admin_exercisable: false,
      regrant_settable: regrant, regrant_privileges_usable: regrant,
      reachable_rolsuper: false, reachable_rolcreatedb: false,
      role_path: ['runtime_role', ...edges.map((edge) => edge.reachable_role), 'pg_database_owner'],
      grantor_path: [...edges.map((edge) => edge.grantor_role), null],
    });
    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'runtime_role', rolinherit: false });
    fixture.runtimeRoles.push('runtime_role');
    expect(assessReachableAuthority({ ...fixture, memberships })).toEqual([]);
    // Omit per-role ownership flags to assess the implicit role path independently.
    fixture.migrationLedgerPrivileges.push({ role_name: 'runtime_role', owner_name: 'pg_database_owner', can_mutate_migration_ledger: false });
    const description = regrant ? `ADMIN regrant path ${path?.role_path?.join(' -> ')}`
      : settable ? 'SET ROLE or membership' : 'inherited membership';
    expect(assessReachableAuthority({ ...fixture, memberships })).toEqual(settable || inheritable || regrant ? [
      `runtime_role can reach pg_database_owner through ${description} with dangerous application authority`,
    ] : []);
  });

  it('blocks implicit runtime ledger ownership independently of role paths and revoked DML', async () => {
    const collector = collectorClient(() => [{
      role_name: 'runtime_role',
      owner_name: 'pg_database_owner',
      owns_migration_ledger: false,
      has_migration_ledger_owner_authority: true,
      can_mutate_migration_ledger: false,
    }]);
    const migrationLedgerPrivileges = await collectMigrationLedgerPrivileges(collector.transaction, ['runtime_role']);
    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'runtime_role', rolinherit: false });
    fixture.runtimeRoles.push('runtime_role');
    expect(assessReachableAuthority({ ...fixture, migrationLedgerPrivileges })).toEqual([
      'runtime_role has dangerous application authority available to the declared runtime role',
    ]);
  });

  it('does not invent owner authority for an absent ledger', async () => {
    const collector = collectorClient(() => [{
      role_name: 'authenticated',
      owner_name: null,
      owns_migration_ledger: false,
      has_migration_ledger_owner_authority: false,
      can_mutate_migration_ledger: false,
    }]);
    const migrationLedgerPrivileges = await collectMigrationLedgerPrivileges(collector.transaction, ['authenticated']);
    expect(assessReachableAuthority({ ...authorityFixture(), migrationLedgerPrivileges })).toEqual([]);
  });

  it('keeps harmless application-runtime DML out of migration-ledger findings', async () => {
    const roles = ['anon', 'authenticated', 'runtime_role'];
    const collector = collectorClient(() => roles.map((role_name) => ({ role_name, can_mutate_migration_ledger: false })));
    const collected = await collectMigrationLedgerPrivileges(collector.transaction, roles);
    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'runtime_role' });
    fixture.runtimeRoles.push('runtime_role');
    fixture.reachableTablePrivileges.push({ role_name: 'runtime_role', table_name: 'users', can_select: true, can_insert: true, can_update: true });

    expect(assessReachableAuthority({ ...fixture, migrationLedgerPrivileges: collected })).toEqual([]);
  });

  it('retains table-level migration-ledger mutation detection in the collector', async () => {
    const roles = ['anon', 'authenticated'];
    const collector = collectorClient((query) => roles.map((role_name) => ({
      role_name,
      can_mutate_migration_ledger: role_name === 'authenticated' && query.text.includes('has_table_privilege') && query.values.includes('UPDATE'),
    })));
    const collected = await collectMigrationLedgerPrivileges(collector.transaction, roles);

    expect(collector.calls[0].text).toContain('has_table_privilege');
    expect(assessReachableAuthority({ ...authorityFixture(), migrationLedgerPrivileges: collected })).toContain(
      'authenticated has dangerous direct migration-ledger authority',
    );
  });

  it('does not attribute a SET-disabled superuser bypass to inherited object rights', async () => {
    const roles = ['anon', 'authenticated', 'super_helper', 'harmless_helper', 'unreachable_helper'];
    const inheritedRoles: Record<string, string[]> = { super_helper: [], harmless_helper: [], unreachable_helper: [] };
    const grants: Array<{ grantee: string; privilege: string }> = [];
    const collector = collectorClient((query) => {
      const rawAclPath = query.text.includes('pg_auth_members') && query.text.includes('inherit_option') && query.text.includes('aclexplode');
      return roles.map((role_name) => ({
        role_name,
        table_name: 'users',
        can_select: false,
        can_insert: false,
        can_update: false,
        can_delete: false,
        can_truncate: rawAclPath && grants.some((grant) => grant.privilege === 'TRUNCATE' && [role_name, ...(inheritedRoles[role_name] ?? [])].includes(grant.grantee)),
        can_references: false,
        can_trigger: false,
      }));
    });
    const collected = await collectReachableTablePrivileges(collector.transaction, roles);
    expect(collector.calls[0].text).toContain('CASE WHEN r.rolsuper');
    expect(collector.calls[0].text).toContain('pg_catalog.aclexplode');
    expect(collector.calls[0].text).toContain('membership.inherit_option');

    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'super_helper', rolsuper: true });
    fixture.memberships.push({
      subject_role: 'authenticated',
      reachable_role: 'super_helper',
      settable: false,
      inheritable: true,
      reachable_rolsuper: true,
    });
    expect(assessReachableAuthority({ ...fixture, reachableTablePrivileges: collected })).toEqual([]);
  });

  it('retains actual inheritable ACL grants and ownership behind a superuser helper', async () => {
    const roles = ['anon', 'authenticated', 'super_helper'];
    const collectAuthority = async (
      inheritedRoles: Record<string, string[]>,
      grants: Array<{ grantee: string; privilege: string }>,
    ) => {
      const collector = collectorClient((query) => {
        const rawAclPath = query.text.includes('pg_auth_members') && query.text.includes('inherit_option') && query.text.includes('aclexplode');
        const ownerPath = rawAclPath && query.text.includes('acl_path.grant_oid = c.relowner');
        return roles.map((role_name) => {
          const inherited = [role_name, ...(inheritedRoles[role_name] ?? [])];
          const ownedApplicationTable = role_name === 'super_helper' && ownerPath && inherited.includes('table_owner');
          const actualDangerousGrant = role_name === 'super_helper' && rawAclPath && grants.some((grant) => grant.privilege === 'TRUNCATE' && inherited.includes(grant.grantee));
          return {
            role_name,
            table_name: 'users',
            can_select: ownedApplicationTable,
            can_insert: false,
            can_update: false,
            can_delete: false,
            can_truncate: actualDangerousGrant,
            can_references: false,
            can_trigger: false,
          };
        });
      });
      return { collected: await collectReachableTablePrivileges(collector.transaction, roles), call: collector.calls[0] };
    };
    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'super_helper', rolsuper: true });
    fixture.memberships.push({
      subject_role: 'authenticated',
      reachable_role: 'super_helper',
      settable: false,
      inheritable: true,
      reachable_rolsuper: true,
    });

    const granted = await collectAuthority({ super_helper: ['acl_group'] }, [{ grantee: 'acl_group', privilege: 'TRUNCATE' }]);
    expect(granted.call.text).toContain('pg_catalog.aclexplode');
    expect(granted.call.text).toContain('membership.inherit_option');
    expect(assessReachableAuthority({ ...fixture, reachableTablePrivileges: granted.collected })).toContain(
      'authenticated can reach super_helper through inherited membership with dangerous application authority',
    );

    const owned = await collectAuthority({ super_helper: ['table_owner'] }, []);
    expect(owned.call.text).toContain('acl_path.grant_oid = c.relowner');
    expect(assessReachableAuthority({ ...fixture, reachableTablePrivileges: owned.collected })).toContain(
      'authenticated can reach super_helper through inherited membership with dangerous application authority',
    );
  });

  it('retains SET-enabled superuser authority and ignores harmless or unusable helper controls', async () => {
    const roles = ['anon', 'authenticated', 'super_helper', 'harmless_helper', 'unreachable_helper'];
    const collector = collectorClient((query) => {
      const actualAclPath = query.text.includes('pg_catalog.aclexplode');
      return roles.map((role_name) => ({
        role_name,
        table_name: 'users',
        can_select: false,
        can_insert: false,
        can_update: false,
        can_delete: false,
        can_truncate: role_name === 'unreachable_helper' && actualAclPath,
        can_references: false,
        can_trigger: false,
      }));
    });
    const collected = await collectReachableTablePrivileges(collector.transaction, roles);

    const setEnabled = authorityFixture();
    setEnabled.roles.push({ rolname: 'super_helper', rolsuper: true });
    setEnabled.memberships.push({ subject_role: 'authenticated', reachable_role: 'super_helper', settable: true, inheritable: false, reachable_rolsuper: true });
    expect(assessReachableAuthority({ ...setEnabled, reachableTablePrivileges: collected })).toContain(
      'authenticated can reach super_helper through SET ROLE or membership with dangerous application authority',
    );

    const controls = authorityFixture();
    controls.roles.push({ rolname: 'super_helper', rolsuper: true });
    controls.memberships.push(
      { subject_role: 'authenticated', reachable_role: 'super_helper', settable: false, inheritable: true, reachable_rolsuper: true },
      { subject_role: 'authenticated', reachable_role: 'harmless_helper', settable: true, inheritable: false },
      { subject_role: 'authenticated', reachable_role: 'unreachable_helper', settable: false, inheritable: false },
    );
    expect(assessReachableAuthority({ ...controls, reachableTablePrivileges: collected })).toEqual([]);
  });

  it('keeps the exact independent 29-table allowlist aligned with schema mappings', () => {
    const block = migration.match(/application_tables CONSTANT text\[\] := ARRAY\[(.*?)\n\s+\];/s)?.[1] ?? '';
    const migrationTables = [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    const schemaTables = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((match) => match[1]);

    expect(sorted(migrationTables)).toEqual(sorted(expectedTables));
    expect(sorted(schemaTables)).toEqual(sorted(expectedTables));
    expect(sorted(APPLICATION_ACL_TABLES)).toEqual(sorted(expectedTables));
    expect(new Set(migrationTables).size).toBe(29);
    expect(migrationTables).toEqual(expect.arrayContaining(['reservations', 'reservation_events', 'property_status_history']));
  });

  it('hardens only existing allowlisted objects transactionally', () => {
    expect(migration).toContain('BEGIN;');
    expect(migration).toContain('COMMIT;');
    expect(migration).toContain('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s');
    expect(migration).toContain('REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM %s');
    expect(migration).toContain('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM %s');
    expect(migration).toContain("RAISE EXCEPTION 'Missing or non-table application objects: %'");
    expect(migration).not.toMatch(/FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(migration).not.toMatch(/\bGRANT\b/i);
    expect(migration).not.toMatch(/\bCASCADE\b/i);
    expect(migration).not.toMatch(/ALL\s+TABLES\s+IN\s+SCHEMA/i);
    expect(migration).not.toMatch(/ALTER\s+DEFAULT\s+PRIVILEGES/i);
  });

  it('keeps future-creator defaults in the explicit preflight contract', () => {
    expect(preflight).toContain('DIRECT_URL');
    expect(preflight).toContain('--target-host');
    expect(preflight).toContain('--target-database');
    expect(preflight).toContain('--creator-role');
    expect(preflight).toContain('--apply-defaults');
    expect(preflight).toContain('--approve-global-defaults');
    expect(preflight).toContain('ALTER DEFAULT PRIVILEGES FOR ROLE');
    expect(preflight).toContain('IN SCHEMA public');
    expect(preflight).toContain('$executeRawUnsafe');
    expect(preflight).not.toMatch(/rhc4b_/i);
    expect(helpText()).toContain('no .env loading');
  });

  it('fails readiness for browser SET ROLE access to an ordinary helper with TRUNCATE', () => {
    const fixture = authorityFixture();
    fixture.memberships.push({
      subject_role: 'authenticated',
      reachable_role: 'ordinary_helper',
      settable: true,
      inheritable: false,
      reachable_rolsuper: false,
      reachable_rolbypassrls: false,
      reachable_rolcreaterole: false,
    });
    fixture.reachableTablePrivileges.push({ role_name: 'ordinary_helper', table_name: 'users', can_truncate: true });

    const findings = assessReachableAuthority(fixture);

    expect(findings).toEqual([
      'authenticated can reach ordinary_helper through SET ROLE or membership with dangerous application authority',
    ]);
  });

  it('does not report a helper when SET ROLE and inheritance are both disabled', () => {
    const fixture = authorityFixture();
    fixture.memberships.push({ subject_role: 'authenticated', reachable_role: 'ordinary_helper', settable: false, inheritable: false });
    fixture.reachableTablePrivileges.push({ role_name: 'ordinary_helper', table_name: 'users', can_truncate: true });
    fixture.reachableColumnPrivileges.push({ role_name: 'ordinary_helper', table_name: 'users', column_name: 'id', can_select: true });
    fixture.reachableSequencePrivileges.push({ role_name: 'ordinary_helper', sequence_name: 'users_id_seq', can_usage: true });

    expect(assessReachableAuthority(fixture)).toEqual([]);
  });

  it.each(['can_select', 'can_insert', 'can_update', 'can_references'] as const)(
    'fails readiness for browser SET ROLE helper column %s',
    (privilege) => {
      const fixture = authorityFixture();
      fixture.memberships.push({ subject_role: 'authenticated', reachable_role: 'column_helper', settable: true, inheritable: false });
      fixture.reachableColumnPrivileges.push({ role_name: 'column_helper', table_name: 'users', column_name: 'id', [privilege]: true });

      expect(assessReachableAuthority(fixture)).toContain(
        'authenticated can reach column_helper through SET ROLE or membership with dangerous application authority',
      );
    },
  );

  it('fails readiness for declared runtime SET ROLE helper dangerous column authority', () => {
    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'runtime_role', rolinherit: false });
    fixture.runtimeRoles.push('runtime_role');
    fixture.memberships.push({ subject_role: 'runtime_role', reachable_role: 'runtime_column_helper', settable: true, inheritable: false });
    fixture.reachableColumnPrivileges.push({ role_name: 'runtime_column_helper', table_name: 'users', column_name: 'email', can_references: true });

    expect(assessReachableAuthority(fixture)).toContain(
      'runtime_role can reach runtime_column_helper through SET ROLE or membership with dangerous application authority',
    );
  });

  it('does not report an unreachable helper column or sequence grant', () => {
    const fixture = authorityFixture();
    fixture.memberships.push({ subject_role: 'authenticated', reachable_role: 'unreachable_helper', settable: false, inheritable: false });
    fixture.reachableColumnPrivileges.push({ role_name: 'unreachable_helper', table_name: 'users', can_select: true });
    fixture.reachableSequencePrivileges.push({ role_name: 'unreachable_helper', sequence_name: 'users_id_seq', can_usage: true });

    expect(assessReachableAuthority(fixture)).toEqual([]);
  });

  it('does not report harmless helper authority reachable through SET ROLE', () => {
    const fixture = authorityFixture();
    fixture.memberships.push({ subject_role: 'authenticated', reachable_role: 'harmless_helper', settable: true, inheritable: false });
    fixture.reachableTablePrivileges.push({ role_name: 'harmless_helper', table_name: 'users' });

    expect(assessReachableAuthority(fixture)).toEqual([]);
  });

  it.each(['can_usage', 'can_select', 'can_update'] as const)(
    'fails readiness for browser SET ROLE helper sequence %s',
    (privilege) => {
      const fixture = authorityFixture();
      fixture.memberships.push({ subject_role: 'authenticated', reachable_role: 'sequence_helper', settable: true, inheritable: false });
      fixture.reachableSequencePrivileges.push({ role_name: 'sequence_helper', sequence_name: 'users_id_seq', [privilege]: true });

      expect(assessReachableAuthority(fixture)).toContain(
        'authenticated can reach sequence_helper through SET ROLE or membership with dangerous application authority',
      );
    },
  );

  it('fails readiness for declared runtime SET ROLE helper owned-sequence UPDATE authority', () => {
    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'runtime_role', rolinherit: false });
    fixture.runtimeRoles.push('runtime_role');
    fixture.memberships.push({ subject_role: 'runtime_role', reachable_role: 'runtime_sequence_helper', settable: true, inheritable: false });
    fixture.reachableSequencePrivileges.push({ role_name: 'runtime_sequence_helper', sequence_name: 'users_id_seq', can_update: true });

    expect(assessReachableAuthority(fixture)).toContain(
      'runtime_role can reach runtime_sequence_helper through SET ROLE or membership with dangerous application authority',
    );
  });

  it('reports dangerous helper authority reachable from a declared runtime role', () => {
    const fixture = authorityFixture();
    fixture.roles.push({ rolname: 'runtime_role', rolinherit: false });
    fixture.runtimeRoles.push('runtime_role');
    fixture.memberships.push({
      subject_role: 'runtime_role',
      reachable_role: 'runtime_helper',
      settable: true,
      inheritable: false,
      reachable_rolsuper: false,
      reachable_rolbypassrls: false,
      reachable_rolcreaterole: false,
    });
    fixture.reachableTablePrivileges.push({ role_name: 'runtime_helper', table_name: 'reservations', can_truncate: true });

    expect(assessReachableAuthority(fixture)).toEqual([
      'runtime_role can reach runtime_helper through SET ROLE or membership with dangerous application authority',
    ]);
  });

  it('reports inherited ordinary table and column privileges when membership INHERIT is enabled', () => {
    const fixture = authorityFixture();
    fixture.memberships.push({ subject_role: 'authenticated', reachable_role: 'inherited_helper', settable: false, inheritable: true });
    fixture.reachableTablePrivileges.push({ role_name: 'inherited_helper', table_name: 'users', can_select: true });
    fixture.reachableColumnPrivileges.push({ role_name: 'inherited_helper', table_name: 'users', column_name: 'email', can_select: true });

    expect(assessReachableAuthority(fixture)).toContain(
      'authenticated can reach inherited_helper through inherited membership with dangerous application authority',
    );
  });

  it('does not treat inheritance-only CREATEROLE as a usable special attribute', () => {
    const fixture = authorityFixture();
    fixture.memberships.push({
      subject_role: 'authenticated',
      reachable_role: 'attribute_helper',
      settable: false,
      inheritable: true,
      reachable_rolcreaterole: true,
    });

    expect(assessReachableAuthority(fixture)).toEqual([]);
  });

  it('reports CREATEROLE when the helper is SET-enabled', () => {
    const fixture = authorityFixture();
    fixture.memberships.push({
      subject_role: 'authenticated',
      reachable_role: 'attribute_helper',
      settable: true,
      inheritable: false,
      reachable_rolcreaterole: true,
    });

    expect(assessReachableAuthority(fixture)).toContain(
      'authenticated can reach attribute_helper through SET ROLE or membership with dangerous application authority',
    );
  });

  it('retains direct browser column, sequence, table, and creator-owner readiness checks', () => {
    const fixture = authorityFixture();
    fixture.reachableTablePrivileges.push({ role_name: 'authenticated', table_name: 'users', can_truncate: true });
    fixture.reachableColumnPrivileges.push({ role_name: 'authenticated', table_name: 'users', column_name: 'id', can_select: true });
    fixture.reachableSequencePrivileges.push({ role_name: 'authenticated', sequence_name: 'users_id_seq', can_usage: true });
    expect(assessReachableAuthority(fixture)).toContain('authenticated has dangerous direct application-table privilege');
    expect(assessReachableAuthority(fixture)).toContain('authenticated has dangerous direct application-column privilege');
    expect(assessReachableAuthority(fixture)).toContain('authenticated has dangerous direct owned-sequence privilege');

    fixture.reachableTablePrivileges = [];
    fixture.reachableColumnPrivileges = [];
    fixture.reachableSequencePrivileges = [];
    fixture.memberships.push({
      subject_role: 'authenticated',
      reachable_role: 'creator_a',
      settable: true,
      inheritable: false,
    });
    expect(assessReachableAuthority(fixture)).toContain(
      'authenticated can reach creator_a through SET ROLE or membership with dangerous application authority',
    );
    expect(preflight).toContain('tables.some((table) => BROWSER_ROLES.includes(text(table.owner_name) as BrowserRole))');
    expect(preflight).toContain('requiredCreatorRoles.some((role) => !declaredCreators.includes(role))');
  });
});
