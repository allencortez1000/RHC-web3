// Narrow Prisma raw-SQL protocol keeps offline tooling typecheck independent of
// generated model types. Actual database runs still require a generated 5.22 client.
export interface Tx {
  $executeRawUnsafe(sql: string, ...values: unknown[]): Promise<number>;
  $queryRawUnsafe<T>(sql: string, ...values: unknown[]): Promise<T>;
}
interface Client {
  $transaction<T>(
    fn: (tx: Tx) => Promise<T>,
    options: { maxWait: number; timeout: number; isolationLevel: string },
  ): Promise<T>;
  $disconnect(): Promise<void>;
}

export type Options = {
  mode: 'verify' | 'disposable';
  host: string;
  port: string;
  database: string;
  role: string;
  fixtureRole?: string;
  browserRoles: string[];
  confirmation?: string;
};
export const READ_ENV = 'CONNECTED_DOMAIN_READONLY_URL';
export const DISPOSABLE_ENV = 'CONNECTED_DOMAIN_DISPOSABLE_URL';
export function identifier(value: string) {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(value)) throw new Error('INVALID_IDENTIFIER');
  return `"${value}"`;
}
export function parseArgs(argv: readonly string[], mode: Options['mode']): Options {
  const values = new Map<string, string>();
  const browsers: string[] = [];
  let authorized = false;
  let initiallyEmpty = false;
  const authorization =
    mode === 'verify' ? '--authorize-read-only' : '--authorize-disposable-writes';
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--confirm-run-owned-initially-empty') {
      if (mode !== 'disposable' || initiallyEmpty)
        throw new Error('INVALID_DISPOSABLE_ATTESTATION');
      initiallyEmpty = true;
      continue;
    }
    if (flag === authorization) {
      if (authorized) throw new Error('DUPLICATE_AUTHORIZATION');
      authorized = true;
      continue;
    }
    if (
      ![
        '--target-host',
        '--target-port',
        '--target-database',
        '--target-role',
        '--fixture-role',
        '--browser-role',
        '--confirm-disposable',
      ].includes(flag)
    )
      throw new Error('UNKNOWN_ARGUMENT');
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error('MISSING_ARGUMENT');
    if (flag === '--browser-role') browsers.push(value);
    else {
      if (values.has(flag)) throw new Error('DUPLICATE_ARGUMENT');
      values.set(flag, value);
    }
  }
  if (!authorized) throw new Error('EXPLICIT_AUTHORIZATION_REQUIRED');
  const host = values.get('--target-host') || '',
    port = values.get('--target-port') || '',
    database = values.get('--target-database') || '',
    role = values.get('--target-role') || '';
  if (!host || !port || !database || !role) throw new Error('EXACT_TARGET_REQUIRED');
  if (
    !/^[a-z0-9.:[\]-]+$/.test(host) ||
    !/^\d{1,5}$/.test(port) ||
    Number(port) < 1 ||
    Number(port) > 65535
  )
    throw new Error('INVALID_TARGET');
  identifier(database);
  identifier(role);
  browsers.forEach(identifier);
  const fixtureRole = values.get('--fixture-role'),
    confirmation = values.get('--confirm-disposable');
  if (mode === 'verify' && (fixtureRole || confirmation))
    throw new Error('WRITE_ARGUMENT_IN_READ_ONLY_MODE');
  if (mode === 'disposable') {
    if (!initiallyEmpty) throw new Error('RUN_OWNED_INITIAL_EMPTY_CONFIRMATION_REQUIRED');
    // Numeric loopback only: no DNS resolution, redirects, tunnels or pooler discovery.
    if (!['127.0.0.1', '[::1]'].includes(host)) throw new Error('NUMERIC_LOOPBACK_REQUIRED');
    if (confirmation !== `${host}:${port}/${database}`)
      throw new Error('EXACT_DISPOSABLE_CONFIRMATION_REQUIRED');
    if (!fixtureRole || browsers.length !== 2)
      throw new Error('PRECREATED_FIXTURE_AND_TWO_BROWSER_ROLES_REQUIRED');
    identifier(fixtureRole);
    if (new Set([role, fixtureRole, ...browsers]).size !== 4)
      throw new Error('DISTINCT_ROLES_REQUIRED');
  }
  return { mode, host, port, database, role, fixtureRole, browserRoles: browsers, confirmation };
}
export function authorizedUrl(options: Options, env: NodeJS.ProcessEnv): string {
  const raw = env[options.mode === 'verify' ? READ_ENV : DISPOSABLE_ENV];
  if (!raw) throw new Error('DEDICATED_URL_REQUIRED');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('INVALID_DEDICATED_URL');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hash)
    throw new Error('INVALID_DEDICATED_URL');
  let database: string, role: string;
  try {
    database = decodeURIComponent(url.pathname.slice(1));
    role = decodeURIComponent(url.username);
  } catch {
    throw new Error('INVALID_DEDICATED_URL');
  }
  if (
    url.hostname !== options.host ||
    (url.port || '5432') !== options.port ||
    database !== options.database ||
    role !== options.role
  )
    throw new Error('URL_TARGET_MISMATCH');
  // Reject libpq host overrides, multi-host lists, sockets, schemas, role options,
  // file-based TLS secrets and arbitrary startup settings. Password stays in memory.
  for (const [key, value] of url.searchParams)
    if (key !== 'sslmode' || !['disable', 'require', 'verify-ca', 'verify-full'].includes(value))
      throw new Error('UNAPPROVED_URL_PARAMETER');
  if (url.searchParams.getAll('sslmode').length > 1) throw new Error('DUPLICATE_URL_PARAMETER');
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('connect_timeout', '5');
  url.searchParams.set('pool_timeout', '5');
  if (options.mode === 'verify')
    url.searchParams.set(
      'options',
      '-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=20000',
    );
  return url.toString();
}
export async function clientFor(url: string): Promise<Client> {
  // Prisma 5.22's constructor normally loads .env even with a datasource override.
  // Pin and disable BOTH paths before construction; never fall back on a new version.
  if (['DEBUG', 'RUST_LOG', 'PRISMA_LOG_LEVEL'].some((name) => !!process.env[name]))
    throw new Error('DEBUG_LOGGING_MUST_BE_DISABLED');
  const { PrismaClient, Prisma } = (await import('@prisma/client')) as unknown as {
    PrismaClient: new (options: unknown) => Client;
    Prisma: { prismaVersion: { client: string } };
  };
  if (Prisma.prismaVersion.client !== '5.22.0') throw new Error('UNREVIEWED_PRISMA_VERSION');
  type InternalConfig = { relativeEnvPaths: { rootEnvPath?: string; schemaEnvPath?: string } };
  const options = {
    datasources: { db: { url } },
    log: [],
    errorFormat: 'minimal' as const,
    __internal: {
      configOverride: (config: InternalConfig) => ({
        ...config,
        relativeEnvPaths: { rootEnvPath: undefined, schemaEnvPath: undefined },
      }),
    },
  };
  return new PrismaClient(options);
}

export async function confirmTransaction(tx: Tx, options: Options) {
  if (options.mode === 'verify') await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
  await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '2s'");
  await tx.$executeRawUnsafe("SET LOCAL idle_in_transaction_session_timeout = '20s'");
  await tx.$executeRawUnsafe('SET LOCAL search_path = pg_catalog, public');
  const rows = await tx.$queryRawUnsafe<
    {
      database: string;
      role: string;
      session: string;
      readonly: string;
      address: string | null;
      port: number | null;
    }[]
  >(
    `SELECT current_database() AS database,current_user AS role,session_user AS session,current_setting('transaction_read_only') AS readonly,inet_server_addr()::text AS address,inet_server_port() AS port`,
  );
  const r = rows[0];
  if (
    !r ||
    r.database !== options.database ||
    r.role !== options.role ||
    r.session !== options.role ||
    (options.mode === 'verify' && r.readonly !== 'on')
  )
    throw new Error('SERVER_IDENTITY_MISMATCH');
  if (
    (options.mode === 'disposable' || ['127.0.0.1', '[::1]'].includes(options.host)) &&
    (r.address !== options.host.replace(/\[|\]/g, '') || r.port !== Number(options.port))
  )
    throw new Error('SERVER_LOOPBACK_MISMATCH');
}
export function safeFailure(mode: string) {
  return {
    mode,
    status: 'failed',
    error: 'VERIFICATION_FAILED_OR_GATE_REJECTED',
    details:
      'No raw driver errors, SQL, connection strings, catalog definitions or customer content are emitted',
    realChecks: 'not-proven',
  };
}
export function help(mode: Options['mode']) {
  return {
    mode,
    required: [
      mode === 'verify' ? '--authorize-read-only' : '--authorize-disposable-writes',
      '--target-host HOST',
      '--target-port PORT',
      '--target-database DATABASE',
      '--target-role LOGIN_ROLE',
      ...(mode === 'disposable'
        ? [
            '--confirm-disposable HOST:PORT/DATABASE',
            '--confirm-run-owned-initially-empty',
            '--fixture-role PRECREATED_NONOWNER',
            '--browser-role PRECREATED_BROWSER_A',
            '--browser-role PRECREATED_BROWSER_B',
          ]
        : []),
    ],
    environment: mode === 'verify' ? READ_ENV : DISPOSABLE_ENV,
    envFiles: false,
    deploysMigrations: false,
    readOnlyRuntimeAssessment: 'not-executed',
    disposableCleanup: 'transaction rollback, including fixture grants/policy',
  };
}
