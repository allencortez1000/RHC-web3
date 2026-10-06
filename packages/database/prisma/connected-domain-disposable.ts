import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkManifest,
  classifyLedger,
  ROOT,
  TABLES,
  ADDED,
  IMMUTABLE,
  statements,
  type LedgerRow,
} from './connected-domain-source';
import {
  authorizedUrl,
  clientFor,
  confirmTransaction,
  identifier,
  help,
  parseArgs,
  safeFailure,
  type Options,
  type Tx,
} from './connected-domain-gates';

const ROLLBACK = new Error('CONNECTED_DOMAIN_INTENTIONAL_ROLLBACK');
async function execute(tx: Tx, sql: string) {
  await tx.$executeRawUnsafe(sql);
}
async function expect(tx: Tx, sql: string, state: string) {
  // Savepoints permit exact SQLSTATE assertions without poisoning the outer txn.
  // The helper emits only a fixed error, never command text or server detail.
  await tx.$executeRawUnsafe('SELECT pg_temp.cd_expect($1,$2)', sql, state);
}
export async function rolePreflight(tx: Tx, o: Options, tables: readonly string[] = TABLES) {
  const roles = [o.fixtureRole!, ...o.browserRoles];
  const result = await tx.$queryRawUnsafe<{ safe: boolean }[]>(
    `SELECT
    (SELECT count(*)=3 FROM pg_roles r WHERE r.rolname=ANY($1::text[]) AND NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolcanlogin)
      AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid)
      AND NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.relowner=r.oid)
      AND NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.proowner=r.oid)
      AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspowner=r.oid)
      AND NOT has_schema_privilege(r.oid,'public','CREATE'))
    AND (SELECT count(*)=$4::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($2::text[]) AND c.relkind='r' AND c.relrowsecurity AND NOT c.relforcerowsecurity AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user))
    AND NOT EXISTS(SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($3::text[]))
    AND NOT EXISTS(SELECT 1 FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE r.rolname=ANY($1::text[]) AND n.nspname='public' AND c.relname=ANY($2::text[]) AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))
    AS safe`,
    roles,
    tables,
    ADDED,
    tables.length,
  );
  if (result[0]?.safe !== true) throw new Error('UNSAFE_DISPOSABLE_ROLE_TOPOLOGY');
  // Verify SET ROLE capability rather than assuming version-dependent membership.
  for (const role of roles) {
    await execute(tx, `SET LOCAL ROLE ${identifier(role)}`);
    await execute(tx, 'RESET ROLE');
  }
}
async function runtimeFixtures(tx: Tx, o: Options) {
  for (const role of [o.fixtureRole!, ...o.browserRoles])
    await execute(tx, `GRANT USAGE ON SCHEMA public TO ${identifier(role)}`);
  for (const role of o.browserRoles) {
    await execute(tx, `SET LOCAL ROLE ${identifier(role)}`);
    for (const table of TABLES)
      await expect(tx, `SELECT * FROM public.${identifier(table)} LIMIT 0`, '42501');
    await expect(
      tx,
      "INSERT INTO public.documents(id,customer_id,title,category,updated_at) VALUES(pg_temp.cd_uuid(90),pg_temp.cd_uuid(1),'Synthetic','TEST',CURRENT_TIMESTAMP)",
      '42501',
    );
    await execute(tx, 'RESET ROLE');
  }
  const fixture = identifier(o.fixtureRole!);
  await execute(tx, `GRANT SELECT, INSERT ON public.documents TO ${fixture}`);
  await execute(tx, `SET LOCAL ROLE ${fixture}`);
  await tx.$executeRawUnsafe('SELECT pg_temp.cd_assert((SELECT count(*)=0 FROM public.documents))');
  await expect(
    tx,
    "INSERT INTO public.documents(id,customer_id,title,category,created_at,updated_at) VALUES(pg_temp.cd_uuid(90),pg_temp.cd_uuid(1),'Synthetic runtime','TEST','2020-01-01','2020-01-01')",
    '42501',
  );
  await execute(tx, 'RESET ROLE');
  // DISPOSABLE-ONLY positive policy, scoped to synthetic customer; rolled back.
  // This is deliberately NOT a hosted policy or approval of application access.
  await execute(
    tx,
    `CREATE POLICY connected_domain_fixture_only ON public.documents TO ${fixture} USING (customer_id=md5('connected-domain-isolated-fixture-1')::uuid) WITH CHECK (customer_id=md5('connected-domain-isolated-fixture-1')::uuid)`,
  );
  await execute(tx, `SET LOCAL ROLE ${fixture}`);
  await execute(
    tx,
    "INSERT INTO public.documents(id,customer_id,title,category,created_at,updated_at) VALUES(pg_temp.cd_uuid(90),pg_temp.cd_uuid(1),'Synthetic runtime','TEST','2020-01-01','2020-01-01')",
  );
  await execute(
    tx,
    'SELECT pg_temp.cd_assert((SELECT count(*)=1 FROM public.documents WHERE id=pg_temp.cd_uuid(90)))',
  );
  await expect(
    tx,
    "INSERT INTO public.documents(id,customer_id,title,category,created_at,updated_at) VALUES(pg_temp.cd_uuid(91),pg_temp.cd_uuid(3),'Wrong scope','TEST','2020-01-01','2020-01-01')",
    '42501',
  );
  await execute(tx, 'RESET ROLE');
  for (const table of IMMUTABLE) {
    const tab = `public.${identifier(table)}`;
    await execute(tx, `GRANT SELECT,UPDATE,DELETE ON ${tab} TO ${fixture}`);
    await execute(
      tx,
      `CREATE POLICY connected_domain_fixture_only ON ${tab} TO ${fixture} USING (true) WITH CHECK (true)`,
    );
    await execute(tx, `SET LOCAL ROLE ${fixture}`);
    await execute(tx, `SELECT pg_temp.cd_assert((SELECT count(*)>0 FROM ${tab}))`);
    await expect(tx, `UPDATE ${tab} SET id=id`, '23514');
    await expect(tx, `DELETE FROM ${tab}`, '23514');
    await execute(tx, 'RESET ROLE');
  }
  await execute(tx, `GRANT TRUNCATE ON public.service_request_events TO ${fixture}`);
  await execute(tx, `SET LOCAL ROLE ${fixture}`);
  await expect(tx, 'TRUNCATE public.service_request_events', '23514');
  await execute(tx, 'RESET ROLE');
}
export async function run(o: Options) {
  const binding = checkManifest();
  const url = authorizedUrl(o, process.env);
  const client = await clientFor(url);
  let completed = false;
  let executed = 0;
  try {
    let isolationGuard = false;
    try {
      await client.$transaction(
        async (tx) => {
          await confirmTransaction(tx, o);
          await rolePreflight(tx, o);
          const ledger = await tx.$queryRawUnsafe<LedgerRow[]>(
            'SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations',
          );
          if (classifyLedger(ledger, binding.migrations, 45) !== 'consistent')
            throw new Error('MIGRATION_LEDGER_NOT_CONSISTENT');
          // This must fail at the isolation guard before consulting absent parents.
          await execute(
            tx,
            `DO $isolation_test$ BEGIN
          BEGIN
            INSERT INTO public.certificate_events(id,certificate_id,event_type,actor_user_id,review_reference,idempotency_key)
            VALUES(md5('cd-isolation-event')::uuid,md5('cd-isolation-certificate')::uuid,'ISSUED',md5('cd-isolation-actor')::uuid,'CD-ISOLATION','CD-ISOLATION');
          EXCEPTION WHEN SQLSTATE '25000' THEN RETURN;
          END;
          RAISE EXCEPTION 'Isolation guard did not reject the write' USING ERRCODE='P0001';
        END $isolation_test$`,
          );
          isolationGuard = true;
          throw ROLLBACK;
        },
        { maxWait: 5000, timeout: 30000, isolationLevel: 'RepeatableRead' },
      );
    } catch (error) {
      if (error !== ROLLBACK || !isolationGuard) throw error;
    }
    try {
      await client.$transaction(
        async (tx) => {
          await confirmTransaction(tx, o);
          await execute(tx, 'SELECT pg_advisory_xact_lock(610060001)');
          await rolePreflight(tx, o);
          const ledger = await tx.$queryRawUnsafe<LedgerRow[]>(
            'SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations',
          );
          if (classifyLedger(ledger, binding.migrations, 45) !== 'consistent')
            throw new Error('MIGRATION_LEDGER_NOT_CONSISTENT');
          for (const sql of statements(
            readFileSync(join(ROOT, 'connected-domain-fixtures.sql'), 'utf8'),
          )) {
            await execute(tx, sql);
            executed++;
          }
          await runtimeFixtures(tx, o);
          completed = true;
          // The ONLY exit after success is a rejected transaction. Never commit fixtures.
          throw ROLLBACK;
        },
        { maxWait: 5000, timeout: 120000, isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (error !== ROLLBACK || !completed) throw error;
    }
  } finally {
    await client.$disconnect();
  }
  return {
    mode: 'disposable',
    status: 'passed-and-rolled-back',
    fixtureStatements: executed,
    certificateIsolationGate: '25000 enforced for RepeatableRead; valid fixtures use Serializable',
    sourceBinding: binding.binding,
    runtimeAccess: 'disposable-fixture-only; not hosted authorization',
    limitations: [
      'No deployment/reset/seed performed',
      'This rollback suite does not compare upgrade snapshots; use the separately gated upgrade prepare/compare command',
      'No concurrent two-session races or replica-session trigger tests performed',
      'Fresh and historical-upgrade runs require separate operator-provisioned databases',
    ],
  };
}
if (require.main === module)
  void (async () => {
    try {
      if (process.argv.slice(2).join(' ') === '--help') {
        console.log(JSON.stringify(help('disposable'), null, 2));
        return;
      }
      console.log(
        JSON.stringify(await run(parseArgs(process.argv.slice(2), 'disposable')), null, 2),
      );
    } catch {
      console.error(JSON.stringify(safeFailure('disposable')));
      process.exitCode = 2;
    }
  })();
