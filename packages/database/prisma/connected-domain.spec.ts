import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  RETAINED,
  ADDED,
  TABLES,
  MIGRATION,
  IMMUTABLE,
  NO_TRUNCATE,
  sources,
  manifest,
  checkManifest,
  expectedCatalog,
  statements,
  noComments,
  classifyLedger,
  hash,
} from './connected-domain-source';
import {
  authorizedUrl,
  parseArgs,
  safeFailure,
  READ_ENV,
  DISPOSABLE_ENV,
} from './connected-domain-gates';
import { exactExpression } from './connected-domain-verify';

const schema = readFileSync(join(ROOT, 'schema.prisma'), 'utf8');
const sql = sources().find((s) => s.name === MIGRATION)!.sql;
const catalog = expectedCatalog();
const baseline = JSON.parse(readFileSync(join(ROOT, 'connected-domain-baseline.json'), 'utf8')) as {
  sourceCommit: string;
};
const repository = join(ROOT, '../../..');
const original = (path: string) =>
  execFileSync('git', ['--no-pager', 'show', `${baseline.sourceCommit}:${path}`], {
    cwd: repository,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).replace(/\r\n/g, '\n');
const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');
function models(s: string) {
  return [...s.matchAll(/model (\w+) \{([\s\S]+?)\n\}/g)].map((m) => ({
    name: m[1],
    body: m[2],
    table: m[2].match(/@@map\("([^"]+)"\)/)![1],
  }));
}
const sorted = (s: readonly string[]) => [...s].sort();

test('29 retained + 16 added = 45 mapped models and SQL tables, with no duplicates', () => {
  assert.equal(RETAINED.length, 29);
  assert.equal(ADDED.length, 16);
  assert.equal(TABLES.length, 45);
  assert.equal(new Set(TABLES).size, 45);
  assert.deepEqual(sorted(models(schema).map((m) => m.table)), sorted(TABLES));
  assert.deepEqual(sorted(catalog.tables), sorted(TABLES));
  assert.deepEqual(
    sorted([...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((m) => m[1])),
    sorted(ADDED),
  );
});
test('every new scalar column matches Prisma type, nullability and database default', () => {
  const enums = new Set([...schema.matchAll(/enum (\w+) \{/g)].map((m) => m[1]));
  const primitives: Record<string, string> = {
    String: 'TEXT',
    Int: 'INTEGER',
    BigInt: 'BIGINT',
    Boolean: 'BOOLEAN',
    DateTime: 'TIMESTAMP(3)',
  };
  for (const model of models(schema).filter((m) =>
    (ADDED as readonly string[]).includes(m.table),
  )) {
    const block = sql.match(new RegExp(`CREATE TABLE "${model.table}" \\(([\\s\\S]+?)\\n\\);`))![1];
    const columns = new Map(
      [...block.matchAll(/^\s*"(\w+)" ([^\n]+),?$/gm)].map((m) => [
        m[1],
        m[2].trim().replace(/,$/, ''),
      ]),
    );
    const seen: string[] = [];
    for (const line of model.body.split('\n')) {
      const m = line.trim().match(/^(\w+)\s+(\w+)(\?)?(?:\s+(.*))?$/);
      if (!m) continue;
      const [, name, type, optional, attributes = ''] = m;
      if (!(type in primitives) && type !== 'Decimal' && !enums.has(type)) continue;
      seen.push(name);
      let expected = primitives[type] || `"${type}"`;
      if (attributes.includes('@db.Uuid')) expected = 'UUID';
      const varchar = attributes.match(/@db.VarChar\((\d+)\)/);
      if (varchar) expected = `VARCHAR(${varchar[1]})`;
      const decimal = attributes.match(/@db.Decimal\((\d+),\s*(\d+)\)/);
      if (decimal) expected = `DECIMAL(${decimal[1]},${decimal[2]})`;
      if (!optional) expected += ' NOT NULL';
      const generated = attributes.match(/@default\(dbgenerated\("([^"]+)"\)\)/)?.[1];
      const defaultValue =
        generated || attributes.match(/@default\((now\(\)|uuid\(\)|[^)]+)\)/)?.[1];
      if (defaultValue && defaultValue !== 'uuid()') {
        const value = generated
          ? generated
          : defaultValue === 'now()'
            ? 'CURRENT_TIMESTAMP'
            : defaultValue.startsWith('"')
              ? `'${defaultValue.slice(1, -1)}'`
              : enums.has(type)
                ? `'${defaultValue}'`
                : defaultValue;
        expected += ` DEFAULT ${value}`;
      }
      assert.equal(columns.get(name), expected, `${model.table}.${name}`);
    }
    assert.deepEqual(sorted([...columns.keys()]), sorted(seen), model.table);
  }
});
test('all new enum values match the migration exactly and in order', () => {
  const enums = [...sql.matchAll(/CREATE TYPE "(\w+)" AS ENUM \(([^)]+)\)/g)];
  assert.equal(enums.length, 11);
  for (const e of enums) {
    const body = schema.match(new RegExp(`enum ${e[1]} \\{([^}]+)\\}`))![1];
    assert.deepEqual(
      body.trim().split(/\s+/),
      [...e[2].matchAll(/'([^']+)'/g)].map((m) => m[1]),
    );
  }
});
test('all seven historical migrations preserve the fixed source baseline', () => {
  const historical = sources().filter((m) => m.name !== MIGRATION);
  assert.equal(historical.length, 7);
  for (const m of historical)
    assert.equal(
      m.sql.replace(/\r\n/g, '\n'),
      original(`packages/database/prisma/${m.path}`),
      m.name,
    );
});
test('retained scalar fields, enums, indexes, generator and datasource are preserved', () => {
  const old = original('packages/database/prisma/schema.prisma');
  const oldModels = models(old);
  assert.equal(oldModels.length, 29);
  const enums = [...old.matchAll(/enum (\w+) \{([\s\S]+?)\n\}/g)];
  const scalars = new Set([
    'String',
    'Int',
    'BigInt',
    'Decimal',
    'Boolean',
    'DateTime',
    'Json',
    'Float',
    'Bytes',
    ...enums.map((m) => m[1]),
  ]);
  for (const m of oldModels) {
    const current = models(schema).find((x) => x.name === m.name)!;
    assert.ok(current);
    assert.equal(current.table, m.table);
    for (const line of m.body.split('\n').map(normalize).filter(Boolean)) {
      const type = line.split(' ')[1]?.replace(/\?|\[|\]/g, '');
      if (scalars.has(type) || /^@@(?:index|unique|map)/.test(line))
        assert.ok(current.body.split('\n').map(normalize).includes(line), `${m.name}: ${line}`);
    }
  }
  for (const m of enums) assert.ok(schema.includes(m[0]), m[1]);
  for (const m of old.matchAll(/(?:generator|datasource) \w+ \{[\s\S]+?\n\}/g))
    assert.ok(schema.includes(m[0]));
});
test('new DDL is additive: no data rewrite, provider mutation, policy, role, grant, activation or reset', () => {
  const top = statements(sql);
  assert.equal(top[0], 'BEGIN');
  assert.equal(top.at(-1), 'COMMIT');
  for (const s of top)
    assert.doesNotMatch(
      s,
      /^(?:UPDATE|DELETE|INSERT|TRUNCATE|DROP|GRANT|CREATE ROLE|ALTER ROLE|CREATE POLICY|ALTER DEFAULT PRIVILEGES)\b/i,
    );
  const clean = noComments(sql);
  assert.doesNotMatch(clean, /\b(?:auth|storage)\s*\./i);
  assert.doesNotMatch(clean, /\bSECURITY DEFINER\b/i);
  assert.doesNotMatch(clean, /ALTER TABLE[^;]+(?:DROP|DISABLE|OWNER TO)/i);
  assert.match(
    clean,
    /verification_references_inactive_check CHECK \(NOT enabled AND disclosure_scope = 'NONE'\)/,
  );
  assert.match(clean, /rewards_benefits_inactive_check CHECK \(NOT active\)/);
  assert.doesNotMatch(
    clean,
    /UPDATE\s+(?:public\.)?"?(?:feature_flags|companies|company_integrations|user_profiles)\b/i,
  );
});
test('nullable legacy extensions have no defaults, backfills or inferred values', () => {
  assert.match(sql, /ALTER TABLE "notifications" ADD COLUMN\s+"read_at" TIMESTAMP\(3\);/);
  assert.match(
    sql,
    /ALTER TABLE "rewards_redemptions" ADD COLUMN\s+"accepted_points_cost" DECIMAL\(18,2\),\s*ADD COLUMN\s+"accepted_terms_snapshot" TEXT,\s*ADD COLUMN\s+"benefit_company_id" UUID,\s*ADD COLUMN\s+"benefit_id" UUID,\s*ADD COLUMN\s+"original_debit_id" UUID;/,
  );
  assert.match(
    sql,
    /benefit_id IS NULL AND benefit_company_id IS NULL AND accepted_points_cost IS NULL AND accepted_terms_snapshot IS NULL AND original_debit_id IS NULL/,
  );
});
test('exact PK and FK catalogs include every new FK and retained final FK actions', () => {
  assert.equal(catalog.constraints.filter((c) => c.kind === 'p').length, 45);
  const newFks = catalog.constraints.filter(
    (c) => c.kind === 'f' && (ADDED as readonly string[]).includes(c.table),
  );
  assert.equal(newFks.length, 52);
  for (const field of ['created_by_id', 'responsible_user_id']) {
    const actor = newFks.find((c) => c.name === `turnover_cases_${field}_fkey`)!;
    assert.equal(actor.target, 'users');
    assert.deepEqual(actor.columns, [field]);
  }
  assert.ok(catalog.triggers.find((t) => t.name === 'connected_turnover_scope')!.args.includes('created_by_id'));
  for (const c of newFks) {
    assert.equal(c.onDelete, 'RESTRICT');
    assert.equal(c.onUpdate, 'RESTRICT');
    assert.ok(TABLES.includes(c.target as (typeof TABLES)[number]));
  }
  const reservation = catalog.constraints.find(
    (c) => c.name === 'payment_records_reservation_scope_fkey',
  )!;
  assert.deepEqual(reservation.columns, ['reservation_id', 'customer_id', 'property_id']);
  assert.deepEqual(reservation.references, ['id', 'customer_id', 'property_id']);
  const service = catalog.constraints.find(
    (c) => c.name === 'service_requests_service_id_company_id_fkey',
  )!;
  assert.deepEqual(service.columns, ['service_id', 'company_id']);
  assert.equal(service.target, 'business_services');
  assert.equal(
    catalog.constraints.find((c) => c.name === 'user_roles_project_id_fkey')!.onDelete,
    'RESTRICT',
  );
  assert.equal(
    catalog.constraints.find((c) => c.name === 'reservation_events_actor_user_id_fkey')!.onDelete,
    'SET NULL',
  );
});
test('SQL-only checks and dynamic input checks are expanded into expected catalog', () => {
  const checks = catalog.constraints.filter((c) => c.kind === 'c');
  assert.ok(checks.length >= 70);
  for (const name of [
    'document_versions_positive_check',
    'document_versions_checksum_check',
    'payment_records_amount_check',
    'payment_records_paid_at_check',
    'verification_references_target_check',
    'verification_references_inactive_check',
    'certificates_source_check',
    'project_milestones_publication_check',
    'rewards_redemptions_benefit_snapshot_check',
    'identity_requested_first_name_check',
    'document_versions_idempotency_key_check',
    'documents_updated_at_check',
  ])
    assert.ok(
      checks.some((c) => c.name === name),
      name,
    );
  assert.equal(
    checks.find((c) => c.name === 'verification_references_target_check')!.expression,
    'num_nonnulls(user_profile_id, certificate_id) = 1',
  );
  assert.equal(new Set(checks.map((c) => c.name)).size, checks.length);
});
test('partial, retry, exact-version, source-link and old reservation indexes are preserved', () => {
  for (const name of [
    'document_versions_document_id_version_number_key',
    'document_versions_storage_bucket_storage_object_key',
    'document_reviews_retry_key',
    'payment_record_events_one_review_key',
    'payment_record_events_reversal_of_id_key',
    'certificate_events_one_terminal_key',
    'service_request_events_sequence_key',
    'rewards_redemptions_original_debit_id_key',
    'reservations_one_active_property_key',
    'roles_global_code_key',
  ])
    assert.ok(
      catalog.indexes.some((i) => i.name === name),
      name,
    );
  assert.equal(
    catalog.indexes.find((i) => i.name === 'reservations_one_active_property_key')!.predicate,
    "\"status\" IN ('PENDING', 'CONFIRMED')",
  );
  assert.deepEqual(
    catalog.indexes.find((i) => i.name === 'reservations_id_customer_property_key')!.columns,
    ['id', 'customer_id', 'property_id'],
  );
  assert.equal(
    catalog.indexes.filter((i) => i.name === 'rewards_transactions_idempotency_key_key').length,
    1,
  );
  assert.equal(
    catalog.indexes.find((i) => i.name === 'rewards_transactions_idempotency_key_key')!.predicate,
    null,
  );
});
test('all immutable and truncate guards have exact ALWAYS trigger expectations', () => {
  assert.equal(catalog.functions.length, 14);
  assert.equal(catalog.triggers.length, 61);
  const block = sql.match(
    /DO \$connected_immutable_triggers\$([\s\S]+?)\$connected_immutable_triggers\$/,
  )![1];
  const lists = [...block.matchAll(/FOREACH table_name IN ARRAY ARRAY\[([^\]]+)\]/g)].map((m) =>
    [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]),
  );
  assert.deepEqual(sorted(lists[0]), sorted(IMMUTABLE));
  assert.deepEqual(sorted(lists[1]), sorted(NO_TRUNCATE));
  assert.deepEqual(
    sorted(
      catalog.triggers
        .filter((t) => t.name === 'connected_recorded_time_guard')
        .map((t) => t.table),
    ),
    sorted(ADDED),
  );
  const always = sql.match(
    /DO \$connected_always_guards\$([\s\S]+?)\$connected_always_guards\$/,
  )![1];
  assert.deepEqual(
    sorted([...always.matchAll(/\('([^']+)','([^']+)'\)/g)].map((m) => `${m[1]}.${m[2]}`)),
    sorted(
      catalog.triggers
        .filter(
          (t) =>
            ![
              'connected_immutable',
              'connected_no_truncate',
              'connected_recorded_time_guard',
              'aaa_connected_updated_at',
            ].includes(t.name),
        )
        .map((t) => `${t.table}.${t.name}`),
    ),
  );
  for (const table of IMMUTABLE)
    assert.ok(
      catalog.triggers.some(
        (t) => t.table === table && t.name === 'connected_immutable' && t.type === 27,
      ),
    );
  for (const table of NO_TRUNCATE)
    assert.ok(
      catalog.triggers.some(
        (t) => t.table === table && t.name === 'connected_no_truncate' && t.type === 34,
      ),
    );
  assert.equal(
    catalog.triggers.filter((t) => t.name === 'connected_recorded_time_guard').length,
    16,
  );
  assert.match(sql, /ENABLE ALWAYS TRIGGER connected_immutable/);
  assert.match(sql, /ENABLE ALWAYS TRIGGER connected_no_truncate/);
  for (const f of catalog.functions) {
    assert.ok(sql.includes(`REVOKE ALL ON FUNCTION public.${f.name}() FROM PUBLIC;`));
    assert.doesNotMatch(f.body, /current_user\s*=|session_replication_role\s*=/i);
    if (f.name !== 'connected_certificate_event') assert.doesNotMatch(f.body, /current_setting\(/i);
  }
});
test('strict ACL guard covers exactly 16 new tables and all 14 functions', () => {
  const acl = sql.slice(sql.indexOf('DO $connected_acl$'));
  const tableList = acl.match(/application_tables CONSTANT text\[\] := ARRAY\[([\s\S]+?)\]/)![1];
  const functions = acl.match(/trigger_functions CONSTANT text\[\] := ARRAY\[([\s\S]+?)\]/)![1];
  assert.deepEqual(
    sorted([...functions.matchAll(/'([^']+)'/g)].map((m) => m[1])),
    sorted(catalog.functions.map((f) => f.name)),
  );
  assert.deepEqual(sorted([...tableList.matchAll(/'([^']+)'/g)].map((m) => m[1])), sorted(ADDED));
  for (const pattern of [
    /ENABLE ROW LEVEL SECURITY/,
    /REVOKE ALL PRIVILEGES \(%s\) ON TABLE/,
    /REVOKE ALL PRIVILEGES ON FUNCTION/,
    /pg_auth_members/,
    /has_any_column_privilege/,
    /acl.grantee <> c.relowner/,
    /acl.grantee <> p.proowner/,
  ])
    assert.match(acl, pattern);
});
test('manifest binds schema and every migration, deterministically and without environment', () => {
  assert.deepEqual(checkManifest(), manifest());
  const a = manifest();
  assert.equal(a.migrations.length, 8);
  assert.match(a.binding, /^[a-f0-9]{64}$/);
  assert.equal(a.schema.sha256, hash(readFileSync(join(ROOT, 'schema.prisma'))));
  assert.doesNotMatch(JSON.stringify(a), /postgres(?:ql)?:|password|DATABASE_URL|DIRECT_URL/i);
});
test('ledger classifies empty, consistent, drift and failed including rollback/retry cases', () => {
  const m = manifest().migrations;
  const rows = m.map((m) => ({
    migration_name: m.name,
    checksum: m.sha256,
    finished: true,
    rolled_back: false,
  }));
  assert.equal(classifyLedger([], m, 0), 'empty');
  assert.equal(classifyLedger([], m, 1), 'missing');
  assert.equal(classifyLedger(rows, m, 45), 'consistent');
  assert.equal(classifyLedger(rows.slice(1), m, 45), 'missing');
  assert.equal(classifyLedger([...rows, rows[0]], m, 45), 'drift');
  assert.equal(classifyLedger([{ ...rows[0], checksum: 'bad' }, ...rows.slice(1)], m, 45), 'drift');
  assert.equal(classifyLedger([...rows, { ...rows[0], finished: false }], m, 45), 'failed');
  assert.equal(
    classifyLedger([...rows, { ...rows[0], finished: false, rolled_back: true }], m, 45),
    'consistent',
  );
});
const target = [
  '--target-host',
  '127.0.0.1',
  '--target-port',
  '5432',
  '--target-database',
  'cd_synthetic',
  '--target-role',
  'cd_owner',
];
const readArgs = ['--authorize-read-only', ...target];
const disposableArgs = [
  '--authorize-disposable-writes',
  '--confirm-run-owned-initially-empty',
  ...target,
  '--confirm-disposable',
  '127.0.0.1:5432/cd_synthetic',
  '--fixture-role',
  'cd_fixture',
  '--browser-role',
  'cd_browser_a',
  '--browser-role',
  'cd_browser_b',
];
const synthetic = 'postgresql://cd_owner:synthetic-not-a-secret@127.0.0.1:5432/cd_synthetic';
test('authorization and exact host/database/port/role are mandatory, without fallback URLs', () => {
  assert.throws(() => parseArgs(target, 'verify'));
  assert.throws(() => parseArgs(['--authorize-read-only'], 'verify'));
  const o = parseArgs(readArgs, 'verify');
  assert.throws(() => authorizedUrl(o, { DATABASE_URL: synthetic, DIRECT_URL: synthetic }));
  for (const bad of [
    synthetic.replace('127.0.0.1', 'localhost'),
    synthetic.replace('cd_owner:', 'different:'),
    synthetic.replace('5432', '5433'),
    synthetic.replace('/cd_synthetic', '/other'),
  ])
    assert.throws(() => authorizedUrl(o, { [READ_ENV]: bad }));
  assert.match(authorizedUrl(o, { [READ_ENV]: synthetic }), /default_transaction_read_only/);
  for (const param of [
    'host=elsewhere',
    'schema=other',
    'options=-c%20role%3Dother',
    'sslcert=file',
    'pgbouncer=true',
  ])
    assert.throws(() => authorizedUrl(o, { [READ_ENV]: `${synthetic}?${param}` }));
  assert.throws(() => parseArgs([...readArgs, '--apply-defaults'], 'verify'));
});
test('disposable requires exact numeric loopback confirmation and distinct precreated roles', () => {
  assert.doesNotThrow(() =>
    authorizedUrl(parseArgs(disposableArgs, 'disposable'), { [DISPOSABLE_ENV]: synthetic }),
  );
  assert.throws(() =>
    parseArgs(
      disposableArgs.map((s) => (s === '127.0.0.1' ? 'localhost' : s)),
      'disposable',
    ),
  );
  assert.throws(() =>
    parseArgs(
      disposableArgs.map((s) => (s === '127.0.0.1:5432/cd_synthetic' ? '127.0.0.1:5432/other' : s)),
      'disposable',
    ),
  );
  assert.throws(() =>
    parseArgs(
      disposableArgs.map((s) => (s === 'cd_fixture' ? 'cd_owner' : s)),
      'disposable',
    ),
  );
  assert.throws(() =>
    authorizedUrl(parseArgs(disposableArgs, 'disposable'), { [READ_ENV]: synthetic }),
  );
});
test('error output cannot leak a raw SQL/driver error, URL or customer content', () => {
  const report = JSON.stringify(safeFailure('read-only'));
  assert.doesNotMatch(report, /synthetic-not-a-secret|postgresql:\/\/|SELECT \*/);
  assert.match(report, /not-proven/);
  for (const file of [
    'connected-domain-verify.ts',
    'connected-domain-disposable.ts',
    'connected-domain-upgrade.ts',
  ]) {
    const code = readFileSync(join(ROOT, file), 'utf8');
    assert.doesNotMatch(code, /console\.(?:log|error)\((?:error|url|sql|ledger)\)/);
  }
});
test('all three CLI entrypoints reject absent authorization before constructing a client', () => {
  for (const file of [
    'connected-domain-verify.ts',
    'connected-domain-disposable.ts',
    'connected-domain-upgrade.ts',
  ]) {
    // No .env loader and no network: even a dedicated URL cannot pass absent CLI gates.
    const result = spawnSync(process.execPath, ['--import', 'tsx', join(ROOT, file)], {
      cwd: join(ROOT, '..'),
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, [READ_ENV]: synthetic, [DISPOSABLE_ENV]: synthetic },
    });
    assert.equal(result.status, 2, result.stderr);
    const report = JSON.parse(result.stderr.trim());
    assert.equal(report.error, 'VERIFICATION_FAILED_OR_GATE_REJECTED');
    assert.equal(result.stdout, '');
  }
});
test('Prisma env loading disabled for both paths; read-only txn and exact server confirmation enforced', () => {
  const code = readFileSync(join(ROOT, 'connected-domain-gates.ts'), 'utf8');
  for (const pattern of [
    /relativeEnvPaths:\s*\{\s*rootEnvPath:\s*undefined,\s*schemaEnvPath:\s*undefined\s*\}/,
    /prismaVersion.client\s*!==\s*'5.22.0'/,
    /SET TRANSACTION READ ONLY/,
    /statement_timeout/,
    /lock_timeout/,
    /idle_in_transaction_session_timeout/,
    /r.session\s*!==\s*options.role/,
  ])
    assert.ok(pattern.test(code), pattern.source);
  assert.doesNotMatch(code, /dotenv|process\.env\.(?:DATABASE_URL|DIRECT_URL)/);
});
test('executable disposable fixtures cover all new tables and representative negative paths', () => {
  const fixture = readFileSync(join(ROOT, 'connected-domain-fixtures.sql'), 'utf8');
  const list = statements(fixture);
  assert.ok(list.length > 80);
  for (const table of ADDED) assert.match(fixture, new RegExp(`INSERT INTO public\\.${table}\\(`));
  assert.ok((fixture.match(/cd_expect\(/g) || []).length >= 40);
  for (const text of [
    '23503',
    '23505',
    '23514',
    'two',
    'original_debit_id',
    'reversal_of_id',
    'read_at IS NULL',
    'accepted_terms_snapshot IS NULL',
    'TRUNCATE public.service_request_events',
  ])
    assert.ok(fixture.includes(text), text);
  const runner = readFileSync(join(ROOT, 'connected-domain-disposable.ts'), 'utf8');
  assert.match(runner, /throw ROLLBACK/);
  assert.match(runner, /CREATE POLICY connected_domain_fixture_only/);
  assert.match(runner, /SET LOCAL ROLE/);
  assert.doesNotMatch(runner, /CREATE ROLE|DROP SCHEMA|migrate deploy|\.\$connect\(/);
});
test('expression checks do not silently erase semantically significant syntax', () => {
  assert.notEqual(exactExpression('a AND (b OR c)'), exactExpression('(a AND b) OR c'));
  assert.notEqual(exactExpression('amount > 0'), exactExpression('amount >= 0'));
  assert.notEqual(exactExpression('x::text'), exactExpression('x'));
});
test('SQL splitter retains dollar-quoted function bodies and separates top-level commands', () => {
  const parts = statements(
    'BEGIN; CREATE FUNCTION f() RETURNS void AS $$ BEGIN PERFORM 1; END $$ LANGUAGE plpgsql; COMMIT;',
  );
  assert.equal(parts.length, 3);
  assert.match(parts[1], /PERFORM 1;/);
  assert.throws(() => statements('DO $missing$ body;'));
  assert.deepEqual(statements("-- outer comment\nSELECT '--literal;value';"), [
    "SELECT '--literal;value'",
  ]);
});
