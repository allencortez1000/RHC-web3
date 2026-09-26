-- Checkpoint 4B additive hardening for existing application objects only.
-- The creator-default contract is implemented by the explicit-role preflight
-- procedure in ../application-acl-preflight.ts. This migration deliberately
-- does not guess production creator roles or change their global defaults.
--
-- Execute as the approved migration/object owner or an authorized administrator.
-- Browser roles are optional local roles: absent roles are skipped, never created.
-- No policy, owner, schema, view, function, service/backend, or auth/storage
-- object is changed. Owner-enforcement mode and dependency-wide revocation are not used.
BEGIN;

DO $application_acl_hardening$
DECLARE
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
    'system_settings'
  ];
  public_schema oid;
  table_name text;
  column_list text;
  grantee_name text;
  grantee_sql text;
  owned_sequence record;
  invalid_tables text;
BEGIN
  IF cardinality(application_tables) <> 29 THEN
    RAISE EXCEPTION 'Application ACL allowlist must contain exactly 29 tables';
  END IF;

  SELECT n.oid
    INTO public_schema
    FROM pg_catalog.pg_namespace AS n
   WHERE n.nspname = 'public';

  IF public_schema IS NULL THEN
    RAISE EXCEPTION 'Required public schema does not exist';
  END IF;

  -- Validate the complete allowlist before changing any object.
  SELECT string_agg(x.table_name, ', ' ORDER BY x.table_name)
    INTO invalid_tables
    FROM unnest(application_tables) AS x(table_name)
    LEFT JOIN pg_catalog.pg_class AS c
      ON c.relnamespace = public_schema
     AND c.relname = x.table_name
   WHERE c.oid IS NULL
      OR c.relkind NOT IN ('r', 'p');

  IF invalid_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Missing or non-table application objects: %', invalid_tables;
  END IF;

  IF current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Migration cannot run as browser role %', current_user;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_roles AS owner_role ON owner_role.oid = c.relowner
     WHERE c.relnamespace = public_schema
       AND c.relname = ANY(application_tables)
       AND owner_role.rolname IN ('anon', 'authenticated')
  ) THEN
    RAISE EXCEPTION 'Browser role owns an application table';
  END IF;

  FOREACH table_name IN ARRAY application_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;

  -- PUBLIC is a pseudo-role and is not a pg_roles row. Browser roles are
  -- optional in ordinary PostgreSQL, so an absent named role is skipped.
  FOREACH grantee_name IN ARRAY ARRAY['PUBLIC'::text, 'anon'::text, 'authenticated'::text] LOOP
    IF grantee_name <> 'PUBLIC' AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = grantee_name
    ) THEN
      CONTINUE;
    END IF;

    grantee_sql := CASE
      WHEN grantee_name = 'PUBLIC' THEN 'PUBLIC'
      ELSE format('%I', grantee_name)
    END;

    FOREACH table_name IN ARRAY application_tables LOOP
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s',
        table_name,
        grantee_sql
      );

      -- Table-level REVOKE does not remove separately granted column ACLs.
      SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum)
        INTO column_list
        FROM pg_catalog.pg_attribute AS a
       WHERE a.attrelid = format('public.%I', table_name)::regclass
         AND a.attnum > 0
         AND NOT a.attisdropped;

      IF column_list IS NOT NULL THEN
        EXECUTE format(
          'REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM %s',
          column_list,
          table_name,
          grantee_sql
        );
      END IF;
    END LOOP;

    -- Protect only sequences owned by one of the allowlisted application
    -- tables; rhc_id_sequences itself is a table, not a PostgreSQL sequence.
    FOR owned_sequence IN
      SELECT s.relname AS sequence_name
        FROM pg_catalog.pg_class AS s
        JOIN pg_catalog.pg_depend AS d
          ON d.classid = 'pg_catalog.pg_class'::regclass
         AND d.objid = s.oid
         AND d.objsubid = 0
         AND d.refclassid = 'pg_catalog.pg_class'::regclass
         AND d.refobjsubid > 0
         AND d.deptype IN ('a', 'i')
        JOIN pg_catalog.pg_class AS t ON t.oid = d.refobjid
       WHERE s.relkind = 'S'
         AND s.relnamespace = public_schema
         AND t.relnamespace = public_schema
         AND t.relname = ANY(application_tables)
    LOOP
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM %s',
        owned_sequence.sequence_name,
        grantee_sql
      );
    END LOOP;
  END LOOP;

  -- Unknown grants from another grantor are reported by failing the complete
  -- transaction rather than being silently destroyed with dependency-wide cleanup.
  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
      LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid = acl.grantee
     WHERE c.relnamespace = public_schema
       AND c.relname = ANY(application_tables)
       AND (acl.grantee = 0::oid OR grantee.rolname IN ('anon', 'authenticated'))
  ) THEN
    RAISE EXCEPTION 'Direct table ACLs remain for PUBLIC or browser roles';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute AS a
      JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
      CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
      LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid = acl.grantee
     WHERE c.relnamespace = public_schema
       AND c.relname = ANY(application_tables)
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND (acl.grantee = 0::oid OR grantee.rolname IN ('anon', 'authenticated'))
  ) THEN
    RAISE EXCEPTION 'Direct column ACLs remain for PUBLIC or browser roles';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class AS s
      JOIN pg_catalog.pg_depend AS d
        ON d.classid = 'pg_catalog.pg_class'::regclass
       AND d.objid = s.oid
       AND d.objsubid = 0
       AND d.refclassid = 'pg_catalog.pg_class'::regclass
       AND d.refobjsubid > 0
       AND d.deptype IN ('a', 'i')
      JOIN pg_catalog.pg_class AS t ON t.oid = d.refobjid
      CROSS JOIN LATERAL pg_catalog.aclexplode(s.relacl) AS acl
      LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid = acl.grantee
     WHERE s.relkind = 'S'
       AND s.relnamespace = public_schema
       AND t.relnamespace = public_schema
       AND t.relname = ANY(application_tables)
       AND (acl.grantee = 0::oid OR grantee.rolname IN ('anon', 'authenticated'))
  ) THEN
    RAISE EXCEPTION 'Owned sequence ACLs remain for PUBLIC or browser roles';
  END IF;
END
$application_acl_hardening$;

COMMIT;
