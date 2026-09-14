import { BlockList, isIP } from 'node:net';
import { resolve } from 'node:path';
import { z } from 'zod';

const mappedIpv4 = new BlockList();
mappedIpv4.addSubnet('::ffff:0:0', 96, 'ipv6');

function validProxyAddress(value: string): boolean {
  const [address, prefix, extra] = value.split('/');
  const family = isIP(address);
  if (!family || address.includes('%') || extra !== undefined) return false;
  if (prefix === undefined) return true;
  if (!/^(0|[1-9]\d*)$/.test(prefix)) return false;
  const bits = Number(prefix);
  // Never allow a catch-all, including IPv4-mapped IPv6 catch-alls.
  const mapped = family === 6 && mappedIpv4.check(address, 'ipv6');
  return bits > (mapped ? 96 : 0) && bits <= (family === 4 ? 32 : 128);
}

const trustedProxies = z.string().max(8192).default('').transform((value, ctx): false | string[] => {
  if (!value.trim()) return false;
  const addresses = value.split(',').map((entry) => entry.trim());
  if (addresses.length > 64 || !addresses.every(validProxyAddress)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Expected explicit IP addresses or nonzero CIDRs' });
    return z.NEVER;
  }
  return [...new Set(addresses)];
});

function httpUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (value !== value.trim() || /[\s\\]/.test(value) || !/^https?:\/\//.test(value)
      || !url.hostname || url.hostname.includes('*') || url.username || url.password || url.hash || url.search) return undefined;
    return url;
  } catch { return undefined; }
}

const endpoint = z.string().refine((value) => Boolean(httpUrl(value)), 'Expected an HTTP(S) URL without credentials, query or fragment');
const databaseUrl = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return /^postgres(?:ql)?:\/\//.test(value) && !/[\s\\]/.test(value) && !/%(?![\da-f]{2})/i.test(value)
      && ['postgres:', 'postgresql:'].includes(url.protocol) && Boolean(url.hostname)
      && /^\/[^/]+$/.test(url.pathname) && !url.hash
      && (!url.port || (/^\d+$/.test(url.port) && Number(url.port) > 0 && Number(url.port) <= 65535));
  } catch { return false; }
}, 'Expected a PostgreSQL database URL');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  DATABASE_URL: databaseUrl.optional(),
  DIRECT_URL: databaseUrl.optional(),
  SUPABASE_URL: endpoint.optional(),
  SUPABASE_SECRET_KEY: z.string().refine((value) => value.trim().length > 0, 'Expected a nonempty secret').optional(),
  SUPABASE_JWKS_URL: endpoint.optional(),
  JWT_AUDIENCE: z.string().min(1).default('authenticated'),
  JWT_ISSUER: endpoint.optional(),
  UPSTASH_REDIS_REST_URL: endpoint.optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().refine((value) => value.trim().length > 0, 'Expected a nonempty token').optional(),
  USE_MOCK_DATA: z.enum(['true', 'false']).default('false'),
  R2_ENDPOINT: endpoint.optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  CUSTOMER_WEB_URL: endpoint.optional(),
  ADMIN_WEB_URL: endpoint.optional(),
  API_URL: endpoint.optional(),
  CORS_ORIGINS: z.string().max(8192).optional(),
  TRUSTED_PROXY_CIDRS: trustedProxies,
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
}).superRefine((env, ctx) => {
  const invalid = (key: keyof typeof env) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Invalid or missing configuration' });
  const nonDevelopment = env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';
  if (nonDevelopment) {
    if (env.USE_MOCK_DATA === 'true') invalid('USE_MOCK_DATA');
    for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_JWKS_URL', 'JWT_ISSUER', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'CUSTOMER_WEB_URL', 'ADMIN_WEB_URL', 'CORS_ORIGINS'] as const) {
      if (!env[key]) invalid(key);
    }
    for (const key of ['SUPABASE_URL', 'SUPABASE_JWKS_URL', 'JWT_ISSUER', 'UPSTASH_REDIS_REST_URL', 'R2_ENDPOINT', 'CUSTOMER_WEB_URL', 'ADMIN_WEB_URL', 'API_URL', 'SENTRY_DSN'] as const) {
      if (env[key] && !env[key].startsWith('https://')) invalid(key);
    }
  }
  if (env.SUPABASE_URL) {
    const base = httpUrl(env.SUPABASE_URL);
    if (!base || base.pathname !== '/') invalid('SUPABASE_URL');
    if (base && env.JWT_ISSUER && env.JWT_ISSUER !== `${base.origin}/auth/v1`) invalid('JWT_ISSUER');
    if (base && env.SUPABASE_JWKS_URL && env.SUPABASE_JWKS_URL !== `${base.origin}/auth/v1/.well-known/jwks.json`) invalid('SUPABASE_JWKS_URL');
  } else if (env.JWT_ISSUER && env.SUPABASE_JWKS_URL && env.SUPABASE_JWKS_URL !== `${env.JWT_ISSUER}/.well-known/jwks.json`) {
    invalid('SUPABASE_JWKS_URL');
  }
  for (const key of ['CUSTOMER_WEB_URL', 'ADMIN_WEB_URL'] as const) {
    if (env[key] && httpUrl(env[key])?.pathname !== '/') invalid(key);
  }
  const origins = env.CORS_ORIGINS?.split(',').map((value) => value.trim());
  if (origins && (!origins.length || origins.some((value) => {
    const url = httpUrl(value);
    return !url || value !== url.origin || (nonDevelopment && url.protocol !== 'https:');
  }))) invalid('CORS_ORIGINS');
  if (nonDevelopment) {
    for (const key of ['CUSTOMER_WEB_URL', 'ADMIN_WEB_URL'] as const) {
      const url = env[key] && httpUrl(env[key]);
      if (url && !origins?.includes(url.origin)) invalid('CORS_ORIGINS');
    }
  }
}).transform((env) => ({ ...env, CORS_ORIGINS: env.CORS_ORIGINS ?? 'http://localhost:3002' }));

export type RhcEnv = z.infer<typeof envSchema>;

// Validation is deliberately pure: explicit test sources never load files or read process.env.
export function loadEnv(source: NodeJS.ProcessEnv = process.env): RhcEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'environment')))];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }
  return result.data;
}

// Node preserves existing variables: runtime injection > repository .env > API .env.
// Resolve from this package, not cwd, so workspace scripts and compiled startup agree.
export function loadLocalEnvFiles(
  root = resolve(__dirname, '../../..'),
  loader: (path: string) => void = (path) => process.loadEnvFile(path),
): void {
  for (const path of [resolve(root, '.env'), resolve(root, 'apps/api/.env')]) {
    try { loader(path); } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') continue;
      // Filesystem/parse exceptions can contain file contents or deployment paths.
      throw new Error('Unable to load optional environment file');
    }
  }
}
