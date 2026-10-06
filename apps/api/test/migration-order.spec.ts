import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationsRoot = resolve(__dirname, '../../../packages/database/prisma/migrations');
const migrations = readdirSync(migrationsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ name: entry.name, sql: readFileSync(resolve(migrationsRoot, entry.name, 'migration.sql'), 'utf8') }))
  .sort((left, right) => left.name.localeCompare(right.name));

describe('merged migration chronology (static, no database)', () => {
  it('locks down only tables created by that point and ultimately covers the complete schema', () => {
    const created = new Set<string>();
    let lockdowns = 0;
    const protectedTables = new Set<string>();
    for (const migration of migrations) {
      for (const match of migration.sql.matchAll(/CREATE TABLE "([^"]+)"/g)) created.add(match[1]);
      const allowlist = /application_tables CONSTANT text\[\] := ARRAY\[([\s\S]*?)\];/.exec(migration.sql);
      if (!allowlist) continue;
      const names = [...allowlist[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
      expect(names.length).toBeGreaterThan(0);
      expect(new Set(names).size).toBe(names.length);
      expect({ migration: migration.name, missing: names.filter((name) => !created.has(name)) })
        .toEqual({ migration: migration.name, missing: [] });
      for (const name of names) protectedTables.add(name);
      lockdowns += 1;
    }
    expect(lockdowns).toBe(3);
    const schema = readFileSync(resolve(migrationsRoot, '../schema.prisma'), 'utf8');
    const mappedTables = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((match) => match[1]).sort();
    expect([...protectedTables].sort()).toEqual(mappedTables);
    expect([...created].sort()).toEqual(mappedTables);
  });

  it('protects all 16 connected tables in the same transaction that creates them', () => {
    const connected = migrations.find((migration) => migration.name === '202610060001_connected_domains');
    expect(connected).toBeDefined();
    const sql = connected!.sql;
    const created = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);
    const block = /application_tables CONSTANT text\[\] := ARRAY\[([\s\S]*?)\];/.exec(sql)![1];
    const protectedNames = [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(created).toHaveLength(16);
    expect(created.sort()).toEqual(protectedNames.sort());
    expect(sql.indexOf('BEGIN;')).toBeLessThan(sql.indexOf('CREATE TABLE'));
    expect(sql.indexOf('ENABLE ROW LEVEL SECURITY')).toBeLessThan(sql.lastIndexOf('COMMIT;'));
    expect(sql).toContain('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s');
  });

  it('enables RLS on reservation tables in their creation migration, before later ACL hardening', () => {
    const reservation = migrations.find((migration) => migration.name === '202609160001_reservation_foundation');
    expect(reservation).toBeDefined();
    for (const table of ['reservations', 'reservation_events', 'property_status_history']) {
      expect(reservation!.sql).toContain('CREATE TABLE "' + table + '"');
      expect(reservation!.sql).toContain('ALTER TABLE "' + table + '" ENABLE ROW LEVEL SECURITY;');
    }
  });
});
