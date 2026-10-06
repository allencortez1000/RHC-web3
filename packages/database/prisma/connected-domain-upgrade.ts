import {
  closeSync,
  fsyncSync,
  ftruncateSync,
  lstatSync,
  openSync,
  readFileSync,
  writeSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  checkManifest,
  classifyLedger,
  hash,
  MIGRATION,
  RETAINED,
  ROOT,
  TABLES,
  statements,
  type LedgerRow,
} from './connected-domain-source';
import { expectedStructure } from './connected-domain-structure';
import {
  authorizedUrl,
  clientFor,
  confirmTransaction,
  help,
  identifier,
  parseArgs,
  safeFailure,
  type Options,
  type Tx,
} from './connected-domain-gates';
import { rolePreflight } from './connected-domain-disposable';

/** Operator sequence (NOT RUN):
 * 1. Provision run-owned initially EMPTY loopback DB and three restricted roles.
 * 2. Manually deploy exactly the seven historical migrations from an isolated,
 *    operator-staged migrations directory. No command here deploys or resets.
 * 3. npm run db:connected-domain:upgrade -w @rhc/database -- --phase prepare
 *    --snapshot-id UUID --confirm-preserve-synthetic-baseline [DISPOSABLE_GATES]
 *    Deliberately commits one synthetic row in EACH retained table, but only if
 *    all 29 tables are empty. Persists only local counts/digests, never row contents.
 * 4. Separately authorize and manually deploy the final eighth migration.
 * 5. Same command with --phase compare --snapshot-id SAME_UUID [DISPOSABLE_GATES].
 *    Compare uses READ ONLY; exact old-column projections and six new NULL fields
 *    are checked. Synthetic baseline rows remain; no cleanup or deletion is offered.
 * 6. Run the separate rollback disposable suite, if authorized.
 * DISPOSABLE_GATES are all flags from connected-domain-disposable --help, with
 * CONNECTED_DOMAIN_DISPOSABLE_URL supplied explicitly; no env files are loaded.
 * Artifacts are connected-domain-snapshot-UUID.json beside this source. Never
 * overwrite/reuse an ID. A failed/ambiguous prepare leaves a non-accepting local
 * marker: do not retry against its now-possibly-populated DB or infer commit success.
 */
export type UpgradeOptions = { target: Options; phase: 'prepare' | 'compare'; snapshotId: string };
export function parseUpgradeArgs(argv: readonly string[]): UpgradeOptions {
  const forwarded: string[] = [];
  const values = new Map<string, string>();
  let preserve = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--confirm-preserve-synthetic-baseline') {
      if (preserve) throw new Error('DUPLICATE_CONFIRMATION');
      preserve = true;
      continue;
    }
    if (a === '--phase' || a === '--snapshot-id') {
      if (values.has(a) || !argv[i + 1] || argv[i + 1].startsWith('--'))
        throw new Error('INVALID_UPGRADE_ARGUMENT');
      values.set(a, argv[++i]);
    } else forwarded.push(a);
  }
  const phase = values.get('--phase'),
    snapshotId = values.get('--snapshot-id') || '';
  if (phase !== 'prepare' && phase !== 'compare') throw new Error('EXPLICIT_PHASE_REQUIRED');
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(snapshotId))
    throw new Error('SNAPSHOT_UUID_REQUIRED');
  if ((phase === 'prepare') !== preserve)
    throw new Error('EXPLICIT_PERSISTENT_BASELINE_CONFIRMATION_REQUIRED');
  return { target: parseArgs(forwarded, 'disposable'), phase, snapshotId };
}
export type Digest = { table: string; count: string; sha256: string };
export type Snapshot = {
  format: 1;
  state: 'committed';
  snapshotId: string;
  sourceBinding: string;
  targetBinding: string;
  databaseOid: string;
  tables: Digest[];
};
export function targetBinding(o: Options) {
  return hash(JSON.stringify([o.host, o.port, o.database, o.role]));
}
export function validateSnapshot(value: unknown, o: UpgradeOptions): Snapshot {
  const s = value as Snapshot;
  if (
    !s ||
    s.format !== 1 ||
    s.state !== 'committed' ||
    s.snapshotId !== o.snapshotId ||
    s.sourceBinding !== checkManifest().binding ||
    s.targetBinding !== targetBinding(o.target) ||
    !/^\d+$/.test(s.databaseOid) ||
    !Array.isArray(s.tables) ||
    s.tables.length !== 29
  )
    throw new Error('SNAPSHOT_BINDING_INVALID');
  if (
    new Set(s.tables.map((t) => t.table)).size !== 29 ||
    s.tables.some(
      (t) =>
        !(RETAINED as readonly string[]).includes(t.table) ||
        t.count !== '1' ||
        !/^[a-f0-9]{64}$/.test(t.sha256),
    )
  )
    throw new Error('SNAPSHOT_DIGESTS_INVALID');
  // Return only the allowlisted fields, even for a locally modified artifact.
  return {
    format: 1,
    state: 'committed',
    snapshotId: s.snapshotId,
    sourceBinding: s.sourceBinding,
    targetBinding: s.targetBinding,
    databaseOid: s.databaseOid,
    tables: s.tables.map((t) => ({ table: t.table, count: t.count, sha256: t.sha256 })),
  };
}
export async function phaseGuard(tx: Tx, o: UpgradeOptions) {
  const expected = o.phase === 'prepare' ? RETAINED : TABLES;
  const rows = await tx.$queryRawUnsafe<{ name: string }[]>(
    `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')`,
  );
  if (
    rows.length !== expected.length + 1 ||
    !rows.some((r) => r.name === '_prisma_migrations') ||
    expected.some((t) => !rows.some((r) => r.name === t))
  )
    throw new Error('UPGRADE_STAGE_TABLES_MISMATCH');
  const ledger = await tx.$queryRawUnsafe<LedgerRow[]>(
    'SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations',
  );
  const migrations = checkManifest().migrations.filter(
    (m) => o.phase === 'compare' || m.name !== MIGRATION,
  );
  if (
    migrations.length !== (o.phase === 'prepare' ? 7 : 8) ||
    classifyLedger(ledger, migrations, expected.length) !== 'consistent'
  )
    throw new Error('UPGRADE_STAGE_LEDGER_MISMATCH');
  await rolePreflight(tx, o.target, expected);
  const db = await tx.$queryRawUnsafe<{ oid: string }[]>(
    'SELECT oid::text AS oid FROM pg_database WHERE datname=current_database()',
  );
  if (!/^\d+$/.test(db[0]?.oid)) throw new Error('DATABASE_IDENTITY_UNAVAILABLE');
  return db[0].oid;
}
export async function snapshotDigests(tx: Tx): Promise<Digest[]> {
  const columns = expectedStructure(false).columns;
  const results: Digest[] = [];
  for (const table of RETAINED) {
    const projection = columns
      .filter((c) => c.table === table)
      .map((c) => identifier(c.name))
      .join(',');
    if (!projection) throw new Error('BASELINE_COLUMN_PROJECTION_MISSING');
    // Hash inside PostgreSQL. No business values, row JSON, IDs or per-row hashes
    // cross the driver boundary. Sorted row hashes encode a deterministic multiset.
    const rows = await tx.$queryRawUnsafe<{ count: string; sha256: string }[]>(
      `SELECT count(*)::text AS count,encode(sha256(convert_to(coalesce(string_agg(row_hash,'' ORDER BY row_hash),''),'UTF8')),'hex') AS sha256 FROM (SELECT encode(sha256(convert_to(to_jsonb(projected)::text,'UTF8')),'hex') AS row_hash FROM (SELECT ${projection} FROM public.${identifier(table)}) projected) hashed`,
    );
    const r = rows[0];
    if (!r || !/^\d+$/.test(r.count) || !/^[a-f0-9]{64}$/.test(r.sha256))
      throw new Error('INVALID_SNAPSHOT_RESULT');
    results.push({ table, count: r.count, sha256: r.sha256 });
  }
  return results;
}
export function compareDigests(before: Digest[], after: Digest[]) {
  return (
    before.length === 29 &&
    after.length === 29 &&
    new Set(before.map((t) => t.table)).size === 29 &&
    new Set(after.map((t) => t.table)).size === 29 &&
    before.every((b) =>
      after.some((a) => a.table === b.table && a.count === b.count && a.sha256 === b.sha256),
    )
  );
}
export async function assertNullableExtensions(tx: Tx) {
  const rows = await tx.$queryRawUnsafe<{ preserved: boolean }[]>(
    `SELECT NOT EXISTS(SELECT 1 FROM public.notifications WHERE read_at IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM public.rewards_redemptions WHERE benefit_id IS NOT NULL OR benefit_company_id IS NOT NULL OR original_debit_id IS NOT NULL OR accepted_points_cost IS NOT NULL OR accepted_terms_snapshot IS NOT NULL) AS preserved`,
  );
  if (rows[0]?.preserved !== true) throw new Error('LEGACY_NULL_EXTENSIONS_CHANGED');
}
export async function run(o: UpgradeOptions) {
  const binding = checkManifest();
  const url = authorizedUrl(o.target, process.env);
  const path = join(ROOT, `connected-domain-snapshot-${o.snapshotId}.json`);
  let before: Snapshot | undefined;
  if (o.phase === 'compare') {
    if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())
      throw new Error('SNAPSHOT_NOT_LOCAL_REGULAR_FILE');
    before = validateSnapshot(JSON.parse(readFileSync(path, 'utf8')), o);
  }
  // Exclusive local creation happens only after all CLI/env/source gates. No paths
  // supplied by the operator are accepted, so UNC/network snapshot paths cannot run.
  const fd = o.phase === 'prepare' ? openSync(path, 'wx', 0o600) : undefined;
  const persist = (value: unknown) => {
    if (fd === undefined) throw new Error('SNAPSHOT_NOT_WRITABLE');
    ftruncateSync(fd, 0);
    writeSync(fd, JSON.stringify(value, null, 2) + '\n', 0, 'utf8');
    fsyncSync(fd);
  };
  let client: Awaited<ReturnType<typeof clientFor>> | undefined;
  try {
    if (fd !== undefined)
      persist({ format: 1, state: 'outcome-unknown', snapshotId: o.snapshotId });
    client = await clientFor(url);
    const captured = await client.$transaction(
      async (tx) => {
        await confirmTransaction(
          tx,
          o.phase === 'compare' ? { ...o.target, mode: 'verify' } : o.target,
        );
        await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
        await tx.$executeRawUnsafe("SET LOCAL DateStyle = 'ISO, YMD'");
        await tx.$executeRawUnsafe('SET LOCAL extra_float_digits = 3');
        const databaseOid = await phaseGuard(tx, o);
        if (o.phase === 'prepare') {
          await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(610060001)');
          // Lock all retained tables in a stable order before the emptiness check.
          // No existing business data is ever hashed by the preparation phase.
          await tx.$executeRawUnsafe(
            `LOCK TABLE ${[...RETAINED]
              .sort()
              .map((t) => `public.${identifier(t)}`)
              .join(',')} IN ACCESS EXCLUSIVE MODE`,
          );
          // READ COMMITTED refreshes visibility after lock acquisition. A snapshot
          // taken by role/catalog preflight must not hide a concurrent committed row.
          await phaseGuard(tx, o);
          for (const table of RETAINED) {
            const rows = await tx.$queryRawUnsafe<{ empty: boolean }[]>(
              `SELECT NOT EXISTS(SELECT 1 FROM public.${identifier(table)}) AS empty`,
            );
            if (rows[0]?.empty !== true) throw new Error('BASELINE_TABLES_MUST_BE_EMPTY');
          }
          for (const sql of statements(
            readFileSync(join(ROOT, 'connected-domain-upgrade-fixtures.sql'), 'utf8'),
          ))
            await tx.$executeRawUnsafe(sql);
        } else if (databaseOid !== before!.databaseOid)
          throw new Error('SNAPSHOT_DATABASE_RECREATED');
        const tables = await snapshotDigests(tx);
        if (o.phase === 'compare') {
          if (!compareDigests(before!.tables, tables)) throw new Error('BASELINE_DATA_DRIFT');
          await assertNullableExtensions(tx);
        } else {
          if (tables.some((t) => t.count !== '1'))
            throw new Error('BASELINE_FIXTURE_COUNTS_INVALID');
          persist({
            format: 1,
            state: 'prepared-not-commit-proven',
            snapshotId: o.snapshotId,
            sourceBinding: binding.binding,
            targetBinding: targetBinding(o.target),
            databaseOid,
            tables,
          });
        }
        return { databaseOid, tables };
      },
      {
        maxWait: 5000,
        timeout: 120000,
        isolationLevel: o.phase === 'prepare' ? 'ReadCommitted' : 'Serializable',
      },
    );
    if (o.phase === 'prepare')
      persist({
        format: 1,
        state: 'committed',
        snapshotId: o.snapshotId,
        sourceBinding: binding.binding,
        targetBinding: targetBinding(o.target),
        ...captured,
      } satisfies Snapshot);
    return {
      mode: 'disposable-upgrade',
      phase: o.phase,
      status: o.phase === 'prepare' ? 'synthetic-baseline-committed' : 'baseline-preserved',
      snapshotFile: `connected-domain-snapshot-${o.snapshotId}.json`,
      tables: captured.tables,
      sourceBinding: binding.binding,
      deploysMigrations: false,
      cleanup: 'none; synthetic rows intentionally retained in run-owned disposable database',
      runtimeAccess: 'not-assessed',
      limitations: [
        'No migration deployment is automated or authorized by these commands',
        'Snapshot success does not certify CHECK/trigger semantics or hosted policy',
      ],
    };
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (client) await client.$disconnect();
  }
}
if (require.main === module)
  void (async () => {
    try {
      if (process.argv.slice(2).join(' ') === '--help') {
        console.log(
          JSON.stringify(
            {
              ...help('disposable'),
              mode: 'disposable-upgrade',
              disposableCleanup:
                'none; prepare intentionally commits synthetic rows; compare is read-only',
              phaseFlags: [
                '--phase prepare --snapshot-id UUID --confirm-preserve-synthetic-baseline',
                '--phase compare --snapshot-id UUID',
              ],
              prepareCommits: true,
              compareReadOnly: true,
              snapshotContents: 'local counts and aggregate SHA-256 only; no row content',
            },
            null,
            2,
          ),
        );
        return;
      }
      console.log(JSON.stringify(await run(parseUpgradeArgs(process.argv.slice(2))), null, 2));
    } catch {
      console.error(JSON.stringify(safeFailure('disposable-upgrade')));
      process.exitCode = 2;
    }
  })();
