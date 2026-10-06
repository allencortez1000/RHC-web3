import {
  checkManifest,
  classifyLedger,
  expectedCatalog,
  hash,
  TABLES,
  ADDED,
  RETAINED,
  type LedgerRow,
} from './connected-domain-source';
import {
  authorizedUrl,
  clientFor,
  confirmTransaction,
  help,
  parseArgs,
  safeFailure,
  type Tx,
  type Options,
} from './connected-domain-gates';

import { expectedStructure, structuralDifferences } from './connected-domain-structure';

type Row = Record<string, unknown>;
export function ledgerDetails(
  rows: LedgerRow[],
  expected: ReturnType<typeof checkManifest>['migrations'],
  populatedWithoutLedger = false,
) {
  const safeDate = (value: unknown) => {
    if (!(value instanceof Date) && !(typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)))
      return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  };
  const applied = rows.filter((r) => !r.rolled_back && r.finished);
  const absent = expected.filter((e) => !applied.some((r) => r.migration_name === e.name));
  const lastIndex = Math.max(
    -1,
    ...applied.map((r) => expected.findIndex((e) => e.name === r.migration_name)),
  );
  return {
    missing: absent
      .filter((e) => populatedWithoutLedger || expected.indexOf(e) < lastIndex)
      .map((e) => e.name),
    pending: absent
      .filter((e) => !populatedWithoutLedger && expected.indexOf(e) > lastIndex)
      .map((e) => e.name),
    unexpectedRecords: rows.filter((r) => !expected.some((e) => e.name === r.migration_name))
      .length,
    records: rows
      .filter((r) => expected.some((e) => e.name === r.migration_name))
      .map((r) => ({
        name: r.migration_name,
        id:
          typeof r.id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(r.id)
            ? r.id
            : null,
        startedAt: safeDate(r.started_at),
        finishedAt: safeDate(r.finished_at),
        rolledBackAt: safeDate(r.rolled_back_at),
        state: r.rolled_back ? 'rolled-back' : r.finished ? 'applied' : 'failed-or-incomplete',
        checksumMatches: expected.some(
          (e) => e.name === r.migration_name && e.sha256 === r.checksum,
        ),
      })),
  };
}
const query = (tx: Tx, sql: string, ...values: unknown[]) =>
  tx.$queryRawUnsafe<Row[]>(sql, ...values);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Deliberately conservative: parentheses/casts/operator order are NOT erased.
 * PostgreSQL deparser differences are reported as unverified, never equivalent.
 * Catalog expressions/bodies stay in memory and are never printed. */
export function exactExpression(value: string) {
  return value.trim().replace(/\r\n/g, '\n');
}
export async function catalogReport(tx: Tx, options: Options) {
  const binding = checkManifest();
  const tables = await query(
    tx,
    `SELECT c.relname AS name,c.relkind::text AS kind,c.relrowsecurity AS rls,c.relforcerowsecurity AS forced FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')`,
  );
  const exists = tables.some((t) => t.name === '_prisma_migrations');
  const ledger = exists
    ? await tx.$queryRawUnsafe<LedgerRow[]>(
        `SELECT id,migration_name,checksum,started_at,finished_at,rolled_back_at,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations ORDER BY started_at,id`,
      )
    : [];
  const state = classifyLedger(
    ledger,
    binding.migrations,
    tables.filter((t) => TABLES.includes(t.name as (typeof TABLES)[number])).length,
  );
  const baselineStage =
    state === 'pending' &&
    ledger.filter((r) => r.finished && !r.rolled_back).length === 7 &&
    !tables.some((t) => (ADDED as readonly unknown[]).includes(t.name));
  const expected = expectedCatalog(!baselineStage);
  const expectedTables = baselineStage ? RETAINED : TABLES;
  const structure = expectedStructure(!baselineStage);
  const constraints = await query(
    tx,
    `SELECT c.relname AS table,k.conname AS name,k.contype::text AS kind,k.convalidated AS validated,k.condeferrable AS deferrable,k.condeferred AS deferred,
    ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY x(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.num ORDER BY x.ord) AS columns,
    r.relname AS target,rn.nspname AS target_schema,ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY x(num,ord) JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum=x.num ORDER BY x.ord) AS references,
    k.confdeltype::text AS delete_action,k.confupdtype::text AS update_action,k.confmatchtype::text AS match_type,pg_get_expr(k.conbin,k.conrelid) AS expression
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_class r ON r.oid=k.confrelid LEFT JOIN pg_namespace rn ON rn.oid=r.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::text[])`,
    TABLES,
  );
  const indexes = await query(
    tx,
    `SELECT c.relname AS table,ic.relname AS name,i.indisunique AS unique,i.indisvalid AS valid,i.indisready AS ready,i.indisprimary AS primary,i.indnatts::int AS attributes,i.indnkeyatts::int AS keys,am.amname AS method,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY x(num,ord) LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.num ORDER BY x.ord) AS columns,
    pg_get_expr(i.indpred,i.indrelid) AS predicate,i.indexprs IS NULL AS plain,
    NOT EXISTS(SELECT 1 FROM unnest(i.indoption) x WHERE x<>0) AS default_order,
    NOT EXISTS(SELECT 1 FROM unnest(i.indclass) x JOIN pg_opclass op ON op.oid=x WHERE NOT op.opcdefault) AS default_opclass
    FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_am am ON am.oid=ic.relam WHERE n.nspname='public' AND c.relname=ANY($1::text[])`,
    TABLES,
  );
  const triggers = await query(
    tx,
    `SELECT c.relname AS table,t.tgname AS name,t.tgtype::int AS type,t.tgenabled::text AS enabled,p.proname AS fn,pn.nspname AS function_schema,encode(t.tgargs,'hex') AS args,t.tgqual IS NULL AS unconditional,ARRAY(SELECT a.attname::text FROM unnest(t.tgattr) WITH ORDINALITY x(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.num ORDER BY x.ord) AS update_columns FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND NOT t.tgisinternal`,
    TABLES,
  );
  const functions = await query(
    tx,
    `SELECT p.proname AS name,p.prosrc AS body,p.prosecdef AS definer,p.proconfig AS config,l.lanname AS language,p.prorettype='trigger'::regtype AS trigger_result,p.pronargs::int AS nargs FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname=ANY($1::text[])`,
    expected.functions.map((f) => f.name),
  );
  const issues: string[] = [];
  const unverified: string[] = [];
  for (const name of expectedTables) {
    const t = tables.find((t) => t.name === name);
    if (!t || t.kind !== 'r' || !t.rls || t.forced) issues.push(`table:${name}`);
  }
  for (const c of expected.constraints) {
    const actual = constraints.find((a) => a.table === c.table && a.name === c.name);
    if (
      !actual ||
      actual.kind !== c.kind ||
      !actual.validated ||
      actual.deferrable ||
      actual.deferred
    ) {
      issues.push(`constraint:${c.name}`);
      continue;
    }
    if (c.kind === 'c') {
      if (exactExpression(String(actual.expression)) !== exactExpression(c.expression!))
        unverified.push(`check:${c.name}`);
    } else {
      if (!equal(actual.columns, c.columns)) issues.push(`constraint-columns:${c.name}`);
      if (c.kind === 'f') {
        const action: Record<string, string> = { RESTRICT: 'r', CASCADE: 'c', 'SET NULL': 'n' };
        if (
          actual.target !== c.target ||
          actual.target_schema !== 'public' ||
          !equal(actual.references, c.references) ||
          actual.delete_action !== action[c.onDelete!] ||
          actual.update_action !== action[c.onUpdate!] ||
          actual.match_type !== 's'
        )
          issues.push(`foreign-key:${c.name}`);
      }
    }
  }
  for (const p of expected.constraints.filter((c) => c.kind === 'p')) {
    const a = indexes.find((a) => a.table === p.table && a.name === p.name);
    if (
      !a ||
      !a.primary ||
      !a.unique ||
      !a.valid ||
      !a.ready ||
      !a.plain ||
      !a.default_order ||
      !a.default_opclass ||
      a.method !== 'btree' ||
      a.predicate !== null ||
      !equal(a.columns, p.columns) ||
      a.attributes !== p.columns!.length ||
      a.keys !== p.columns!.length
    )
      issues.push(`primary-index:${p.name}`);
  }
  for (const i of expected.indexes) {
    const a = indexes.find((a) => a.name === i.name && a.table === i.table);
    if (
      !a ||
      !a.valid ||
      !a.ready ||
      a.primary ||
      a.unique !== i.unique ||
      !equal(a.columns, i.columns) ||
      a.method !== 'btree' ||
      !a.plain ||
      !a.default_order ||
      !a.default_opclass ||
      a.attributes !== i.columns.length ||
      a.keys !== i.columns.length
    )
      issues.push(`index:${i.name}`);
    else if (a.predicate !== i.predicate) unverified.push(`index-predicate:${i.name}`);
  }
  for (const t of expected.triggers) {
    const a = triggers.find((a) => a.table === t.table && a.name === t.name);
    const args = Buffer.from(t.args.length ? t.args.join('\0') + '\0' : '').toString('hex');
    if (
      !a ||
      a.fn !== t.fn ||
      a.function_schema !== 'public' ||
      a.enabled !== 'A' ||
      a.type !== t.type ||
      a.args !== args ||
      !a.unconditional ||
      !equal(a.update_columns, t.updateColumns || [])
    )
      issues.push(`trigger:${t.table}.${t.name}`);
  }
  for (const f of expected.functions) {
    const matches = functions.filter((a) => a.name === f.name);
    const a = matches[0];
    if (
      matches.length !== 1 ||
      a.definer ||
      a.nargs !== 0 ||
      !a.trigger_result ||
      a.language !== 'plpgsql' ||
      !equal(a.config, ['search_path=pg_catalog, pg_temp']) ||
      hash(exactExpression(String(a.body))) !== hash(exactExpression(f.body))
    )
      issues.push(`function:${f.name}`);
  }
  // Unexpected names are counted, not printed: even catalog identifiers can carry content.
  const unexpected = {
    constraints: constraints.filter(
      (a) => !expected.constraints.some((c) => a.table === c.table && a.name === c.name),
    ).length,
    indexes: indexes.filter(
      (a) =>
        !expected.indexes.some((i) => a.table === i.table && a.name === i.name) &&
        !expected.constraints.some(
          (c) => c.kind === 'p' && a.table === c.table && a.name === c.name,
        ),
    ).length,
    triggers: triggers.filter(
      (a) => !expected.triggers.some((t) => a.table === t.table && a.name === t.name),
    ).length,
  };
  const acl = await aclReport(tx, options);
  const columns = await query(
    tx,
    `SELECT c.relname AS table,a.attname AS name,tn.nspname AS type_schema,t.typname AS type_name,a.atttypmod::int AS type_modifier,a.attndims::int AS dimensions,NOT a.attnotnull AS nullable,a.attidentity::text AS identity,a.attgenerated::text AS generated,pg_get_expr(d.adbin,d.adrelid) AS default_sql FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid JOIN pg_namespace tn ON tn.oid=t.typnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND a.attnum>0 AND NOT a.attisdropped`,
    TABLES,
  );
  const enums = await query(
    tx,
    `SELECT t.typname AS name,array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname=ANY($1::text[]) GROUP BY t.oid,t.typname`,
    expectedStructure().enums.map((e) => e.name),
  );
  const differences = structuralDifferences(columns, enums, !baselineStage);
  issues.push(...differences.issues);
  const version = await query(
    tx,
    `SELECT current_setting('server_version_num')::int AS server_version_num`,
  );
  const nonDomainPublicTables = tables.filter(
    (t) => t.name !== '_prisma_migrations' && !TABLES.includes(t.name as (typeof TABLES)[number]),
  ).length;
  const reviews = {
    nonDomainPublicTables,
    reason: nonDomainPublicTables ? 'unrelated-public-tables-require-operator-review' : 'none',
  };
  const ok =
    state === 'consistent' &&
    !issues.length &&
    !unverified.length &&
    Object.values(unexpected).every((n) => n === 0) &&
    acl.ok &&
    !differences.unexpectedColumns &&
    !differences.unexpectedEnums &&
    !nonDomainPublicTables;
  return {
    mode: 'read-only',
    status: ok ? 'catalog-consistent' : baselineStage ? 'migration-pending' : 'blocked',
    versions: {
      node: process.versions.node,
      npm:
        process.env.npm_config_user_agent?.match(/(?:^| )npm\/(\d+\.\d+\.\d+)(?: |$)/)?.[1] || null,
      prisma: '5.22.0',
      postgresVersionNumber: Number.isSafeInteger(version[0]?.server_version_num)
        ? version[0].server_version_num
        : null,
    },
    stage: baselineStage ? 'historical-29' : 'connected-45',
    pendingTables: baselineStage ? [...ADDED] : [],
    migrationDetails: ledgerDetails(
      ledger,
      binding.migrations,
      state === 'missing' && !ledger.some((r) => r.finished && !r.rolled_back),
    ),
    sourceCatalogFingerprint: hash(
      JSON.stringify({ binding: binding.binding, expected, structure }),
    ),
    structuralCatalog: {
      columns: structure.columns.length,
      enums: structure.enums.length,
      unexpectedColumns: differences.unexpectedColumns,
      unexpectedEnums: differences.unexpectedEnums,
    },
    reviews,
    sourceBinding: binding.binding,
    ledger: state,
    expected: {
      tables: expectedTables.length,
      constraints: expected.constraints.length,
      indexes: expected.indexes.length,
      triggers: expected.triggers.length,
      functions: expected.functions.length,
    },
    issues,
    unverifiedDefinitions: unverified,
    unexpected,
    acl,
    runtimeAccess: 'NOT_EXECUTED_NOT_AUTHORIZED',
    limitations: [
      'Exact CHECK/predicate text comparison intentionally blocks PostgreSQL deparser differences; no equivalence or runtime-access claim',
      'Live CHECK/predicate acceptance remains blocked until an authorized execution and reviewed PostgreSQL catalog comparison; source fingerprint is not a server-deparser approval',
      'Provider configuration, external storage, API authorization and concurrent lifecycle execution are not certified',
    ],
    ok,
  };
}
export async function aclReport(tx: Tx, options: Options) {
  const browsers = [...new Set(['anon', 'authenticated', ...options.browserRoles])];
  // Conservative all-membership closure includes NOINHERIT/SET ROLE/admin paths.
  // This intentionally over-reports inaccessible PG16 membership paths for review.
  const rows = await query(
    tx,
    `WITH RECURSIVE reachable(oid) AS (
      SELECT oid FROM pg_roles WHERE rolname=ANY($1::text[]) UNION SELECT m.roleid FROM reachable r JOIN pg_auth_members m ON m.member=r.oid
    ), app AS (SELECT c.* FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($2::text[])),
    strict_app AS (SELECT * FROM app WHERE relname=ANY($3::text[]))
    SELECT
    (SELECT count(*)::int FROM pg_roles WHERE rolname=ANY($1::text[])) AS browser_roles_present,
    (SELECT count(*)::int FROM reachable x JOIN pg_roles r ON r.oid=x.oid WHERE r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR has_schema_privilege(r.oid,'public','CREATE')) AS dangerous_memberships,
    (SELECT count(*)::int FROM app c,reachable r WHERE c.relowner=r.oid OR has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES')) AS browser_table_or_column_access,
    (SELECT count(*)::int FROM strict_app c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee<>c.relowner) AS unapproved_table_grants,
    (SELECT count(*)::int FROM strict_app c JOIN pg_attribute at ON at.attrelid=c.oid CROSS JOIN LATERAL aclexplode(at.attacl) a WHERE NOT at.attisdropped AND at.attnum>0 AND a.grantee<>c.relowner) AS unapproved_column_grants,
    (SELECT count(*)::int FROM app c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee=0) AS public_table_grants,
    (SELECT count(*)::int FROM app c JOIN pg_attribute at ON at.attrelid=c.oid CROSS JOIN LATERAL aclexplode(at.attacl) a WHERE a.grantee=0) AS public_column_grants,
    (SELECT count(*)::int FROM pg_policy p JOIN app c ON c.oid=p.polrelid) AS policies_requiring_review,
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname='public' AND p.proname=ANY($4::text[]) AND a.grantee<>p.proowner) AS unapproved_function_grants,
    (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname!~'^pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('v','m') AND EXISTS(SELECT 1 FROM reachable r WHERE has_table_privilege(r.oid,c.oid,'SELECT') OR has_any_column_privilege(r.oid,c.oid,'SELECT'))) AS browser_views_requiring_review,
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname!~'^pg_' AND n.nspname<>'information_schema' AND EXISTS(SELECT 1 FROM reachable r WHERE has_function_privilege(r.oid,p.oid,'EXECUTE'))) AS browser_rpcs_requiring_review,
    (SELECT count(*)::int FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE a.grantee=0 OR a.grantee IN(SELECT oid FROM reachable)) AS browser_default_grants,
    (SELECT count(*)::int FROM pg_class s JOIN pg_depend d ON d.objid=s.oid AND d.classid='pg_class'::regclass AND d.refclassid='pg_class'::regclass AND d.deptype IN ('a','i') JOIN app c ON c.oid=d.refobjid WHERE s.relkind='S' AND (EXISTS(SELECT 1 FROM reachable r WHERE has_sequence_privilege(r.oid,s.oid,'SELECT,UPDATE,USAGE')) OR EXISTS(SELECT 1 FROM aclexplode(coalesce(s.relacl,acldefault('S',s.relowner))) a WHERE a.grantee=0))) AS browser_owned_sequence_access`,
    browsers,
    TABLES,
    ADDED,
    expectedCatalog().functions.map((f) => f.name),
  );
  const counts = rows[0];
  return {
    counts,
    ok:
      counts.browser_roles_present === browsers.length &&
      Object.entries(counts).every(
        ([key, value]) => key === 'browser_roles_present' || value === 0,
      ),
    assessment:
      'conservative-catalog-only; absent browser roles block acceptance; no SET ROLE or RPC execution',
  };
}
export async function run(options: Options) {
  checkManifest();
  const url = authorizedUrl(options, process.env);
  const client = await clientFor(url);
  try {
    return await client.$transaction(
      async (tx) => {
        await confirmTransaction(tx, options);
        return catalogReport(tx, options);
      },
      { maxWait: 5000, timeout: 60000, isolationLevel: 'RepeatableRead' },
    );
  } finally {
    await client.$disconnect();
  }
}
if (require.main === module)
  void (async () => {
    try {
      if (process.argv.slice(2).join(' ') === '--help') {
        console.log(JSON.stringify(help('verify'), null, 2));
        return;
      }
      const result = await run(parseArgs(process.argv.slice(2), 'verify'));
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 2;
    } catch {
      console.error(JSON.stringify(safeFailure('read-only')));
      process.exitCode = 2;
    }
  })();
