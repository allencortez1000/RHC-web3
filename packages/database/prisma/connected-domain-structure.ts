import { MIGRATION, sources, statements } from './connected-domain-source';

export type Column = {
  table: string;
  name: string;
  type_schema: string;
  type_name: string;
  type_modifier: number;
  dimensions: number;
  nullable: boolean;
  default_sql: string | null;
};
export type Enum = { name: string; labels: string[] };
/** Restricted, fail-closed replay of the repository's column DDL, not a SQL engine. */
export function expectedStructure(connected = true) {
  const columns = new Map<string, Column>();
  const enums: Enum[] = [];
  function add(table: string, name: string, definition: string) {
    const m = definition
      .trim()
      .match(/^("[A-Za-z_]+"|[A-Z]+(?:\(\d+(?:,\s*\d+)?\))?(?:\[\])?)(?:\s+(.*))?$/);
    if (!m) throw new Error('UNPARSED_COLUMN_TYPE');
    const raw = m[1],
      tail = m[2] || '';
    const primitive: Record<string, string> = {
      UUID: 'uuid',
      TEXT: 'text',
      INTEGER: 'int4',
      BIGINT: 'int8',
      BOOLEAN: 'bool',
      JSONB: 'jsonb',
    };
    let type_name = primitive[raw],
      type_modifier = -1,
      dimensions = 0,
      type_schema = 'pg_catalog';
    if (raw.startsWith('"')) {
      type_name = raw.slice(1, -1);
      type_schema = 'public';
    } else if (raw === 'TEXT[]') {
      type_name = '_text';
      dimensions = 1;
    } else if (/^TIMESTAMP\(\d+\)$/.test(raw)) {
      type_name = 'timestamp';
      type_modifier = Number(raw.match(/\d+/)![0]);
    } else if (/^VARCHAR\(\d+\)$/.test(raw)) {
      type_name = 'varchar';
      type_modifier = Number(raw.match(/\d+/)![0]) + 4;
    } else if (/^DECIMAL\(/.test(raw)) {
      const [p, s] = raw.match(/\d+/g)!.map(Number);
      type_name = 'numeric';
      type_modifier = p * 65536 + s + 4;
    }
    if (!type_name) throw new Error('UNSUPPORTED_COLUMN_TYPE');
    if (tail && !/^(?:NOT NULL(?: DEFAULT [\s\S]+)?|DEFAULT [\s\S]+)$/.test(tail))
      throw new Error('UNPARSED_COLUMN_ATTRIBUTES');
    columns.set(`${table}.${name}`, {
      table,
      name,
      type_name,
      type_schema,
      type_modifier,
      dimensions,
      nullable: !tail.startsWith('NOT NULL'),
      default_sql: tail.match(/(?:^| )DEFAULT ([\s\S]+)$/)?.[1] || null,
    });
  }
  for (const migration of sources().filter((m) => connected || m.name !== MIGRATION))
    for (const s of statements(migration.sql)) {
      const en = s.match(/^CREATE TYPE "(\w+)" AS ENUM \(([\s\S]+)\)$/);
      if (en)
        enums.push({
          name: en[1],
          labels: [...en[2].matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'")),
        });
      const create = s.match(/^CREATE TABLE "(\w+)" \(([\s\S]+)\)$/);
      if (create)
        for (const m of create[2].matchAll(/^\s*"(\w+)" ([^\r\n]+)/gm))
          add(create[1], m[1], m[2].trim().replace(/,$/, ''));
      const alter = s.match(/^ALTER TABLE (?:public\.)?"?(\w+)"?\s+([\s\S]+)$/);
      if (alter) {
        for (const m of alter[2].matchAll(/ADD COLUMN\s+"(\w+)"\s+([\s\S]+?)(?=,\s*ADD COLUMN|$)/g))
          add(alter[1], m[1], m[2].trim());
        for (const m of alter[2].matchAll(/DROP COLUMN "(\w+)"/g))
          columns.delete(`${alter[1]}.${m[1]}`);
        for (const m of alter[2].matchAll(/ALTER COLUMN "(\w+)" SET NOT NULL/g)) {
          const c = columns.get(`${alter[1]}.${m[1]}`);
          if (!c) throw new Error('UNKNOWN_ALTER_COLUMN');
          c.nullable = false;
        }
        if (/ALTER COLUMN/.test(alter[2]) && !/ALTER COLUMN "\w+" SET NOT NULL$/.test(alter[2]))
          throw new Error('UNSUPPORTED_ALTER_COLUMN');
      }
    }
  return { columns: [...columns.values()], enums };
}
/** Finite reviewed PostgreSQL spellings for simple defaults only. Never strip
 * casts/parentheses from arbitrary CHECK expressions or accept executable SQL. */
export function defaultSpellings(c: Column): (string | null)[] {
  const s = c.default_sql;
  if (s === null) return [null];
  if (s === "(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')")
    return [s, "(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text)"];
  if (/^'(?:[^']|'')*'$/.test(s)) {
    const cast =
      c.type_schema === 'public'
        ? `"${c.type_name}"`
        : { text: 'text', jsonb: 'jsonb', varchar: 'character varying' }[c.type_name];
    return cast ? [s, `${s}::${cast}`] : [s];
  }
  return [s];
}
export function structuralDifferences(
  actualColumns: Record<string, unknown>[],
  actualEnums: Record<string, unknown>[],
  connected = true,
) {
  const expected = expectedStructure(connected);
  const issues: string[] = [];
  for (const c of expected.columns) {
    const a = actualColumns.find((a) => a.table === c.table && a.name === c.name);
    if (!a) {
      issues.push(`column-missing:${c.table}.${c.name}`);
      continue;
    }
    if (
      ['type_schema', 'type_name', 'type_modifier', 'dimensions', 'nullable'].some(
        (k) => a[k] !== c[k as keyof Column],
      ) ||
      a.identity !== '' ||
      a.generated !== ''
    )
      issues.push(`column-shape:${c.table}.${c.name}`);
    if (!defaultSpellings(c).includes(a.default_sql as string | null))
      issues.push(`column-default-unverified:${c.table}.${c.name}`);
  }
  for (const e of expected.enums) {
    const a = actualEnums.find((a) => a.name === e.name);
    if (!a || JSON.stringify(a.labels) !== JSON.stringify(e.labels)) issues.push(`enum:${e.name}`);
  }
  return {
    issues,
    unexpectedColumns: actualColumns.filter(
      (a) => !expected.columns.some((c) => c.table === a.table && c.name === a.name),
    ).length,
    unexpectedEnums: actualEnums.filter((a) => !expected.enums.some((e) => e.name === a.name))
      .length,
  };
}
