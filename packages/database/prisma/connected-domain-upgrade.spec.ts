import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertNullableExtensions,
  compareDigests,
  parseUpgradeArgs,
  phaseGuard,
  snapshotDigests,
  targetBinding,
  validateSnapshot,
  type Snapshot,
} from './connected-domain-upgrade';
import { expectedStructure, defaultSpellings } from './connected-domain-structure';
import {
  checkManifest,
  classifyLedger,
  expectedCatalog,
  MIGRATION,
  RETAINED,
  ROOT,
  TABLES,
  statements,
  sources,
} from './connected-domain-source';
import type { Tx } from './connected-domain-gates';
const gates = [
  '--authorize-disposable-writes',
  '--confirm-run-owned-initially-empty',
  '--target-host',
  '127.0.0.1',
  '--target-port',
  '5432',
  '--target-database',
  'cd_synthetic',
  '--target-role',
  'cd_owner',
  '--confirm-disposable',
  '127.0.0.1:5432/cd_synthetic',
  '--fixture-role',
  'cd_fixture',
  '--browser-role',
  'cd_browser_a',
  '--browser-role',
  'cd_browser_b',
];
const id = '11111111-1111-1111-1111-111111111111';
const args = (phase = 'prepare') => [
  '--phase',
  phase,
  '--snapshot-id',
  id,
  ...(phase === 'prepare' ? ['--confirm-preserve-synthetic-baseline'] : []),
  ...gates,
];
const digests = () => RETAINED.map((table) => ({ table, count: '1', sha256: 'a'.repeat(64) }));
function snapshot(): Snapshot {
  const o = parseUpgradeArgs(args());
  return {
    format: 1,
    state: 'committed',
    snapshotId: id,
    sourceBinding: checkManifest().binding,
    targetBinding: targetBinding(o.target),
    databaseOid: '12345',
    tables: digests(),
  };
}

test('upgrade preparation has an explicit persistence gate; compare cannot imply writes', () => {
  assert.doesNotThrow(() => parseUpgradeArgs(args()));
  assert.doesNotThrow(() => parseUpgradeArgs(args('compare')));
  assert.throws(() =>
    parseUpgradeArgs(args().filter((x) => x !== '--confirm-preserve-synthetic-baseline')),
  );
  assert.throws(() =>
    parseUpgradeArgs([...args('compare'), '--confirm-preserve-synthetic-baseline']),
  );
  assert.throws(() =>
    parseUpgradeArgs(args().filter((x) => x !== '--authorize-disposable-writes')),
  );
  assert.throws(() => parseUpgradeArgs(args().map((x) => (x === id ? '../../outside' : x))));
  assert.throws(() =>
    parseUpgradeArgs(args().map((x) => (x === '127.0.0.1' ? 'db.example.invalid' : x))),
  );
});
test('snapshot accepts only committed same-source same-target UUID-bound digest artifacts', () => {
  const o = parseUpgradeArgs(args());
  const good = snapshot();
  assert.deepEqual(validateSnapshot(good, o), good);
  for (const change of [
    { state: 'prepared-not-commit-proven' },
    { sourceBinding: 'bad' },
    { targetBinding: 'bad' },
    { snapshotId: 'other' },
    { databaseOid: 'contents' },
    { tables: good.tables.slice(1) },
    { tables: good.tables.map((t) => ({ ...t, count: '2' })) },
  ])
    assert.throws(() => validateSnapshot({ ...good, ...change }, o));
  const safe = validateSnapshot(
    { ...good, password: 'synthetic-do-not-output', rows: ['synthetic-content'] },
    o,
  );
  assert.doesNotMatch(JSON.stringify(safe), /synthetic-do-not-output|synthetic-content/);
});
test('aggregate count/hash comparison detects mutation, deletion, additions and missing tables', () => {
  const before = digests();
  assert.equal(compareDigests(before, [...before].reverse()), true);
  assert.equal(compareDigests(before, before.slice(1)), false);
  assert.equal(
    compareDigests(
      before,
      before.map((d, i) => (i === 0 ? { ...d, count: '2' } : d)),
    ),
    false,
  );
  assert.equal(
    compareDigests(
      before,
      before.map((d, i) => (i === 0 ? { ...d, sha256: 'b'.repeat(64) } : d)),
    ),
    false,
  );
});
test('snapshot SQL hashes in PostgreSQL and only projects historical columns', async () => {
  const sqls: string[] = [];
  const tx: Tx = {
    $executeRawUnsafe: async () => {
      throw new Error('NO_WRITES');
    },
    $queryRawUnsafe: async <T>(sql: string) => {
      sqls.push(sql);
      return [{ count: '1', sha256: 'a'.repeat(64) }] as T;
    },
  };
  const result = await snapshotDigests(tx);
  assert.equal(result.length, 29);
  assert.equal(sqls.length, 29);
  for (const sql of sqls) {
    assert.match(sql, /^SELECT count\(\*\)::text/);
    assert.match(sql, /encode\(sha256\(/);
    assert.doesNotMatch(
      sql,
      /"read_at"|"benefit_company_id"|"accepted_terms_snapshot"|"original_debit_id"|SELECT \*/,
    );
  }
});
test('nullable extension comparison covers read_at and all five redemption columns', async () => {
  let seen = '';
  const tx: Tx = {
    $executeRawUnsafe: async () => {
      throw new Error('NO_WRITES');
    },
    $queryRawUnsafe: async <T>(sql: string) => {
      seen = sql;
      return [{ preserved: true }] as T;
    },
  };
  await assertNullableExtensions(tx);
  for (const name of [
    'read_at',
    'benefit_id',
    'benefit_company_id',
    'original_debit_id',
    'accepted_points_cost',
    'accepted_terms_snapshot',
  ])
    assert.ok(seen.includes(name));
  await assert.rejects(() =>
    assertNullableExtensions({
      ...tx,
      $queryRawUnsafe: async <T>() => [{ preserved: false }] as T,
    }),
  );
});
for (const phase of ['prepare', 'compare'])
  test(`upgrade ${phase} requires exact migration stage and owner tables`, async () => {
    const o = parseUpgradeArgs(args(phase));
    const tables = phase === 'prepare' ? RETAINED : TABLES;
    const ledger = checkManifest()
      .migrations.filter((m) => phase === 'compare' || m.name !== MIGRATION)
      .map((m) => ({
        migration_name: m.name,
        checksum: m.sha256,
        finished: true,
        rolled_back: false,
      }));
    const results = [
      [...tables, '_prisma_migrations'].map((name) => ({ name })),
      ledger,
      [{ safe: true }],
      [{ oid: '12345' }],
    ];
    let index = 0;
    const tx: Tx = {
      $executeRawUnsafe: async () => 0,
      $queryRawUnsafe: async <T>() => results[index++] as T,
    };
    assert.equal(await phaseGuard(tx, o), '12345');
    index = 0;
    results[0] = results[0].slice(1);
    await assert.rejects(() => phaseGuard(tx, o));
  });
test('baseline fixture populates all 29 historical tables with required fields, not new fields', () => {
  const sql = readFileSync(join(ROOT, 'connected-domain-upgrade-fixtures.sql'), 'utf8');
  const inserts = [...sql.matchAll(/INSERT INTO public\.(\w+)\(([^)]+)\)/g)];
  assert.equal(inserts.length, 29);
  assert.deepEqual(inserts.map((m) => m[1]).sort(), [...RETAINED].sort());
  const expected = expectedStructure(false).columns;
  for (const m of inserts) {
    const fields = m[2].split(',');
    const columns = expected.filter((c) => c.table === m[1]);
    assert.ok(
      fields.every((f) => columns.some((c) => c.name === f)),
      m[1],
    );
    for (const c of columns.filter((c) => !c.nullable && c.default_sql === null))
      assert.ok(fields.includes(c.name), `${m[1]}.${c.name}`);
  }
  for (const s of statements(sql))
    assert.doesNotMatch(s, /^(UPDATE|DELETE|TRUNCATE|DROP|GRANT|ALTER)\b/);
});
test('structure replay preserves the historical 280 columns and adds exactly 192', () => {
  const old = expectedStructure(false),
    now = expectedStructure();
  assert.equal(old.columns.length, 280);
  assert.equal(now.columns.length, 472);
  assert.equal(old.enums.length, 18);
  assert.equal(now.enums.length, 29);
  for (const c of old.columns)
    assert.deepEqual(
      now.columns.find((n) => n.table === c.table && n.name === c.name),
      c,
    );
  assert.ok(!now.columns.some((c) => c.name === 'password_hash'));
  assert.equal(
    old.columns.find((c) => c.table === 'rewards_transactions' && c.name === 'transaction_number')!
      .nullable,
    false,
  );
});
test('finite default spellings never strip arbitrary SQL casts', () => {
  const c = expectedStructure().columns.find(
    (c) => c.table === 'documents' && c.name === 'created_at',
  )!;
  assert.ok(defaultSpellings(c).includes("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text)"));
  assert.ok(!defaultSpellings(c).includes("(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila'::text)"));
  assert.ok(!defaultSpellings(c).includes('clock_timestamp()'));
});
test('new trigger scope, UTC stamping, serializable lifecycle and derived company scope are explicit', () => {
  const sql = sources().find((m) => m.name === MIGRATION)!.sql,
    c = expectedCatalog();
  assert.equal(c.functions.length, 14);
  assert.equal(c.triggers.filter((t) => t.name === 'aaa_connected_updated_at').length, 7);
  assert.deepEqual(
    c.triggers.find((t) => t.name === 'connected_notification_read_time_guard')!.updateColumns,
    ['read_at'],
  );
  assert.ok(c.triggers.some((t) => t.name === 'connected_milestone_scope'));
  assert.match(sql, /current_setting\('transaction_isolation'\) <> 'serializable'/);
  assert.match(sql, /ERRCODE = '25000'/);
  assert.match(sql, /NEW.benefit_company_id := benefit.company_id/);
  for (const name of [
    'rewards_redemptions_scoped_account_fkey',
    'rewards_redemptions_scoped_benefit_fkey',
  ]) {
    const f = c.constraints.find((f) => f.name === name)!;
    assert.deepEqual(f.references, ['id', 'company_id']);
    assert.equal(f.onUpdate, 'RESTRICT');
  }
});
test('ledger distinguishes a valid historical prefix, missing history, drift and unfinished runs', () => {
  const m = checkManifest().migrations,
    rows = m.map((m) => ({
      migration_name: m.name,
      checksum: m.sha256,
      finished: true,
      rolled_back: false,
    }));
  assert.equal(classifyLedger(rows.slice(0, 7), m, 29), 'pending');
  assert.equal(classifyLedger(rows.slice(1), m, 45), 'missing');
  assert.equal(classifyLedger([], m, 29), 'missing');
  assert.equal(classifyLedger([{ ...rows[0], finished: false }], m, 0), 'failed');
});
