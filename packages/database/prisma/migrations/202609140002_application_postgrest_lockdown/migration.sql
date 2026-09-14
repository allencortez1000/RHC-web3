-- REVIEWED STATICALLY ONLY; NOT APPLIED. STAGING NO GO: live target is unknown.
-- These application tables are backend-only, not a Supabase PostgREST API.
-- Before approval, Main must verify the target database, migration/current role,
-- table/sequence ownership, runtime DB role, inherited grants, existing policies,
-- exposed views and SECURITY DEFINER RPCs. Prisma diff does not validate RLS/ACLs.
--
-- No FORCE ROW LEVEL SECURITY: table owners retain their normal RLS bypass.
-- A non-owner backend needs BOTH explicit privileges AND BYPASSRLS (or deliberate
-- backend-only policies); grants alone do not bypass RLS. Existing service_role
-- grants are not changed or newly created. A service JWT is not a SQL role grant.
-- Client roles must not own tables, inherit an owner/backend role, or be superusers.
--
-- Defaults below affect only objects subsequently CREATED BY CURRENT_ROLE, not
-- other creators or just the role's memberships. Global defaults must also be
-- revoked: schema-local REVOKE cannot cancel a global default GRANT. Therefore
-- the global changes affect future tables/sequences in every schema for this
-- creator, while the schema-local changes remove additional public grants.
-- Main must document the actual creator roles and coordinate this default-ACL
-- change if the migration role also creates non-application objects. No existing
-- auth/storage/system objects, schema privileges, functions, or views are altered.
-- New application tables still need explicit ENABLE ROW LEVEL SECURITY migrations.
--
-- Re-running this SQL is safe. Missing application tables or inability to enable
-- RLS fail the transaction instead of silently skipping a table. Execute as the
-- object owner or an authorized administrator; review grants from other grantors.
-- No CASCADE: dependent grant chains require explicit review rather than silently
-- revoking backend grants. Inherited access and owner-executed views/RPCs require
-- separate review; these direct revocations do not close those access paths.
BEGIN;

DO $application_lockdown$
DECLARE
  -- Exact @@map table names from packages/database/prisma/schema.prisma.
  -- Never replace this allowlist with ALL TABLES IN SCHEMA public.
  application_tables CONSTANT text[] := ARRAY[
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
    'system_settings'
  ];
  table_name text;
  grantee_name text;
  grantee_sql text;
  column_list text;
  owned_sequence record;
BEGIN
  FOREACH table_name IN ARRAY application_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;

  FOREACH grantee_name IN ARRAY ARRAY['PUBLIC', 'anon', 'authenticated'] LOOP
    -- PUBLIC is PostgreSQL's pseudo-role, not a row in pg_roles. Local PostgreSQL
    -- need not have Supabase roles; do not create them or fail when absent.
    IF grantee_name <> 'PUBLIC' AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = grantee_name
    ) THEN
      CONTINUE;
    END IF;
    grantee_sql := CASE WHEN grantee_name = 'PUBLIC' THEN 'PUBLIC'
                       ELSE format('%I', grantee_name) END;

    FOREACH table_name IN ARRAY application_tables LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s', table_name, grantee_sql);

      -- Table-level REVOKE does not remove separately granted column privileges.
      SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum)
        INTO column_list
      FROM pg_catalog.pg_attribute AS a
      WHERE a.attrelid = format('public.%I', table_name)::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped;
      IF column_list IS NOT NULL THEN
        EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM %s',
                       column_list, table_name, grantee_sql);
      END IF;
    END LOOP;

    -- Current Prisma tables have no SQL sequences (rhc_id_sequences is a table).
    -- Also protect any serial/identity sequences owned by these tables, without
    -- revoking access to unrelated public sequences or objects in other schemas.
    FOR owned_sequence IN
      SELECT s.relname AS sequence_name
      FROM pg_catalog.pg_class AS s
      JOIN pg_catalog.pg_namespace AS sn ON sn.oid = s.relnamespace
      JOIN pg_catalog.pg_depend AS d
        ON d.classid = 'pg_catalog.pg_class'::regclass
       AND d.objid = s.oid
       AND d.objsubid = 0
       AND d.refclassid = 'pg_catalog.pg_class'::regclass
       AND d.refobjsubid > 0
       AND d.deptype IN ('a', 'i')
      JOIN pg_catalog.pg_class AS t ON t.oid = d.refobjid
      JOIN pg_catalog.pg_namespace AS tn ON tn.oid = t.relnamespace
      WHERE s.relkind = 'S'
        AND sn.nspname = 'public'
        AND tn.nspname = 'public'
        AND t.relname = ANY(application_tables)
    LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM %s',
                     owned_sequence.sequence_name, grantee_sql);
    END LOOP;

    -- Omitting FOR ROLE intentionally targets CURRENT_ROLE only.
    EXECUTE format('ALTER DEFAULT PRIVILEGES REVOKE ALL PRIVILEGES ON TABLES FROM %s', grantee_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %s', grantee_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES REVOKE ALL PRIVILEGES ON SEQUENCES FROM %s', grantee_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %s', grantee_sql);
  END LOOP;
END;
$application_lockdown$;

COMMIT;
