import { Prisma, PrismaClient } from '@prisma/client';

/** Exact @@map names from schema.prisma. Keep this list independent from SQL. */
export const APPLICATION_ACL_TABLES = [
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

const BROWSER_ROLES = ['anon', 'authenticated'] as const;
type BrowserRole = (typeof BROWSER_ROLES)[number];
type Row = Record<string, unknown>;
type Transaction = Prisma.TransactionClient;

type Options = {
  targetHost: string;
  targetDatabase: string;
  creatorRoles: string[];
  runtimeRoles: string[];
  applyDefaults: boolean;
  approveGlobalDefaults: boolean;
  requireRuntime: boolean;
};

export type PreflightReport = {
  mode: 'read-only' | 'apply-defaults';
  target: { host: string; database: string };
  session: Row;
  roles: Row[];
  memberships: Row[];
  tables: Row[];
  effectiveTablePrivileges: Row[];
  effectiveColumnPrivileges: Row[];
  sequences: Row[];
  effectiveSequencePrivileges: Row[];
  tableAcls: Row[];
  columnAcls: Row[];
  sequenceAcls: Row[];
  defaultAcls: Row[];
  publicSchema: Row[];
  publicViewsAndFunctions: Row[];
  reachableTablePrivileges: Row[];
  reachableColumnPrivileges: Row[];
  reachableSequencePrivileges: Row[];
  reachableSchemaPrivileges: Row[];
  migrationLedgerPrivileges: Row[];
  requiredCreatorRoles: string[];
  declaredCreatorRoles: string[];
  declaredRuntimeRoles: string[];
  findings: string[];
  runtimeAssessment: 'tested-by-preflight' | 'declared-not-executed' | 'blocked-unassessed';
  ready: boolean;
};

export type RolePathRow = Row & {
  subject_role?: string;
  reachable_role?: string;
  member_role?: string;
  grantor_role?: string | null;
  depth?: number;
  role_path?: string[];
  grantor_path?: Array<string | null>;
  admin_option?: boolean | string;
  set_option?: boolean | string;
  inherit_option?: boolean | string;
  settable?: boolean | string;
  inheritable?: boolean | string;
  privileges_usable?: boolean | string;
  admin_exercisable?: boolean | string;
  regrant_settable?: boolean | string;
  regrant_privileges_usable?: boolean | string;
  reachable_rolsuper?: boolean | string;
  reachable_rolbypassrls?: boolean | string;
  reachable_rolcreaterole?: boolean | string;
  reachable_rolcreatedb?: boolean | string;
  reachable_rolinherit?: boolean | string;
};

type RoleMembershipRow = RolePathRow & {
  member_role: string;
  reachable_role: string;
  grantor_role: string | null;
};

export type ReachableAuthorityAssessmentInput = {
  memberships: RolePathRow[];
  roles: Row[];
  tables: Row[];
  runtimeRoles: readonly string[];
  creatorRoles?: readonly string[];
  reachableTablePrivileges?: Row[];
  reachableColumnPrivileges?: Row[];
  reachableSequencePrivileges?: Row[];
  reachableSchemaPrivileges?: Row[];
  migrationLedgerPrivileges?: Row[];
};

const COLUMN_PRIVILEGE_KEYS = ['can_select', 'can_insert', 'can_update', 'can_references'] as const;
const SEQUENCE_PRIVILEGE_KEYS = ['can_usage', 'can_select', 'can_update'] as const;

function authorityRole(row: Row): string {
  return text(row.role_name ?? row.rolname ?? row.reachable_role);
}

function pathIsUsable(path: RolePathRow, kind: 'ordinary' | 'special'): boolean {
  // PostgreSQL 16 stores the effective INHERIT and SET decisions on each
  // membership edge. The subject role's rolinherit value is only the default
  // used when a membership is created; it must not override these stored
  // membership options during a readiness assessment.
  if (kind === 'special') return bool(path.settable);
  return bool(path.settable) || bool(path.inheritable) || bool(path.privileges_usable);
}

function hasDangerousRoleAttributes(role: Row | undefined): boolean {
  return bool(role?.rolsuper) || bool(role?.rolbypassrls) || bool(role?.rolcreaterole) || bool(role?.rolcreatedb);
}

function hasAnyTablePrivilege(row: Row, destructiveOnly: boolean): boolean {
  const keys = destructiveOnly
    ? ['can_truncate', 'can_references', 'can_trigger', 'can_create', 'can_alter', 'can_drop']
    : ['can_select', 'can_insert', 'can_update', 'can_delete', 'can_truncate', 'can_references', 'can_trigger', 'can_create', 'can_alter', 'can_drop'];
  return keys.some((key) => bool(row[key]));
}

function hasAnyColumnPrivilege(row: Row, destructiveOnly: boolean): boolean {
  const keys = destructiveOnly ? ['can_references'] : COLUMN_PRIVILEGE_KEYS;
  return keys.some((key) => bool(row[key]));
}

function hasAnySequencePrivilege(row: Row, destructiveOnly: boolean): boolean {
  const keys = destructiveOnly ? ['can_update'] : SEQUENCE_PRIVILEGE_KEYS;
  return keys.some((key) => bool(row[key]));
}

/**
 * Assess effective authority available after a role-membership path. This is
 * deliberately catalog-only: it reports dangerous reachable paths and does
 * not revoke or alter any unrelated role or grant.
 */
export function assessReachableAuthority(input: ReachableAuthorityAssessmentInput): string[] {
  const browserRoles = new Set<string>(BROWSER_ROLES);
  const runtimeRoles = new Set(input.runtimeRoles);
  const subjects = new Set([...browserRoles, ...runtimeRoles]);
  const tablePrivileges = input.reachableTablePrivileges ?? [];
  const columnPrivileges = input.reachableColumnPrivileges ?? [];
  const sequencePrivileges = input.reachableSequencePrivileges ?? [];
  const schemaPrivileges = input.reachableSchemaPrivileges ?? [];
  const ledgerPrivileges = input.migrationLedgerPrivileges ?? [];
  const tableOwners = new Set(input.tables.map((table) => text(table.owner_name)).filter(Boolean));
  const ledgerOwners = new Set(ledgerPrivileges.map((row) => text(row.owner_name)).filter(Boolean));
  const protectedRoles = new Set([...runtimeRoles, ...(input.creatorRoles ?? []), ...tableOwners, ...ledgerOwners]);
  const hasLedgerOwnerAuthority = (roleName: string) => ledgerOwners.has(roleName) || ledgerPrivileges.some((row) =>
    authorityRole(row) === roleName && (bool(row.owns_migration_ledger) || bool(row.has_migration_ledger_owner_authority)),
  );
  const findings: string[] = [];

  const hasDangerousAuthority = (reachableRole: string, ordinaryPathUsable: boolean, specialPathUsable: boolean, destructiveOnly: boolean) => {
    const role = input.roles.find((candidate) => text(candidate.rolname) === reachableRole);
    const helperRole = input.memberships.find((candidate) => text(candidate.reachable_role) === reachableRole);
    // Special attributes (including CREATEDB) require the role's identity,
    // never merely its inherited object privileges or an ADMIN option.
    const dangerousRoleAttributes = specialPathUsable && Boolean(
      hasDangerousRoleAttributes(role) ||
      bool(helperRole?.reachable_rolsuper) ||
      bool(helperRole?.reachable_rolbypassrls) ||
      bool(helperRole?.reachable_rolcreaterole) ||
      bool(helperRole?.reachable_rolcreatedb),
    );
    const dangerousTables = ordinaryPathUsable && tablePrivileges.some((row) =>
      authorityRole(row) === reachableRole && hasAnyTablePrivilege(row, destructiveOnly),
    );
    const dangerousColumns = ordinaryPathUsable && columnPrivileges.some((row) =>
      authorityRole(row) === reachableRole && hasAnyColumnPrivilege(row, destructiveOnly),
    );
    const dangerousSequences = ordinaryPathUsable && sequencePrivileges.some((row) =>
      authorityRole(row) === reachableRole && hasAnySequencePrivilege(row, destructiveOnly),
    );
    const dangerousSchema = ordinaryPathUsable && schemaPrivileges.some((row) =>
      authorityRole(row) === reachableRole && bool(row.can_create),
    );
    const dangerousLedger = ordinaryPathUsable && ledgerPrivileges.some((row) =>
      authorityRole(row) === reachableRole && bool(row.can_mutate_migration_ledger),
    );
    const ownership = ordinaryPathUsable && (tableOwners.has(reachableRole) || hasLedgerOwnerAuthority(reachableRole));

    return dangerousRoleAttributes || dangerousTables || dangerousColumns || dangerousSequences || dangerousSchema || dangerousLedger || ownership;
  };

  for (const browserRole of browserRoles) {
    if (hasDangerousRoleAttributes(input.roles.find((role) => text(role.rolname) === browserRole))) {
      findings.push(`${browserRole} has dangerous direct role attributes`);
    }
    if (tablePrivileges.some((row) => authorityRole(row) === browserRole && hasAnyTablePrivilege(row, false))) {
      findings.push(`${browserRole} has dangerous direct application-table privilege`);
    }
    if (columnPrivileges.some((row) => authorityRole(row) === browserRole && hasAnyColumnPrivilege(row, false))) {
      findings.push(`${browserRole} has dangerous direct application-column privilege`);
    }
    if (sequencePrivileges.some((row) => authorityRole(row) === browserRole && hasAnySequencePrivilege(row, false))) {
      findings.push(`${browserRole} has dangerous direct owned-sequence privilege`);
    }
    if (schemaPrivileges.some((row) => authorityRole(row) === browserRole && bool(row.can_create))) {
      findings.push(`${browserRole} has dangerous direct schema authority`);
    }
    if (ledgerPrivileges.some((row) => authorityRole(row) === browserRole && bool(row.can_mutate_migration_ledger))) {
      findings.push(`${browserRole} has dangerous direct migration-ledger authority`);
    }
    if (hasLedgerOwnerAuthority(browserRole)) findings.push(`${browserRole} has direct migration-ledger owner authority`);
    if (tableOwners.has(browserRole)) findings.push(`${browserRole} owns an application table`);
  }

  for (const path of input.memberships) {
    const subjectRole = text(path.subject_role);
    const reachableRole = text(path.reachable_role);
    if (!subjects.has(subjectRole) || !reachableRole || subjectRole === reachableRole) continue;
    const ordinaryPathUsable = pathIsUsable(path, 'ordinary');
    const specialPathUsable = pathIsUsable(path, 'special');
    if (hasDangerousAuthority(reachableRole, ordinaryPathUsable, specialPathUsable, !browserRoles.has(subjectRole))) {
      const pathDescription = bool(path.settable) ? 'SET ROLE or membership'
        : bool(path.inheritable) ? 'inherited membership' : 'SET ROLE then inherited membership';
      findings.push(`${subjectRole} can reach ${reachableRole} through ${pathDescription} with dangerous application authority`);
    }
    // ADMIN is independently unsafe when it can regrant relevant authority,
    // including otherwise-permitted runtime DML to a browser identity. The
    // regrant flags require a usable grantor, not just any ADMIN-marked edge.
    const regrantOrdinary = bool(path.regrant_privileges_usable);
    const regrantSpecial = bool(path.regrant_settable);
    if (hasDangerousAuthority(reachableRole, regrantOrdinary, regrantSpecial, false)
      || (regrantOrdinary && protectedRoles.has(reachableRole))) {
      const rolePath = (path.role_path ?? [subjectRole, reachableRole]).join(' -> ');
      findings.push(`${subjectRole} can reach ${reachableRole} through ADMIN regrant path ${rolePath} with dangerous application authority`);
    }
  }

  // A declared runtime role is itself an effective identity even when the
  // catalog has no additional membership row for it.
  for (const runtimeRole of runtimeRoles) {
    const role = input.roles.find((candidate) => text(candidate.rolname) === runtimeRole);
    const dangerousRoleAttributes = hasDangerousRoleAttributes(role);
    const dangerousTables = tablePrivileges.some((row) => authorityRole(row) === runtimeRole && hasAnyTablePrivilege(row, true));
    const dangerousColumns = columnPrivileges.some((row) => authorityRole(row) === runtimeRole && hasAnyColumnPrivilege(row, true));
    const dangerousSequences = sequencePrivileges.some((row) => authorityRole(row) === runtimeRole && hasAnySequencePrivilege(row, true));
    const dangerousSchema = schemaPrivileges.some((row) => authorityRole(row) === runtimeRole && bool(row.can_create));
    const dangerousLedger = ledgerPrivileges.some((row) => authorityRole(row) === runtimeRole && bool(row.can_mutate_migration_ledger));
    if (dangerousRoleAttributes || dangerousTables || dangerousColumns || dangerousSequences || dangerousSchema || dangerousLedger || tableOwners.has(runtimeRole) || hasLedgerOwnerAuthority(runtimeRole)) {
      findings.push(`${runtimeRole} has dangerous application authority available to the declared runtime role`);
    }
  }

  return unique(findings);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function identifier(value: string): string {
  if (!value || value.includes('\0') || value.length > 63) {
    throw new Error(`Invalid PostgreSQL role identifier: ${value || '<empty>'}`);
  }
  return `"${value.replaceAll('"', '""')}"`;
}

function values(valuesToBind: readonly string[]) {
  return Prisma.join(valuesToBind.map((value) => Prisma.sql`${value}`));
}

function tupleValues(valuesToBind: readonly string[]) {
  return Prisma.join(valuesToBind.map((value) => Prisma.sql`(${value})`));
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

function bool(value: unknown): boolean {
  return value === true || value === 'true';
}

function roleSet(options: Options, currentUser: string): string[] {
  return unique([
    currentUser,
    ...options.creatorRoles,
    ...options.runtimeRoles,
    ...BROWSER_ROLES,
  ]);
}

function urlDatabase(url: URL): string {
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!database) throw new Error('DIRECT_URL must contain a database name');
  return database;
}

function parseDirectUrl(rawUrl: string, options: Options): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('DIRECT_URL is not a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DIRECT_URL must use a PostgreSQL TCP URL');
  }
  if (url.hostname.toLowerCase() !== options.targetHost.toLowerCase()) {
    throw new Error(`DIRECT_URL host does not match --target-host ${options.targetHost}`);
  }
  if (urlDatabase(url) !== options.targetDatabase) {
    throw new Error(`DIRECT_URL database does not match --target-database ${options.targetDatabase}`);
  }
  return rawUrl;
}

export function readOnlyUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  // Replace inherited options with the complete read-only safety contract so
  // an ancestor environment cannot disable read-only mode or its timeouts.
  // The apply-defaults path deliberately does not use this transformation.
  url.searchParams.set('options', [
    '-c default_transaction_read_only=on',
    '-c statement_timeout=10000',
    '-c lock_timeout=2000',
    '-c idle_in_transaction_session_timeout=15000',
  ].join(' '));
  return url.toString();
}

async function query<T extends Row>(transaction: Transaction, sql: Prisma.Sql): Promise<T[]> {
  return transaction.$queryRaw<T[]>(sql);
}

async function enforceReadOnlyTransaction(transaction: Transaction): Promise<void> {
  // Poolers may ignore startup options. Enforce and verify transaction-local
  // controls before collect() can inspect any catalog objects.
  await transaction.$executeRaw`SET TRANSACTION READ ONLY`;
  await transaction.$executeRaw`SET LOCAL statement_timeout = '10s'`;
  await transaction.$executeRaw`SET LOCAL lock_timeout = '2s'`;
  await transaction.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '15s'`;
  const [settings] = await query<Row>(transaction, Prisma.sql`
    SELECT current_setting('transaction_read_only') AS transaction_read_only,
           current_setting('statement_timeout') AS statement_timeout,
           current_setting('lock_timeout') AS lock_timeout,
           current_setting('idle_in_transaction_session_timeout') AS idle_in_transaction_session_timeout
  `);
  if (!settings || settings.transaction_read_only !== 'on'
    || settings.statement_timeout !== '10s'
    || settings.lock_timeout !== '2s'
    || settings.idle_in_transaction_session_timeout !== '15s') {
    throw new Error('Read-only preflight transaction safety verification failed');
  }
}

function roleMembershipEdges(): Prisma.Sql {
  // pg_database_owner implicitly grants SET/INHERIT to the current database
  // owner, without an ADMIN option or a grantor in pg_auth_members.
  return Prisma.sql`
    role_membership_edges AS (
      SELECT member, roleid, grantor, admin_option, set_option, inherit_option
        FROM pg_catalog.pg_auth_members
      UNION ALL
      SELECT db.datdba AS member,
             owner_role.oid AS roleid,
             NULL::oid AS grantor,
             false AS admin_option,
             true AS set_option,
             true AS inherit_option
        FROM pg_catalog.pg_database AS db
        JOIN pg_catalog.pg_roles AS owner_role ON owner_role.rolname = 'pg_database_owner'
       WHERE db.datname = current_database()
    )
  `;
}

/**
 * Each row describes one explicit or implicit membership path, retaining grantors.
 * settable/inheritable are pure, immediate paths; privileges_usable also allows
 * SET followed by INHERIT. admin_option belongs only to the final edge.
 * admin_exercisable requires an immediately usable grantor. regrant_* describe
 * potential access after at least one ADMIN regrant, never current privileges.
 */
export async function collectRoleMemberships(transaction: Transaction, subjectRoles: readonly string[]): Promise<RolePathRow[]> {
  if (subjectRoles.length === 0) return [];
  const edges = await query<RoleMembershipRow>(transaction, Prisma.sql`
    WITH RECURSIVE ${roleMembershipEdges()}, reachable_roles(role_oid) AS (
      SELECT r.oid FROM pg_catalog.pg_roles AS r WHERE r.rolname IN (${values(subjectRoles)})
      UNION
      SELECT membership.roleid
        FROM reachable_roles AS reachable
        JOIN role_membership_edges AS membership ON membership.member = reachable.role_oid
    )
    SELECT member.rolname::text AS member_role,
           granted.rolname::text AS reachable_role,
           pg_get_userbyid(membership.grantor)::text AS grantor_role,
           membership.admin_option,
           membership.set_option,
           membership.inherit_option,
           granted.rolsuper AS reachable_rolsuper,
           granted.rolbypassrls AS reachable_rolbypassrls,
           granted.rolcreaterole AS reachable_rolcreaterole,
           granted.rolcreatedb AS reachable_rolcreatedb,
           granted.rolinherit AS reachable_rolinherit,
           granted.rolcanlogin AS reachable_rolcanlogin
      FROM reachable_roles AS reachable
      JOIN role_membership_edges AS membership ON membership.member = reachable.role_oid
      JOIN pg_catalog.pg_roles AS member ON member.oid = membership.member
      JOIN pg_catalog.pg_roles AS granted ON granted.oid = membership.roleid
     ORDER BY member.rolname, granted.rolname, membership.grantor
  `);
  const outgoing = new Map<string, RoleMembershipRow[]>();
  for (const edge of edges) {
    const memberships = outgoing.get(edge.member_role) ?? [];
    memberships.push(edge);
    outgoing.set(edge.member_role, memberships);
  }
  const pending: RolePathRow[] = unique(subjectRoles).map((subject_role) => ({
    subject_role,
    reachable_role: subject_role,
    depth: 0,
    role_path: [subject_role],
    grantor_path: [],
    settable: true,
    inheritable: true,
    privileges_usable: true,
  }));
  const paths: RolePathRow[] = [];
  for (let index = 0; index < pending.length; index += 1) {
    const parent = pending[index];
    for (const edge of outgoing.get(text(parent.reachable_role)) ?? []) {
      if (parent.role_path?.includes(edge.reachable_role)) continue;
      const settable = bool(parent.settable) && bool(edge.set_option);
      const inheritable = bool(parent.inheritable) && bool(edge.inherit_option);
      const privilegesUsable = settable || (bool(parent.privileges_usable) && bool(edge.inherit_option));
      // PG16 select_best_admin searches inherited privileges of the current
      // identity. SET may choose that identity first; INHERIT then SET cannot.
      // ADMIN can regrant SET/INHERIT to the subject without CREATEROLE. A
      // non-superuser cannot regrant a superuser role even with ADMIN; actual
      // superuser identities are blocked separately by the attribute checks.
      const canRegrant = bool(edge.admin_option) && !bool(edge.reachable_rolsuper);
      const adminExercisable = canRegrant && bool(parent.privileges_usable);
      const regrantSettable = (bool(parent.regrant_settable) && bool(edge.set_option))
        || (canRegrant && (bool(parent.privileges_usable) || bool(parent.regrant_privileges_usable)));
      const path: RolePathRow = {
        ...edge,
        subject_role: parent.subject_role,
        depth: (parent.depth ?? 0) + 1,
        role_path: [...(parent.role_path ?? []), edge.reachable_role],
        grantor_path: [...(parent.grantor_path ?? []), edge.grantor_role],
        settable,
        inheritable,
        privileges_usable: privilegesUsable,
        admin_exercisable: adminExercisable,
        regrant_settable: regrantSettable,
        regrant_privileges_usable: regrantSettable || (bool(parent.regrant_privileges_usable) && bool(edge.inherit_option)),
      };
      paths.push(path);
      pending.push(path);
    }
  }
  return paths.sort((left, right) => text(left.subject_role).localeCompare(text(right.subject_role))
    || (left.depth ?? 0) - (right.depth ?? 0)
    || text(left.reachable_role).localeCompare(text(right.reachable_role)));
}

function inheritedAclRolePaths(roleValues: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    WITH RECURSIVE ${roleMembershipEdges()}, acl_role_paths(subject_oid, grant_oid, path) AS (
      SELECT r.oid, r.oid, ARRAY[r.oid]::oid[]
        FROM pg_catalog.pg_roles AS r
       WHERE r.rolname IN (${roleValues})
      UNION ALL
      SELECT paths.subject_oid, membership.roleid, paths.path || membership.roleid
        FROM acl_role_paths AS paths
        JOIN role_membership_edges AS membership ON membership.member = paths.grant_oid
       WHERE membership.inherit_option
         AND NOT membership.roleid = ANY(paths.path)
    )
  `;
}

function hasInheritedAclPrivilege(aclExpression: string, privilege: string, ownerExpression?: string): Prisma.Sql {
  const ownerCheck = ownerExpression
    ? Prisma.sql`acl_path.grant_oid = ${Prisma.raw(ownerExpression)} OR`
    : Prisma.empty;
  return Prisma.sql`
    EXISTS (
      SELECT 1
        FROM acl_role_paths AS acl_path
       WHERE acl_path.subject_oid = r.oid
         AND (
           ${ownerCheck}
           EXISTS (
             SELECT 1
               FROM LATERAL pg_catalog.aclexplode(${Prisma.raw(aclExpression)}) AS object_acl
              WHERE object_acl.privilege_type = ${privilege}
                AND (object_acl.grantee = 0 OR object_acl.grantee = acl_path.grant_oid)
           )
         )
    )
  `;
}

export async function collectReachableTablePrivileges(transaction: Transaction, authorityRoles: readonly string[]): Promise<Row[]> {
  const roleValues = values(authorityRoles);
  return query<Row>(transaction, Prisma.sql`
    ${inheritedAclRolePaths(roleValues)}
    SELECT r.rolname AS role_name,
           c.relname AS table_name,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))", 'SELECT', 'c.relowner')}
                ELSE has_table_privilege(r.rolname, c.oid, 'SELECT') END AS can_select,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))", 'INSERT', 'c.relowner')}
                ELSE has_table_privilege(r.rolname, c.oid, 'INSERT') END AS can_insert,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))", 'UPDATE', 'c.relowner')}
                ELSE has_table_privilege(r.rolname, c.oid, 'UPDATE') END AS can_update,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))", 'DELETE', 'c.relowner')}
                ELSE has_table_privilege(r.rolname, c.oid, 'DELETE') END AS can_delete,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))", 'TRUNCATE', 'c.relowner')}
                ELSE has_table_privilege(r.rolname, c.oid, 'TRUNCATE') END AS can_truncate,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))", 'REFERENCES', 'c.relowner')}
                ELSE has_table_privilege(r.rolname, c.oid, 'REFERENCES') END AS can_references,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))", 'TRIGGER', 'c.relowner')}
                ELSE has_table_privilege(r.rolname, c.oid, 'TRIGGER') END AS can_trigger
      FROM pg_catalog.pg_roles AS r
      JOIN pg_catalog.pg_class AS c ON c.relname IN (${values(APPLICATION_ACL_TABLES)})
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
     WHERE r.rolname IN (${roleValues})
     ORDER BY r.rolname, c.relname
  `);
}

export async function collectReachableColumnPrivileges(transaction: Transaction, authorityRoles: readonly string[]): Promise<Row[]> {
  const roleValues = values(authorityRoles);
  return query<Row>(transaction, Prisma.sql`
    ${inheritedAclRolePaths(roleValues)}
    SELECT r.rolname AS role_name,
           c.relname AS table_name,
           a.attname AS column_name,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege('a.attacl', 'SELECT')}
                ELSE has_column_privilege(r.rolname, c.oid, a.attname, 'SELECT') END AS can_select,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege('a.attacl', 'INSERT')}
                ELSE has_column_privilege(r.rolname, c.oid, a.attname, 'INSERT') END AS can_insert,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege('a.attacl', 'UPDATE')}
                ELSE has_column_privilege(r.rolname, c.oid, a.attname, 'UPDATE') END AS can_update,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege('a.attacl', 'REFERENCES')}
                ELSE has_column_privilege(r.rolname, c.oid, a.attname, 'REFERENCES') END AS can_references
      FROM pg_catalog.pg_roles AS r
      JOIN pg_catalog.pg_class AS c ON c.relname IN (${values(APPLICATION_ACL_TABLES)})
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE r.rolname IN (${roleValues})
     ORDER BY r.rolname, c.relname, a.attnum
  `);
}

export async function collectReachableSequencePrivileges(transaction: Transaction, authorityRoles: readonly string[]): Promise<Row[]> {
  const roleValues = values(authorityRoles);
  return query<Row>(transaction, Prisma.sql`
    ${inheritedAclRolePaths(roleValues)}
    SELECT r.rolname AS role_name,
           s.relname AS sequence_name,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(s.relacl, pg_catalog.acldefault('S', s.relowner))", 'USAGE', 's.relowner')}
                ELSE has_sequence_privilege(r.rolname, s.oid, 'USAGE') END AS can_usage,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(s.relacl, pg_catalog.acldefault('S', s.relowner))", 'SELECT', 's.relowner')}
                ELSE has_sequence_privilege(r.rolname, s.oid, 'SELECT') END AS can_select,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(s.relacl, pg_catalog.acldefault('S', s.relowner))", 'UPDATE', 's.relowner')}
                ELSE has_sequence_privilege(r.rolname, s.oid, 'UPDATE') END AS can_update
      FROM pg_catalog.pg_roles AS r
      JOIN pg_catalog.pg_class AS s ON s.relkind = 'S'
      JOIN pg_catalog.pg_namespace AS n ON n.oid = s.relnamespace AND n.nspname = 'public'
      JOIN pg_catalog.pg_depend AS d
        ON d.classid = 'pg_catalog.pg_class'::regclass
       AND d.objid = s.oid
       AND d.objsubid = 0
       AND d.refclassid = 'pg_catalog.pg_class'::regclass
       AND d.refobjsubid > 0
       AND d.deptype IN ('a', 'i')
      JOIN pg_catalog.pg_class AS t
        ON t.oid = d.refobjid
       AND t.relkind IN ('r', 'p')
       AND t.relname IN (${values(APPLICATION_ACL_TABLES)})
      JOIN pg_catalog.pg_namespace AS tn ON tn.oid = t.relnamespace AND tn.nspname = 'public'
     WHERE r.rolname IN (${roleValues})
     ORDER BY r.rolname, s.relname
  `);
}

export async function collectReachableSchemaPrivileges(transaction: Transaction, authorityRoles: readonly string[]): Promise<Row[]> {
  const roleValues = values(authorityRoles);
  return query<Row>(transaction, Prisma.sql`
    ${inheritedAclRolePaths(roleValues)}
    SELECT r.rolname AS role_name,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))", 'USAGE', 'n.nspowner')}
                ELSE has_schema_privilege(r.rolname, n.oid, 'USAGE') END AS can_usage,
           CASE WHEN r.rolsuper THEN ${hasInheritedAclPrivilege("COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))", 'CREATE', 'n.nspowner')}
                ELSE has_schema_privilege(r.rolname, n.oid, 'CREATE') END AS can_create
      FROM pg_catalog.pg_roles AS r
      JOIN pg_catalog.pg_namespace AS n ON n.nspname = 'public'
     WHERE r.rolname IN (${roleValues})
     ORDER BY r.rolname
  `);
}

// Ownership (including inherited owner authority) survives DML revocation.
// Keep it separate from table/column mutation rights and from superuser bypass.
export async function collectMigrationLedgerPrivileges(transaction: Transaction, authorityRoles: readonly string[]): Promise<Row[]> {
  const roleValues = values(authorityRoles);
  const ledgerTableAcl = "COALESCE(ledger.relacl, pg_catalog.acldefault('r', ledger.relowner))";
  return query<Row>(transaction, Prisma.sql`
    ${inheritedAclRolePaths(roleValues)}
    SELECT r.rolname AS role_name,
           pg_get_userbyid(ledger.relowner)::text AS owner_name,
           COALESCE(r.oid = ledger.relowner, false) AS owns_migration_ledger,
           EXISTS (
             SELECT 1 FROM acl_role_paths AS owner_path
              WHERE owner_path.subject_oid = r.oid AND owner_path.grant_oid = ledger.relowner
           ) AS has_migration_ledger_owner_authority,
           CASE
             WHEN ledger.oid IS NULL THEN false
             WHEN r.rolsuper THEN
               ${hasInheritedAclPrivilege(ledgerTableAcl, 'INSERT')}
               OR ${hasInheritedAclPrivilege(ledgerTableAcl, 'UPDATE')}
               OR ${hasInheritedAclPrivilege(ledgerTableAcl, 'DELETE')}
               OR ${hasInheritedAclPrivilege(ledgerTableAcl, 'TRUNCATE')}
               OR EXISTS (
                 SELECT 1
                   FROM pg_catalog.pg_attribute AS ledger_column
                  WHERE ledger_column.attrelid = ledger.oid
                    AND ledger_column.attnum > 0
                    AND NOT ledger_column.attisdropped
                    AND (
                      ${hasInheritedAclPrivilege('ledger_column.attacl', 'INSERT')}
                      OR ${hasInheritedAclPrivilege('ledger_column.attacl', 'UPDATE')}
                    )
               )
             ELSE
               has_table_privilege(r.rolname, ledger.oid, 'INSERT')
               OR has_table_privilege(r.rolname, ledger.oid, 'UPDATE')
               OR has_table_privilege(r.rolname, ledger.oid, 'DELETE')
               OR has_table_privilege(r.rolname, ledger.oid, 'TRUNCATE')
               OR EXISTS (
                 SELECT 1
                   FROM pg_catalog.pg_attribute AS ledger_column
                  WHERE ledger_column.attrelid = ledger.oid
                    AND ledger_column.attnum > 0
                    AND NOT ledger_column.attisdropped
                    AND (
                      has_column_privilege(r.rolname, ledger.oid, ledger_column.attnum, 'INSERT')
                      OR has_column_privilege(r.rolname, ledger.oid, ledger_column.attnum, 'UPDATE')
                    )
               )
           END AS can_mutate_migration_ledger
      FROM pg_catalog.pg_roles AS r
      LEFT JOIN pg_catalog.pg_class AS ledger
        ON ledger.oid = to_regclass('public._prisma_migrations')
     WHERE r.rolname IN (${roleValues})
     ORDER BY r.rolname
  `);
}

async function collect(transaction: Transaction, options: Options, mode: PreflightReport['mode']): Promise<PreflightReport> {
  const sessionRows = await query<Row>(transaction, Prisma.sql`
    SELECT current_database() AS database_name,
           current_user AS current_user,
           session_user AS session_user,
           inet_server_addr()::text AS server_address,
           inet_server_port() AS server_port,
           current_setting('transaction_read_only') AS transaction_read_only,
           current_setting('default_transaction_read_only') AS default_transaction_read_only,
           current_setting('statement_timeout') AS statement_timeout,
           current_setting('lock_timeout') AS lock_timeout,
           current_setting('idle_in_transaction_session_timeout') AS idle_in_transaction_session_timeout,
           current_setting('is_superuser') AS is_superuser,
           current_setting('server_version_num') AS server_version_num
  `);
  const session = sessionRows[0];
  if (!session || text(session.transaction_read_only) !== (mode === 'read-only' ? 'on' : 'off')) {
    throw new Error(`Unexpected transaction_read_only state for ${mode} preflight`);
  }
  if (!Number.isInteger(Number(session.server_version_num)) || Number(session.server_version_num) < 160000) {
    throw new Error('ACL preflight requires PostgreSQL 16 or later for explicit membership options');
  }

  const currentUser = text(session.current_user);
  const scopedRoles = roleSet(options, currentUser);
  const roleValues = values(scopedRoles);
  const requestedTables = tupleValues(APPLICATION_ACL_TABLES);

  const roles = await query<Row>(transaction, Prisma.sql`
    SELECT rolname,
           rolsuper,
           rolinherit,
           rolcreaterole,
           rolcreatedb,
           rolcanlogin,
           rolreplication,
           rolbypassrls,
           rolconnlimit,
           rolvaliduntil::text AS rolvaliduntil
      FROM pg_catalog.pg_roles
     WHERE rolname IN (${roleValues})
     ORDER BY rolname
  `);

  const memberships = await collectRoleMemberships(transaction, scopedRoles);
  const authorityRoles = unique([
    ...BROWSER_ROLES,
    ...options.runtimeRoles,
    ...memberships.map((path) => text(path.reachable_role)).filter(Boolean),
  ]);

  const tables = await query<Row>(transaction, Prisma.sql`
    SELECT requested.table_name,
           c.oid::text AS object_oid,
           c.relkind::text AS relkind,
           c.relrowsecurity,
           c.relforcerowsecurity,
           pg_get_userbyid(c.relowner) AS owner_name,
           (SELECT count(*)::int FROM pg_catalog.pg_policy AS p WHERE p.polrelid = c.oid) AS policy_count
      FROM (VALUES ${requestedTables}) AS requested(table_name)
      LEFT JOIN pg_catalog.pg_class AS c
        ON c.relname = requested.table_name
      LEFT JOIN pg_catalog.pg_namespace AS n
        ON n.oid = c.relnamespace
       AND n.nspname = 'public'
     WHERE c.oid IS NULL OR n.oid IS NOT NULL
     ORDER BY requested.table_name
  `);

  const effectiveTablePrivileges = await query<Row>(transaction, Prisma.sql`
    SELECT r.rolname,
           c.relname AS table_name,
           has_table_privilege(r.rolname, c.oid, 'SELECT') AS can_select,
           has_table_privilege(r.rolname, c.oid, 'INSERT') AS can_insert,
           has_table_privilege(r.rolname, c.oid, 'UPDATE') AS can_update,
           has_table_privilege(r.rolname, c.oid, 'DELETE') AS can_delete,
           has_table_privilege(r.rolname, c.oid, 'TRUNCATE') AS can_truncate,
           has_table_privilege(r.rolname, c.oid, 'REFERENCES') AS can_references,
           has_table_privilege(r.rolname, c.oid, 'TRIGGER') AS can_trigger
      FROM pg_catalog.pg_roles AS r
      JOIN pg_catalog.pg_class AS c ON c.relname IN (${values(APPLICATION_ACL_TABLES)})
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
     WHERE r.rolname IN ('anon', 'authenticated')
     ORDER BY r.rolname, c.relname
  `);

  const reachableTablePrivileges = await collectReachableTablePrivileges(transaction, authorityRoles);

  const reachableSchemaPrivileges = await collectReachableSchemaPrivileges(transaction, authorityRoles);

  const migrationLedgerPrivileges = await collectMigrationLedgerPrivileges(transaction, authorityRoles);

  const effectiveColumnPrivileges = await query<Row>(transaction, Prisma.sql`
    SELECT r.rolname,
           c.relname AS table_name,
           a.attname AS column_name,
           has_column_privilege(r.rolname, c.oid, a.attname, 'SELECT') AS can_select,
           has_column_privilege(r.rolname, c.oid, a.attname, 'INSERT') AS can_insert,
           has_column_privilege(r.rolname, c.oid, a.attname, 'UPDATE') AS can_update,
           has_column_privilege(r.rolname, c.oid, a.attname, 'REFERENCES') AS can_references
      FROM pg_catalog.pg_roles AS r
      JOIN pg_catalog.pg_class AS c ON c.relname IN (${values(APPLICATION_ACL_TABLES)})
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE r.rolname IN ('anon', 'authenticated')
     ORDER BY r.rolname, c.relname, a.attnum
  `);

  const reachableColumnPrivileges = await collectReachableColumnPrivileges(transaction, authorityRoles);

  const sequences = await query<Row>(transaction, Prisma.sql`
    SELECT s.relname AS sequence_name,
           pg_get_userbyid(s.relowner) AS owner_name,
           t.relname AS table_name,
           a.attname AS column_name
      FROM pg_catalog.pg_class AS s
      JOIN pg_catalog.pg_namespace AS sn ON sn.oid = s.relnamespace AND sn.nspname = 'public'
      JOIN pg_catalog.pg_depend AS d
        ON d.classid = 'pg_catalog.pg_class'::regclass
       AND d.objid = s.oid
       AND d.objsubid = 0
       AND d.refclassid = 'pg_catalog.pg_class'::regclass
       AND d.refobjsubid > 0
       AND d.deptype IN ('a', 'i')
      JOIN pg_catalog.pg_class AS t ON t.oid = d.refobjid
      JOIN pg_catalog.pg_namespace AS tn ON tn.oid = t.relnamespace AND tn.nspname = 'public'
      JOIN pg_catalog.pg_attribute AS a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
     WHERE s.relkind = 'S'
       AND t.relname IN (${values(APPLICATION_ACL_TABLES)})
     ORDER BY s.relname
  `);

  const effectiveSequencePrivileges = await query<Row>(transaction, Prisma.sql`
    SELECT r.rolname,
           s.relname AS sequence_name,
           has_sequence_privilege(r.rolname, s.oid, 'USAGE') AS can_usage,
           has_sequence_privilege(r.rolname, s.oid, 'SELECT') AS can_select,
           has_sequence_privilege(r.rolname, s.oid, 'UPDATE') AS can_update
      FROM pg_catalog.pg_roles AS r
      JOIN pg_catalog.pg_class AS s ON s.relkind = 'S'
      JOIN pg_catalog.pg_namespace AS n ON n.oid = s.relnamespace AND n.nspname = 'public'
      JOIN pg_catalog.pg_depend AS d
        ON d.classid = 'pg_catalog.pg_class'::regclass
       AND d.objid = s.oid
       AND d.objsubid = 0
       AND d.refclassid = 'pg_catalog.pg_class'::regclass
       AND d.refobjsubid > 0
       AND d.deptype IN ('a', 'i')
      JOIN pg_catalog.pg_class AS t
        ON t.oid = d.refobjid
       AND t.relkind IN ('r', 'p')
       AND t.relname IN (${values(APPLICATION_ACL_TABLES)})
      JOIN pg_catalog.pg_namespace AS tn ON tn.oid = t.relnamespace AND tn.nspname = 'public'
     WHERE r.rolname IN ('anon', 'authenticated')
     ORDER BY r.rolname, s.relname
  `);

  const reachableSequencePrivileges = await collectReachableSequencePrivileges(transaction, authorityRoles);

  const tableAcls = await query<Row>(transaction, Prisma.sql`
    SELECT c.relname AS table_name,
           CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
           acl.privilege_type,
           acl.is_grantable
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
      CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
      LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid = acl.grantee
     WHERE c.relname IN (${values(APPLICATION_ACL_TABLES)})
     ORDER BY c.relname, grantee, acl.privilege_type
  `);

  const columnAcls = await query<Row>(transaction, Prisma.sql`
    SELECT c.relname AS table_name,
           a.attname AS column_name,
           CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
           acl.privilege_type,
           acl.is_grantable
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
      LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid = acl.grantee
     WHERE c.relname IN (${values(APPLICATION_ACL_TABLES)})
     ORDER BY c.relname, a.attnum, grantee, acl.privilege_type
  `);

  const sequenceAcls = await query<Row>(transaction, Prisma.sql`
    SELECT s.relname AS sequence_name,
           CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
           acl.privilege_type,
           acl.is_grantable
      FROM pg_catalog.pg_class AS s
      JOIN pg_catalog.pg_namespace AS n ON n.oid = s.relnamespace AND n.nspname = 'public'
      JOIN pg_catalog.pg_depend AS d
        ON d.classid = 'pg_catalog.pg_class'::regclass
       AND d.objid = s.oid
       AND d.objsubid = 0
       AND d.refclassid = 'pg_catalog.pg_class'::regclass
       AND d.refobjsubid > 0
       AND d.deptype IN ('a', 'i')
      JOIN pg_catalog.pg_class AS t
        ON t.oid = d.refobjid
       AND t.relkind IN ('r', 'p')
       AND t.relname IN (${values(APPLICATION_ACL_TABLES)})
      JOIN pg_catalog.pg_namespace AS tn ON tn.oid = t.relnamespace AND tn.nspname = 'public'
      CROSS JOIN LATERAL pg_catalog.aclexplode(s.relacl) AS acl
      LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid = acl.grantee
     WHERE s.relkind = 'S'
     ORDER BY s.relname, grantee, acl.privilege_type
  `);

  const defaultAcls = await query<Row>(transaction, Prisma.sql`
    SELECT owner_role.rolname AS owner_role,
           CASE WHEN d.defaclnamespace = 0 THEN 'global' ELSE schema_name.nspname END AS schema_scope,
           d.defaclobjtype::text AS object_type,
           CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
           acl.privilege_type,
           acl.is_grantable
      FROM pg_catalog.pg_default_acl AS d
      JOIN pg_catalog.pg_roles AS owner_role ON owner_role.oid = d.defaclrole
      LEFT JOIN pg_catalog.pg_namespace AS schema_name ON schema_name.oid = d.defaclnamespace
      CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) AS acl
      LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid = acl.grantee
     WHERE d.defaclobjtype IN ('r', 'S')
       AND (d.defaclnamespace = 0 OR d.defaclnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public'))
       AND (acl.grantee = 0 OR grantee.rolname IN ('anon', 'authenticated'))
     ORDER BY owner_role.rolname, schema_scope, object_type, grantee, acl.privilege_type
  `);

  const publicSchema = await query<Row>(transaction, Prisma.sql`
    SELECT r.rolname,
           n.nspname,
           n.nspacl::text AS schema_acl,
           has_schema_privilege(r.rolname, n.oid, 'USAGE') AS can_usage,
           has_schema_privilege(r.rolname, n.oid, 'CREATE') AS can_create
      FROM pg_catalog.pg_namespace AS n
      JOIN pg_catalog.pg_roles AS r ON r.rolname IN (${roleValues})
     WHERE n.nspname = 'public'
     ORDER BY r.rolname
  `);

  const publicViewsAndFunctions = await query<Row>(transaction, Prisma.sql`
    SELECT 'view' AS object_kind,
           c.relname AS object_name,
           c.relkind::text AS object_type,
           pg_get_userbyid(c.relowner) AS owner_name,
           r.rolname AS grantee,
           has_table_privilege(r.rolname, c.oid, 'SELECT') AS can_read,
           false AS can_execute,
           false AS security_definer
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_catalog.pg_roles AS r ON r.rolname IN ('anon', 'authenticated')
     WHERE c.relkind IN ('v', 'm', 'f')
    UNION ALL
    SELECT 'function' AS object_kind,
           p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS object_name,
           p.prokind::text AS object_type,
           pg_get_userbyid(p.proowner) AS owner_name,
           r.rolname AS grantee,
           false AS can_read,
           has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute,
           p.prosecdef AS security_definer
      FROM pg_catalog.pg_proc AS p
      JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace AND n.nspname = 'public'
      JOIN pg_catalog.pg_roles AS r ON r.rolname IN ('anon', 'authenticated')
     WHERE p.prokind = 'f'
     ORDER BY object_kind, object_name, grantee
  `);

  const requiredCreatorRoles = unique([
    ...tables.map((table) => text(table.owner_name)).filter(Boolean),
    ...defaultAcls.map((acl) => text(acl.owner_role)).filter(Boolean),
  ]);
  const declaredCreators = unique(options.creatorRoles);
  const tableOwners = new Set(tables.map((table) => text(table.owner_name)).filter(Boolean));
  const browserPresent = new Set(roles.map((role) => text(role.rolname)));
  const browserRows = roles.filter((role) => BROWSER_ROLES.includes(text(role.rolname) as BrowserRole));
  const findings: string[] = [];

  if (tables.length !== APPLICATION_ACL_TABLES.length || tables.some((table) => !table.object_oid || !['r', 'p'].includes(text(table.relkind)))) {
    findings.push('application table allowlist has a missing, wrong-schema, or non-table object');
  }
  if (tables.some((table) => !bool(table.relrowsecurity))) findings.push('RLS is not enabled on every application table');
  if (tables.some((table) => bool(table.relforcerowsecurity))) findings.push('FORCE RLS is enabled; review the owner/runtime contract explicitly');
  if (requiredCreatorRoles.some((role) => !declaredCreators.includes(role))) {
    findings.push(`declared creator roles omit application creators: ${requiredCreatorRoles.filter((role) => !declaredCreators.includes(role)).join(', ')}`);
  }
  if (roles.filter((role) => options.creatorRoles.includes(text(role.rolname))).length !== declaredCreators.length) {
    findings.push('one or more declared creator roles do not exist');
  }
  if (currentUser === 'anon' || currentUser === 'authenticated') findings.push('preflight is running as a browser role');
  if (tables.some((table) => BROWSER_ROLES.includes(text(table.owner_name) as BrowserRole))) {
    findings.push('a browser role owns an application table');
  }
  if (browserRows.length !== BROWSER_ROLES.length) {
    findings.push(`browser role presence is incomplete; missing: ${BROWSER_ROLES.filter((role) => !browserPresent.has(role)).join(', ')}`);
  }
  if (browserRows.some((role) => hasDangerousRoleAttributes(role))) {
    findings.push('a browser role has superuser, BYPASSRLS, CREATEROLE, or CREATEDB authority');
  }
  if (effectiveTablePrivileges.some((row) => ['can_select', 'can_insert', 'can_update', 'can_delete', 'can_truncate', 'can_references', 'can_trigger'].some((key) => bool(row[key])))) {
    findings.push('a browser role has effective direct application-table privilege');
  }
  if (effectiveColumnPrivileges.some((row) => ['can_select', 'can_insert', 'can_update', 'can_references'].some((key) => bool(row[key])))) {
    findings.push('a browser role has effective application-column privilege');
  }
  if (effectiveSequencePrivileges.some((row) => ['can_usage', 'can_select', 'can_update'].some((key) => bool(row[key])))) {
    findings.push('a browser role has effective owned-sequence privilege');
  }
  if (tableAcls.some((acl) => ['PUBLIC', 'anon', 'authenticated'].includes(text(acl.grantee)))) {
    findings.push('a direct application-table ACL remains for PUBLIC or a browser role');
  }
  if (columnAcls.some((acl) => ['PUBLIC', 'anon', 'authenticated'].includes(text(acl.grantee)))) {
    findings.push('a direct application-column ACL remains for PUBLIC or a browser role');
  }
  if (sequenceAcls.some((acl) => ['PUBLIC', 'anon', 'authenticated'].includes(text(acl.grantee)))) {
    findings.push('a direct owned-sequence ACL remains for PUBLIC or a browser role');
  }
  if (defaultAcls.length > 0) findings.push('declared creator defaults still grant PUBLIC or browser privileges');
  if (publicSchema.some((row) => BROWSER_ROLES.includes(text(row.rolname) as BrowserRole) && bool(row.can_create))) {
    findings.push('a browser role has CREATE on the public schema');
  }
  if (publicViewsAndFunctions.some((row) => bool(row.can_read) || bool(row.can_execute))) {
    findings.push('a public view or function is effectively exposed to a browser role');
  }

  const protectedRoles = new Set([...requiredCreatorRoles, ...options.creatorRoles, ...options.runtimeRoles]);
  if (memberships.some((path) =>
    BROWSER_ROLES.includes(text(path.subject_role) as BrowserRole) &&
    protectedRoles.has(text(path.reachable_role)) &&
    (pathIsUsable(path, 'ordinary') || pathIsUsable(path, 'special'))
  )) {
    findings.push('a browser role has an inherited or SET ROLE path to an owner, creator, or runtime role');
  }
  findings.push(...assessReachableAuthority({
    memberships,
    roles,
    tables,
    runtimeRoles: options.runtimeRoles,
    creatorRoles: unique([...requiredCreatorRoles, ...options.creatorRoles]),
    reachableTablePrivileges,
    reachableColumnPrivileges,
    reachableSequencePrivileges,
    reachableSchemaPrivileges,
    migrationLedgerPrivileges,
  }));
  const currentRole = roles.find((role) => text(role.rolname) === currentUser);
  const currentIsSuperuser = bool(currentRole?.rolsuper);
  for (const creator of options.creatorRoles) {
    const canAct = creator === currentUser || currentIsSuperuser || memberships.some((path) => path.subject_role === currentUser && path.reachable_role === creator && bool(path.settable));
    if (!canAct) findings.push(`current identity cannot SET ROLE or act for declared creator ${creator}`);
  }

  const runtimeRows = options.runtimeRoles.map((role) => roles.find((candidate) => text(candidate.rolname) === role));
  if (options.requireRuntime && options.runtimeRoles.length === 0) {
    findings.push('non-owner runtime role was not declared; positive backend contract is blocked');
  }
  if (runtimeRows.some((role) => !role)) findings.push('one or more declared runtime roles do not exist');
  if (roles.filter((role) => tableOwners.has(text(role.rolname))).some((role) => bool(role.rolsuper) || bool(role.rolbypassrls))) {
    findings.push('an application table owner is superuser or has BYPASSRLS; owner risk requires explicit administrator review');
  }
  if (runtimeRows.some((role) => hasDangerousRoleAttributes(role))) {
    findings.push('declared runtime role has superuser, BYPASSRLS, CREATEROLE, or CREATEDB authority');
  }
  if (runtimeRows.some((role) => !bool(role?.rolcanlogin))) findings.push('declared runtime role cannot log in over TCP');
  if (options.runtimeRoles.some((role) => tableOwners.has(role))) findings.push('declared runtime role owns an application table');

  const runtimeAssessment = options.runtimeRoles.length > 0
    ? 'declared-not-executed'
    : options.requireRuntime ? 'blocked-unassessed' : 'blocked-unassessed';

  return {
    mode,
    target: { host: options.targetHost, database: options.targetDatabase },
    session,
    roles,
    memberships,
    tables,
    effectiveTablePrivileges,
    effectiveColumnPrivileges,
    sequences,
    effectiveSequencePrivileges,
    tableAcls,
    columnAcls,
    sequenceAcls,
    defaultAcls,
    publicSchema,
    publicViewsAndFunctions,
    reachableTablePrivileges,
    reachableColumnPrivileges,
    reachableSequencePrivileges,
    reachableSchemaPrivileges,
    migrationLedgerPrivileges,
    requiredCreatorRoles,
    declaredCreatorRoles: declaredCreators,
    declaredRuntimeRoles: unique(options.runtimeRoles),
    findings: unique(findings),
    runtimeAssessment,
    ready: findings.length === 0,
  };
}

async function applyCreatorDefaults(transaction: Transaction, creatorRoles: readonly string[], presentRoles: ReadonlySet<string>): Promise<void> {
  const grantees = ['PUBLIC', ...BROWSER_ROLES.filter((role) => presentRoles.has(role))];
  for (const creatorRole of creatorRoles) {
    const creator = identifier(creatorRole);
    for (const grantee of grantees) {
      const quotedGrantee = grantee === 'PUBLIC' ? grantee : identifier(grantee);
      await transaction.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE ${creator} REVOKE ALL PRIVILEGES ON TABLES FROM ${quotedGrantee}`);
      await transaction.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE ${creator} IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM ${quotedGrantee}`);
      await transaction.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE ${creator} REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${quotedGrantee}`);
      await transaction.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE ${creator} IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${quotedGrantee}`);
    }
  }
}

export function parseArgs(argv: readonly string[]): Options | { help: true } {
  const creatorRoles: string[] = [];
  const runtimeRoles: string[] = [];
  let targetHost = '';
  let targetDatabase = '';
  let applyDefaults = false;
  let approveGlobalDefaults = false;
  let requireRuntime = false;

  function nextValue(index: number, flag: string): [string, number] {
    const current = argv[index];
    if (current.startsWith(`${flag}=`)) return [current.slice(flag.length + 1), index];
    if (current === flag && argv[index + 1]) return [argv[index + 1], index + 1];
    throw new Error(`${flag} requires a value`);
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') return { help: true };
    if (arg === '--apply-defaults') { applyDefaults = true; continue; }
    if (arg === '--approve-global-defaults') { approveGlobalDefaults = true; continue; }
    if (arg === '--require-runtime-role') { requireRuntime = true; continue; }
    if (arg === '--target-host' || arg.startsWith('--target-host=')) {
      const result = nextValue(index, '--target-host'); targetHost = result[0]; index = result[1]; continue;
    }
    if (arg === '--target-database' || arg.startsWith('--target-database=')) {
      const result = nextValue(index, '--target-database'); targetDatabase = result[0]; index = result[1]; continue;
    }
    if (arg === '--creator-role' || arg.startsWith('--creator-role=')) {
      const result = nextValue(index, '--creator-role'); creatorRoles.push(result[0]); index = result[1]; continue;
    }
    if (arg === '--runtime-role' || arg.startsWith('--runtime-role=')) {
      const result = nextValue(index, '--runtime-role'); runtimeRoles.push(result[0]); index = result[1]; continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!targetHost || !targetDatabase) throw new Error('--target-host and --target-database are required');
  if (creatorRoles.length === 0) throw new Error('At least one --creator-role is required');
  if (new Set(creatorRoles).size !== creatorRoles.length) throw new Error('--creator-role values must be unique');
  if (new Set(runtimeRoles).size !== runtimeRoles.length) throw new Error('--runtime-role values must be unique');
  for (const role of [...creatorRoles, ...runtimeRoles]) identifier(role);
  if (applyDefaults && !approveGlobalDefaults) {
    throw new Error('--apply-defaults requires --approve-global-defaults because global defaults affect every schema for each declared creator');
  }
  if (!applyDefaults && approveGlobalDefaults) throw new Error('--approve-global-defaults requires --apply-defaults');
  return { targetHost, targetDatabase, creatorRoles, runtimeRoles, applyDefaults, approveGlobalDefaults, requireRuntime };
}

export function helpText(): string {
  return [
    'Read-only application ACL preflight (no .env loading and no writes by default).',
    '',
    'Required:',
    '  --target-host HOST --target-database DATABASE --creator-role ROLE',
    'Optional:',
    '  --creator-role ROLE          repeat for each declared application creator',
    '  --runtime-role ROLE          repeat for a candidate non-owner runtime role',
    '  --require-runtime-role       make the positive backend identity a readiness gate',
    '  --apply-defaults --approve-global-defaults',
    '                                revoke table/sequence defaults for declared creators',
    '                                in global and public-schema scope; still no grants',
    '  --help',
    '',
    'DIRECT_URL must be supplied explicitly in the process environment and must match',
    '--target-host and --target-database. Browser roles are never created or inferred.',
  ].join('\n');
}

export async function run(options: Options): Promise<PreflightReport | { before: PreflightReport; after: PreflightReport }> {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) throw new Error('DIRECT_URL is required; DATABASE_URL and project .env files are not used');
  const checkedUrl = parseDirectUrl(directUrl, options);
  const client = new PrismaClient({
    datasources: { db: { url: options.applyDefaults ? checkedUrl : readOnlyUrl(checkedUrl) } },
  });
  try {
    if (!options.applyDefaults) {
      return await client.$transaction(async (transaction) => {
        await enforceReadOnlyTransaction(transaction);
        return collect(transaction, options, 'read-only');
      }, { maxWait: 8000, timeout: 30000 });
    }
    return await client.$transaction(async (transaction) => {
      const before = await collect(transaction, options, 'apply-defaults');
      const presentRoles = new Set(before.roles.map((role) => text(role.rolname)));
      const missingCreators = options.creatorRoles.filter((role) => !presentRoles.has(role));
      if (missingCreators.length > 0) throw new Error(`Cannot apply defaults for missing creator roles: ${missingCreators.join(', ')}`);
      await applyCreatorDefaults(transaction, options.creatorRoles, presentRoles);
      const after = await collect(transaction, options, 'apply-defaults');
      if (after.defaultAcls.length > 0) throw new Error('Creator default postflight still finds PUBLIC or browser privileges');
      return { before, after };
    });
  } finally {
    await client.$disconnect();
  }
}

function safeError(error: unknown): string {
  return String(error instanceof Error ? error.message : error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-postgresql-url]');
}

async function main(): Promise<void> {
  let parsed: Options | { help: true };
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ACL preflight argument error: ${safeError(error)}`);
    process.exitCode = 2;
    return;
  }
  if ('help' in parsed) {
    console.log(helpText());
    return;
  }
  try {
    const result = await run(parsed);
    console.log(JSON.stringify(result, null, 2));
    const report = 'after' in result ? result.after : result;
    if (!report.ready) process.exitCode = 2;
  } catch (error) {
    console.error(`ACL preflight failed: ${safeError(error)}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
