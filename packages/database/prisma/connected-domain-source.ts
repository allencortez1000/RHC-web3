import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = __dirname;
export const MIGRATION = '202610060001_connected_domains';
export const RETAINED = [
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
export const ADDED = [
  'documents',
  'document_versions',
  'document_reviews',
  'identity_review_requests',
  'payment_records',
  'payment_record_events',
  'certificates',
  'certificate_events',
  'verification_references',
  'service_requests',
  'service_request_events',
  'saved_properties',
  'project_milestones',
  'turnover_cases',
  'turnover_checklist_items',
  'rewards_benefits',
] as const;
export const TABLES = [...RETAINED, ...ADDED];
export const IMMUTABLE = [
  'document_versions',
  'document_reviews',
  'payment_records',
  'payment_record_events',
  'certificates',
  'certificate_events',
  'service_request_events',
];
export const NO_TRUNCATE = [
  ...IMMUTABLE,
  'identity_review_requests',
  'turnover_checklist_items',
  'rewards_redemptions',
];
export function hash(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
export function sources(root = ROOT) {
  return readdirSync(join(root, 'migrations'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, path: `migrations/${d.name}/migration.sql` }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => ({
      ...m,
      sql: readFileSync(join(root, m.path), 'utf8'),
      sha256: hash(readFileSync(join(root, m.path))),
    }));
}
export function manifest(root = ROOT) {
  const migrations = sources(root).map(({ name, path, sha256 }) => ({ name, path, sha256 }));
  const schema = { path: 'schema.prisma', sha256: hash(readFileSync(join(root, 'schema.prisma'))) };
  return {
    format: 1,
    algorithm: 'sha256',
    byteExact: true,
    schema,
    migrations,
    binding: hash(JSON.stringify({ schema, migrations })),
  };
}
export type Manifest = ReturnType<typeof manifest>;
export function checkManifest(): Manifest {
  const expected = JSON.parse(
    readFileSync(join(ROOT, 'connected-domain-manifest.json'), 'utf8'),
  ) as Manifest;
  if (JSON.stringify(expected) !== JSON.stringify(manifest()))
    throw new Error('SOURCE_MANIFEST_DRIFT');
  return expected;
}
export function noComments(sql: string) {
  let result = '',
    quote = '',
    dollar = '';
  for (let i = 0; i < sql.length; i++) {
    if (dollar) {
      if (sql.startsWith(dollar, i)) {
        result += dollar;
        i += dollar.length - 1;
        dollar = '';
      } else result += sql[i];
      continue;
    }
    if (quote) {
      result += sql[i];
      if (sql[i] === quote) {
        if (sql[i + 1] === quote) {
          result += sql[++i];
        } else quote = '';
      }
      continue;
    }
    if (sql.startsWith('--', i)) {
      while (i < sql.length && sql[i] !== '\n') i++;
      result += '\n';
      continue;
    }
    const tag = sql.slice(i).match(/^\$[A-Za-z_]*\$/)?.[0];
    if (tag) {
      dollar = tag;
      result += tag;
      i += tag.length - 1;
      continue;
    }
    if (sql[i] === "'" || sql[i] === '"') quote = sql[i];
    result += sql[i];
  }
  return result;
}
/** Restricted splitter for the repository's quoted DDL and dollar-quoted PL/pgSQL.
 * Never execute the resulting statements in the read-only verifier. */
export function statements(sql: string): string[] {
  const out: string[] = [];
  let start = 0;
  let quote = '';
  let dollar = '';
  let comment = false;
  for (let i = 0; i < sql.length; i++) {
    if (comment) {
      if (sql[i] === '\n') comment = false;
      continue;
    }
    if (dollar) {
      if (sql.startsWith(dollar, i)) {
        i += dollar.length - 1;
        dollar = '';
      }
      continue;
    }
    if (quote) {
      if (sql[i] === quote) {
        if (sql[i + 1] === quote) i++;
        else quote = '';
      }
      continue;
    }
    if (sql.startsWith('--', i)) {
      comment = true;
      i++;
      continue;
    }
    if (sql[i] === "'" || sql[i] === '"') {
      quote = sql[i];
      continue;
    }
    const tag = sql.slice(i).match(/^\$[A-Za-z_]*\$/)?.[0];
    if (tag) {
      dollar = tag;
      i += tag.length - 1;
      continue;
    }
    if (sql[i] === ';') {
      const s = noComments(sql.slice(start, i)).trim();
      if (s) out.push(s);
      start = i + 1;
    }
  }
  if (quote || dollar) throw new Error('UNTERMINATED_SQL');
  const last = noComments(sql.slice(start)).trim();
  if (last) out.push(last);
  return out;
}
const ident = '(?:public\\.)?"?([a-z_][a-z0-9_]*)"?';
const names = (s: string) =>
  [...s.matchAll(/"([a-z_][a-z0-9_]*)"|\b([a-z_][a-z0-9_]*)\b/g)].map((m) => m[1] || m[2]);
export type Constraint = {
  table: string;
  name: string;
  kind: 'p' | 'f' | 'c';
  columns?: string[];
  target?: string;
  references?: string[];
  onDelete?: string;
  onUpdate?: string;
  expression?: string;
};
export type Index = {
  table: string;
  name: string;
  unique: boolean;
  columns: string[];
  predicate: string | null;
};
export type Trigger = {
  table: string;
  name: string;
  fn: string;
  type: number;
  args: string[];
  updateColumns?: string[];
};
export function expectedCatalog(connected = true) {
  const constraints = new Map<string, Constraint>();
  const indexes = new Map<string, Index>();
  const tables: string[] = [];
  const add = (c: Constraint) => constraints.set(`${c.table}.${c.name}`, c);
  for (const migration of sources().filter((m) => connected || m.name !== MIGRATION))
    for (const s of statements(migration.sql)) {
      const table = s.match(new RegExp(`^CREATE TABLE ${ident} \\(`, 'i'));
      if (table) {
        tables.push(table[1]);
        const pk = s.match(/CONSTRAINT "([^"]+)" PRIMARY KEY \(([^)]+)\)/);
        if (!pk) throw new Error('UNPARSED_PRIMARY_KEY');
        add({ table: table[1], name: pk[1], kind: 'p', columns: names(pk[2]) });
      }
      const drop = s.match(/^DROP INDEX "([^"]+)"$/);
      if (drop) indexes.delete(drop[1]);
      const idx = s.match(
        new RegExp(
          `^CREATE (UNIQUE )?INDEX "?([a-z_][a-z0-9_]*)"?\\s+ON ${ident}\\s*\\(([^)]+)\\)(?:\\s+WHERE ([\\s\\S]+))?$`,
          'i',
        ),
      );
      if (idx)
        indexes.set(idx[2], {
          name: idx[2],
          unique: !!idx[1],
          table: idx[3],
          columns: names(idx[4]),
          predicate: idx[5]?.trim() || null,
        });
      else if (/^CREATE (UNIQUE )?INDEX /i.test(s)) throw new Error('UNPARSED_INDEX');
      const alt = s.match(new RegExp(`^ALTER TABLE ${ident}([\\s\\S]+)$`, 'i'));
      if (alt) {
        for (const d of alt[2].matchAll(/DROP CONSTRAINT "([^"]+)"/g))
          constraints.delete(`${alt[1]}.${d[1]}`);
        for (const f of alt[2].matchAll(
          /ADD CONSTRAINT "([^"]+)"\s+FOREIGN KEY \(([^)]+)\) REFERENCES "([^"]+)"\(([^)]+)\) ON DELETE (RESTRICT|CASCADE|SET NULL) ON UPDATE (RESTRICT|CASCADE|SET NULL)/g,
        ))
          add({
            table: alt[1],
            name: f[1],
            kind: 'f',
            columns: names(f[2]),
            target: f[3],
            references: names(f[4]),
            onDelete: f[5],
            onUpdate: f[6],
          });
        // Balanced CHECK extraction preserves nested expressions and string literals.
        const re = /ADD CONSTRAINT "?([a-z_][a-z0-9_]*)"? CHECK\s*\(/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(alt[2]))) {
          const expression = balanced(alt[2], re.lastIndex);
          add({ table: alt[1], name: m[1], kind: 'c', expression });
          re.lastIndex += expression.length + 1;
        }
      }
    }
  if (!connected)
    return {
      tables,
      constraints: [...constraints.values()],
      indexes: [...indexes.values()],
      triggers: [] as Trigger[],
      functions: [] as { name: string; body: string }[],
    };
  const sql = sources().find((m) => m.name === MIGRATION)!.sql;
  const input = sql.match(/DO \$connected_input_checks\$([\s\S]+?)\$connected_input_checks\$/)![1];
  const updated = input.match(/FOREACH table_name IN ARRAY ARRAY\[([^\]]+)\]/)![1];
  for (const m of updated.matchAll(/'([^']+)'/g))
    add({
      table: m[1],
      name: `${m[1]}_updated_at_check`,
      kind: 'c',
      expression: 'updated_at >= created_at',
    });
  for (const m of input.matchAll(/\('([^']+)', '([^']+)'\)/g))
    add({
      table: m[1],
      name: `${m[1]}_${m[2]}_check`,
      kind: 'c',
      expression: `${m[2]} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$'`,
    });
  for (const m of input.matchAll(/\('(requested_[^']+)'\)/g))
    add({
      table: 'identity_review_requests',
      name: `identity_${m[1]}_check`,
      kind: 'c',
      expression: `${m[1]} IS NULL OR length(btrim(${m[1]})) BETWEEN 1 AND 500`,
    });
  const triggers: Trigger[] = [];
  for (const m of sql.matchAll(
    /CREATE TRIGGER (connected_\w+) BEFORE ([A-Za-z_ ,]+) ON public\.(\w+) FOR EACH (ROW|STATEMENT) EXECUTE FUNCTION public\.(\w+)\(([^;]*)\);/g,
  )) {
    triggers.push({
      name: m[1],
      table: m[3],
      fn: m[5],
      type: triggerType(m[2], m[4]),
      args: [...m[6].matchAll(/'([^']+)'/g)].map((x) => x[1]),
      updateColumns: m[2].includes('UPDATE OF')
        ? m[2]
            .split('UPDATE OF ')[1]
            .split(',')
            .map((s) => s.trim())
        : [],
    });
  }
  for (const table of IMMUTABLE)
    triggers.push({
      table,
      name: 'connected_immutable',
      fn: 'connected_reject_mutation',
      type: 27,
      args: [],
    });
  for (const table of NO_TRUNCATE)
    triggers.push({
      table,
      name: 'connected_no_truncate',
      fn: 'connected_reject_mutation',
      type: 34,
      args: [],
    });
  const clocks = sql.match(
    /DO \$connected_recorded_time_triggers\$([\s\S]+?)\$connected_recorded_time_triggers\$/,
  )![1];
  for (const m of clocks.matchAll(/\('([^']+)', ARRAY\[([^\]]+)\]\)/g))
    triggers.push({
      table: m[1],
      name: 'connected_recorded_time_guard',
      fn: 'connected_recorded_time',
      type: 23,
      args: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]),
    });
  const updatedBlock = sql.match(
    /DO \$connected_updated_at_triggers\$([\s\S]+?)\$connected_updated_at_triggers\$/,
  )![1];
  const updatedTables = updatedBlock.match(/FOREACH table_name IN ARRAY ARRAY\[([^\]]+)\]/)![1];
  for (const m of updatedTables.matchAll(/'([^']+)'/g))
    triggers.push({
      table: m[1],
      name: 'aaa_connected_updated_at',
      fn: 'connected_normalize_updated_at',
      type: 23,
      args: [],
    });
  const functions = [
    ...sql.matchAll(
      /CREATE FUNCTION public\.(\w+)\(\) RETURNS trigger\s+LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS \$function\$([\s\S]+?)\$function\$/g,
    ),
  ].map((m) => ({ name: m[1], body: m[2].trim() }));
  return {
    tables,
    constraints: [...constraints.values()],
    indexes: [...indexes.values()],
    triggers,
    functions,
  };
}
function balanced(s: string, start: number) {
  let depth = 1,
    quoted = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === "'") {
      if (quoted && s[i + 1] === "'") i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (c === '(') depth++;
      else if (c === ')' && --depth === 0) return s.slice(start, i).trim();
    }
  }
  throw new Error('UNBALANCED_CHECK');
}
function triggerType(events: string, level: string) {
  return (
    2 +
    (level === 'ROW' ? 1 : 0) +
    (events.includes('INSERT') ? 4 : 0) +
    (events.includes('DELETE') ? 8 : 0) +
    (events.includes('UPDATE') ? 16 : 0) +
    (events.includes('TRUNCATE') ? 32 : 0)
  );
}
export type LedgerRow = {
  migration_name: string;
  checksum: string;
  finished: boolean;
  rolled_back: boolean;
  id?: string;
  started_at?: Date | string | null;
  finished_at?: Date | string | null;
  rolled_back_at?: Date | string | null;
};
export function classifyLedger(
  rows: LedgerRow[],
  expected: Manifest['migrations'],
  domainTableCount: number,
) {
  if (rows.some((r) => !r.finished && !r.rolled_back)) return 'failed';
  const applied = rows.filter((r) => !r.rolled_back);
  if (!applied.length) return domainTableCount === 0 ? 'empty' : 'missing';
  if (
    new Set(applied.map((r) => r.migration_name)).size !== applied.length ||
    applied.some(
      (r) => !expected.some((e) => e.name === r.migration_name && e.sha256 === r.checksum),
    )
  )
    return 'drift';
  if (applied.length === expected.length) return 'consistent';
  const prefix = expected
    .slice(0, applied.length)
    .every((e) => applied.some((r) => r.migration_name === e.name));
  return prefix ? 'pending' : 'missing';
}
if (require.main === module) {
  if (process.argv.slice(2).join(' ') === '--write') {
    writeFileSync(
      join(ROOT, 'connected-domain-manifest.json'),
      JSON.stringify(manifest(), null, 2) + '\n',
    );
    console.log(JSON.stringify({ status: 'manifest-written', databaseAccess: false }));
  } else if (process.argv.length === 2) {
    checkManifest();
    console.log(JSON.stringify({ status: 'manifest-verified', databaseAccess: false }));
  } else {
    console.error(
      JSON.stringify({
        error: 'Use no arguments to verify, or --write to deliberately rebind source bytes',
      }),
    );
    process.exitCode = 2;
  }
}
