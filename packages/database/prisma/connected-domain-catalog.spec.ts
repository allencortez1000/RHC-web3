import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expectedStructure } from './connected-domain-structure';
import { catalogReport, ledgerDetails } from './connected-domain-verify';
import { expectedCatalog, manifest } from './connected-domain-source';
import { parseArgs, type Tx } from './connected-domain-gates';

type Row = Record<string, unknown>;
const options = parseArgs(
  [
    '--authorize-read-only',
    '--target-host',
    '127.0.0.1',
    '--target-port',
    '5432',
    '--target-database',
    'cd_synthetic',
    '--target-role',
    'cd_reader',
  ],
  'verify',
);
function fixture(connected = true): Row[][] {
  const c = expectedCatalog(connected);
  const action: Record<string, string> = { RESTRICT: 'r', CASCADE: 'c', 'SET NULL': 'n' };
  return [
    [...c.tables, '_prisma_migrations'].map((name) => ({
      name,
      kind: 'r',
      rls: true,
      forced: false,
    })),
    manifest()
      .migrations.filter((m) => connected || m.name !== '202610060001_connected_domains')
      .map((m) => ({
        migration_name: m.name,
        checksum: m.sha256,
        id: '00000000-0000-0000-0000-000000000001',
        started_at: '2026-10-06T00:00:00.000Z',
        finished_at: '2026-10-06T00:00:01.000Z',
        rolled_back_at: null,
        finished: true,
        rolled_back: false,
      })),
    c.constraints.map((c) => ({
      ...c,
      validated: true,
      deferrable: false,
      deferred: false,
      target_schema: 'public',
      delete_action: action[c.onDelete!],
      update_action: action[c.onUpdate!],
      match_type: 's',
    })),
    [
      ...c.indexes.map((i) => ({ ...i, primary: false })),
      ...c.constraints
        .filter((c) => c.kind === 'p')
        .map((p) => ({
          name: p.name,
          table: p.table,
          columns: p.columns!,
          unique: true,
          primary: true,
          predicate: null,
        })),
    ].map((i) => ({
      ...i,
      valid: true,
      ready: true,
      attributes: i.columns.length,
      keys: i.columns.length,
      method: 'btree',
      plain: true,
      default_order: true,
      default_opclass: true,
    })),
    c.triggers.map((t) => ({
      ...t,
      enabled: 'A',
      function_schema: 'public',
      unconditional: true,
      update_columns: t.updateColumns || [],
      args: Buffer.from(t.args.length ? t.args.join('\0') + '\0' : '').toString('hex'),
    })),
    c.functions.map((f) => ({
      ...f,
      definer: false,
      config: ['search_path=pg_catalog, pg_temp'],
      language: 'plpgsql',
      trigger_result: true,
      nargs: 0,
    })),
    [
      {
        browser_roles_present: 2,
        dangerous_memberships: 0,
        browser_table_or_column_access: 0,
        unapproved_table_grants: 0,
        unapproved_column_grants: 0,
        public_table_grants: 0,
        public_column_grants: 0,
        policies_requiring_review: 0,
        unapproved_function_grants: 0,
        browser_views_requiring_review: 0,
        browser_rpcs_requiring_review: 0,
        browser_default_grants: 0,
        browser_owned_sequence_access: 0,
      },
    ],
    expectedStructure(connected).columns.map((c) => ({ ...c, identity: '', generated: '' })),
    expectedStructure(connected).enums.map((e) => ({ ...e })),
    [{ server_version_num: 160004 }],
  ];
}
async function report(mutate: (rows: Row[][]) => void = () => {}, connected = true) {
  const rows = fixture(connected);
  mutate(rows);
  let calls = 0;
  const tx: Tx = {
    $executeRawUnsafe: async () => {
      throw new Error('CATALOG_COLLECTION_MUST_NOT_WRITE');
    },
    $queryRawUnsafe: async <T>(sql: string) => {
      assert.match(sql, /^(SELECT|WITH RECURSIVE)\b/);
      assert.ok(
        !/FROM public\.(?!_prisma_migrations\b)/.test(sql),
        'must not read application data',
      );
      const result = rows[calls++];
      assert.ok(result);
      return result as T;
    },
  };
  const result = await catalogReport(tx, options);
  assert.equal(calls, 10);
  return result;
}
test('mocked catalog equality is not reported as runtime authorization', async () => {
  const r = await report();
  assert.equal(r.ok, true);
  assert.equal(r.ledger, 'consistent');
  assert.equal(r.runtimeAccess, 'NOT_EXECUTED_NOT_AUTHORIZED');
});
for (const [label, mutate] of [
  [
    'missing table',
    (r: Row[][]) => {
      r[0].shift();
    },
  ],
  [
    'RLS disabled',
    (r: Row[][]) => {
      r[0][0].rls = false;
    },
  ],
  [
    'FK action drift',
    (r: Row[][]) => {
      r[2].find((x) => x.kind === 'f')!.delete_action = 'c';
      r[2].find((x) => x.name === 'payment_records_reservation_scope_fkey')!.update_action = 'c';
    },
  ],
  [
    'FK composite order',
    (r: Row[][]) => {
      r[2].find((x) => x.name === 'payment_records_reservation_scope_fkey')!.columns = [
        'customer_id',
        'reservation_id',
        'property_id',
      ];
    },
  ],
  [
    'unvalidated CHECK',
    (r: Row[][]) => {
      r[2].find((x) => x.kind === 'c')!.validated = false;
    },
  ],
  [
    'CHECK expression drift',
    (r: Row[][]) => {
      r[2].find((x) => x.kind === 'c')!.expression = 'true';
    },
  ],
  [
    'invalid index',
    (r: Row[][]) => {
      r[3][0].valid = false;
    },
  ],
  [
    'invalid primary index',
    (r: Row[][]) => {
      r[3].find((x) => x.primary)!.valid = false;
    },
  ],
  [
    'index predicate drift',
    (r: Row[][]) => {
      r[3].find((x) => x.predicate)!.predicate = 'true';
    },
  ],
  [
    'trigger disabled',
    (r: Row[][]) => {
      r[4][0].enabled = 'D';
    },
  ],
  [
    'trigger arguments drift',
    (r: Row[][]) => {
      r[4][0].args = '00';
    },
  ],
  [
    'function body drift',
    (r: Row[][]) => {
      r[5][0].body = 'BEGIN RETURN NEW; END';
    },
  ],
  [
    'function becomes definer',
    (r: Row[][]) => {
      r[5][0].definer = true;
    },
  ],
  [
    'migration checksum drift',
    (r: Row[][]) => {
      r[1][0].checksum = '0'.repeat(64);
    },
  ],
  [
    'unfinished migration',
    (r: Row[][]) => {
      r[1][0].finished = false;
    },
  ],
  [
    'unexpected catalog object',
    (r: Row[][]) => {
      r[0].push({ name: 'synthetic-customer-content-must-not-print', kind: 'r', rls: true });
    },
  ],
] as const) {
  test(`mocked catalog fails closed: ${label}`, async () => {
    const r = await report(mutate);
    assert.equal(r.ok, false);
    assert.doesNotMatch(JSON.stringify(r), /synthetic-customer-content-must-not-print/);
  });
}
test('baseline seven is pending, not failed or forty-five missing tables', async () => {
  const r = await report(() => {}, false);
  assert.equal(r.ledger, 'pending');
  assert.equal(r.stage, 'historical-29');
  assert.equal(r.expected.tables, 29);
  assert.equal(r.pendingTables.length, 16);
  assert.deepEqual(r.issues, []);
  assert.equal(r.ok, false);
});
test('unrelated public tables are review items, not domain or ledger drift', async () => {
  const r = await report((rows) =>
    rows[0].push({ name: 'unrelated-do-not-print', kind: 'r', rls: false }),
  );
  assert.equal(r.ledger, 'consistent');
  assert.deepEqual(r.issues, []);
  assert.equal(r.reviews.nonDomainPublicTables, 1);
  assert.equal(r.ok, false);
  assert.doesNotMatch(JSON.stringify(r), /unrelated-do-not-print/);
});
test('migration metadata includes only safe IDs/timestamps and known migration names', async () => {
  const r = await report();
  assert.equal(r.versions.postgresVersionNumber, 160004);
  assert.equal(r.versions.prisma, '5.22.0');
  assert.match(r.sourceCatalogFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(r.migrationDetails.records[0].finishedAt, '2026-10-06T00:00:01.000Z');
  const details = ledgerDetails(
    [
      {
        migration_name: 'unknown-sensitive-name',
        id: 'sensitive',
        checksum: 'bad',
        finished: true,
        rolled_back: false,
      },
    ],
    manifest().migrations,
  );
  assert.equal(details.unexpectedRecords, 1);
  assert.doesNotMatch(JSON.stringify(details), /sensitive/);
});
for (const [name, mutate] of [
  [
    'missing column',
    (r: Row[][]) => {
      r[7].pop();
    },
  ],
  [
    'column type',
    (r: Row[][]) => {
      r[7][0].type_name = 'text';
    },
  ],
  [
    'column type namespace',
    (r: Row[][]) => {
      r[7][0].type_schema = 'public';
    },
  ],
  [
    'column precision',
    (r: Row[][]) => {
      r[7].find((c) => c.type_name === 'numeric')!.type_modifier = 0;
    },
  ],
  [
    'column nullable',
    (r: Row[][]) => {
      r[7][0].nullable = true;
    },
  ],
  [
    'column default',
    (r: Row[][]) => {
      r[7][0].default_sql = 'gen_random_uuid()';
    },
  ],
  [
    'generated column',
    (r: Row[][]) => {
      r[7][0].generated = 's';
    },
  ],
  [
    'enum order',
    (r: Row[][]) => {
      r[8][0].labels = [...(r[8][0].labels as string[])].reverse();
    },
  ],
  [
    'missing enum',
    (r: Row[][]) => {
      r[8].pop();
    },
  ],
  [
    'trigger UPDATE OF scope',
    (r: Row[][]) => {
      r[4].find((t) => t.name === 'connected_notification_read_time_guard')!.update_columns = [];
    },
  ],
] as const)
  test(`structural catalog rejects ${name}`, async () => {
    assert.equal((await report(mutate)).ok, false);
  });
for (const key of [
  'dangerous_memberships',
  'browser_table_or_column_access',
  'unapproved_table_grants',
  'unapproved_column_grants',
  'public_table_grants',
  'public_column_grants',
  'policies_requiring_review',
  'unapproved_function_grants',
  'browser_views_requiring_review',
  'browser_rpcs_requiring_review',
  'browser_default_grants',
  'browser_owned_sequence_access',
]) {
  test(`mocked ACL rejects ${key}`, async () => {
    const r = await report((rows) => {
      rows[6][0][key] = 1;
    });
    assert.equal(r.ok, false);
    assert.equal(r.acl.ok, false);
  });
}
test('absent browser roles remain unverified, never evidence of browser denial', async () => {
  const r = await report((rows) => {
    rows[6][0].browser_roles_present = 0;
  });
  assert.equal(r.ok, false);
});
