import { loadEnv, loadLocalEnvFiles } from '@rhc/config';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// Synthetic values only: these tests never load repository .env files.
const production = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://fixture:fixture@db.example.test:5432/postgres?sslmode=require',
  DIRECT_URL: 'postgres://fixture:fixture@[2001:db8::1]:5432/postgres',
  SUPABASE_URL: 'https://project.example.test',
  SUPABASE_SECRET_KEY: 'fixture-secret',
  SUPABASE_JWKS_URL: 'https://project.example.test/auth/v1/.well-known/jwks.json',
  JWT_ISSUER: 'https://project.example.test/auth/v1',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
  UPSTASH_REDIS_REST_TOKEN: 'fixture-token',
  CUSTOMER_WEB_URL: 'https://customer.example.test',
  ADMIN_WEB_URL: 'https://admin.example.test',
  CORS_ORIGINS: 'https://customer.example.test, https://admin.example.test',
});

function errorMessage(source: NodeJS.ProcessEnv): string {
  try { loadEnv(source); } catch (error) { return (error as Error).message; }
  throw new Error('Expected configuration rejection');
}

describe('proxy environment validation', () => {
  it('defaults to disabled trust and accepts only explicit IPv4/IPv6 addresses and CIDRs', () => {
    expect(loadEnv({}).TRUSTED_PROXY_CIDRS).toBe(false);
    expect(loadEnv({ TRUSTED_PROXY_CIDRS: '  ' }).TRUSTED_PROXY_CIDRS).toBe(false);
    expect(loadEnv({ TRUSTED_PROXY_CIDRS: '192.0.2.1, 198.51.100.0/24, 2001:db8::1, 2001:db8:1::/64, ::ffff:192.0.2.1/128, 192.0.2.1' }).TRUSTED_PROXY_CIDRS)
      .toEqual(['192.0.2.1', '198.51.100.0/24', '2001:db8::1', '2001:db8:1::/64', '::ffff:192.0.2.1/128']);
  });

  it.each(['true', 'false', '*', '1', '2', '-1', 'loopback', 'linklocal', 'uniquelocal', 'proxy.example.test',
    '0.0.0.0/0', '::/0', '::ffff:0.0.0.0/96', '0000:0000:0000:0000:0000:ffff:0000:0000/96',
    '192.0.2.1/33', '2001:db8::1/129', '192.0.2.1/-1', '192.0.2.1/01', '192.0.2.1/24/1',
    '192.0.2.1/', '999.0.0.1', '127.1', '192.168.001.1', '[::1]', 'fe80::1%eth0', '192.0.2.1,', ','])('rejects unsafe or malformed proxy setting %s', (value) => {
    expect(errorMessage({ TRUSTED_PROXY_CIDRS: value })).toBe('Invalid environment configuration: TRUSTED_PROXY_CIDRS');
  });

  it('bounds the allowlist size', () => {
    expect(() => loadEnv({ TRUSTED_PROXY_CIDRS: Array(65).fill('192.0.2.1').join(',') })).toThrow('TRUSTED_PROXY_CIDRS');
    expect(() => loadEnv({ TRUSTED_PROXY_CIDRS: 'a'.repeat(8193) })).toThrow('TRUSTED_PROXY_CIDRS');
  });
});

describe('production environment validation', () => {
  it.each(['production', 'staging'])('accepts an aligned HTTPS configuration in %s without mutating the source', (NODE_ENV) => {
    const source: Readonly<NodeJS.ProcessEnv> = Object.freeze({ ...production(), NODE_ENV });
    const env = loadEnv(source);
    expect(env.PORT).toBe(4000);
    expect(env.TRUSTED_PROXY_CIDRS).toBe(false);
    expect(source.PORT).toBeUndefined();
    expect(env.CORS_ORIGINS).toBe(source.CORS_ORIGINS);
  });

  it.each(['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_JWKS_URL', 'JWT_ISSUER',
    'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'CUSTOMER_WEB_URL', 'ADMIN_WEB_URL', 'CORS_ORIGINS'])('requires %s outside development', (key) => {
    const source = production();
    delete source[key];
    expect(errorMessage(source)).toContain(key);
  });

  it.each(['SUPABASE_URL', 'SUPABASE_JWKS_URL', 'JWT_ISSUER', 'UPSTASH_REDIS_REST_URL', 'R2_ENDPOINT', 'CUSTOMER_WEB_URL', 'ADMIN_WEB_URL', 'API_URL', 'SENTRY_DSN'])('requires HTTPS for %s', (key) => {
    const source = production();
    source[key] = (source[key] ?? 'https://endpoint.example.test').replace('https:', 'http:');
    expect(errorMessage(source)).toContain(key);
  });

  it.each([
    ['SUPABASE_URL', 'https://project.example.test/unexpected'],
    ['SUPABASE_URL', 'https://fixture-secret@project.example.test'],
    ['SUPABASE_JWKS_URL', 'https://other.example.test/auth/v1/.well-known/jwks.json'],
    ['SUPABASE_JWKS_URL', 'https://project.example.test/.well-known/jwks.json'],
    ['SUPABASE_JWKS_URL', 'https://project.example.test/auth/v1/.well-known/jwks.json?token=fixture-secret'],
    ['JWT_ISSUER', 'https://other.example.test/auth/v1'],
    ['JWT_ISSUER', 'https://project.example.test/auth/v1/'],
    ['JWT_ISSUER', 'https://project.example.test/auth/v2'],
    ['UPSTASH_REDIS_REST_URL', 'https://fixture-secret@redis.example.test'],
  ])('rejects misaligned or credential-bearing %s', (key, value) => {
    expect(errorMessage({ ...production(), [key]: value })).toContain(key);
  });

  it.each(['*', '', 'https://*.example.test', 'https://customer.example.test/', 'https://customer.example.test/path',
    'null', 'http://customer.example.test', 'https://customer.example.test,', 'https://other.example.test',
    'https://customer.example.test,https://admin.example.test,https://*.example.test'])('requires explicit frontend CORS origins: %s', (value) => {
    expect(errorMessage({ ...production(), CORS_ORIGINS: value })).toContain('CORS_ORIGINS');
  });

  it.each(['DATABASE_URL', 'DIRECT_URL'])('validates %s syntax without disclosing credentials', (key) => {
    for (const value of ['not-a-url-fixture-secret', 'https://fixture:fixture-secret@db.example.test/postgres',
      'postgresql://fixture:fixture-secret@/postgres', 'postgresql://fixture:fixture-secret@db.example.test',
      'postgresql://fixture:fixture-secret@db.example.test:65536/postgres', 'postgresql://fixture:fixture-secret@db.example.test/postgres#fragment',
      'postgresql://fixture:bad%password@db.example.test/postgres']) {
      const message = errorMessage({ ...production(), [key]: value });
      expect(message).toBe(`Invalid environment configuration: ${key}`);
      expect(message).not.toContain('fixture-secret');
      expect(message).not.toContain(value);
    }
  });

  it('sanitizes enum and number validation errors as well as URL errors', () => {
    const message = errorMessage({ NODE_ENV: 'fixture-secret', PORT: 'fixture-token', DATABASE_URL: 'fixture-password' });
    expect(message).toContain('NODE_ENV');
    expect(message).toContain('PORT');
    expect(message).toContain('DATABASE_URL');
    expect(message).not.toMatch(/fixture/);
  });

  it('rejects production mock mode and invalid listen ports', () => {
    expect(errorMessage({ ...production(), USE_MOCK_DATA: 'true' })).toContain('USE_MOCK_DATA');
    for (const PORT of ['0', '65536', '-1', '1.5', 'NaN']) expect(errorMessage({ PORT })).toContain('PORT');
  });

  it('allows local HTTP services only in development/test and never loads files for an explicit source', () => {
    const loader = jest.spyOn(process, 'loadEnvFile').mockImplementation(() => { throw new Error('Must not load a file'); });
    try {
      const env = loadEnv({ NODE_ENV: 'test', SUPABASE_URL: 'http://localhost:54321', JWT_ISSUER: 'http://localhost:54321/auth/v1', SUPABASE_JWKS_URL: 'http://localhost:54321/auth/v1/.well-known/jwks.json' });
      expect(env.CORS_ORIGINS).toBe('http://localhost:3002');
      expect(env.DATABASE_URL).toBeUndefined();
      expect(loader).not.toHaveBeenCalled();
    } finally { loader.mockRestore(); }
  });
});

describe('optional Node env file loading', () => {
  it('resolves both files relative to the repository, independent of cwd', () => {
    const loader = jest.fn();
    loadLocalEnvFiles(undefined, loader);
    expect(loader.mock.calls.map(([path]) => path)).toEqual([
      resolve(__dirname, '../../../.env'), resolve(__dirname, '../../../apps/api/.env'),
    ]);
  });

  it('ignores only missing optional files and sanitizes all other failures', () => {
    const missing = jest.fn(() => { throw Object.assign(new Error('synthetic path'), { code: 'ENOENT' }); });
    loadLocalEnvFiles(tmpdir(), missing);
    expect(missing).toHaveBeenCalledTimes(2);
    for (const error of [Object.assign(new Error('fixture-secret'), { code: 'EACCES' }), new Error('fixture-secret'), null]) {
      expect(() => loadLocalEnvFiles(tmpdir(), () => { throw error; })).toThrow('Unable to load optional environment file');
      try { loadLocalEnvFiles(tmpdir(), () => { throw error; }); } catch (caught) {
        expect(String(caught)).not.toContain('fixture-secret');
        expect((caught as Error).cause).toBeUndefined();
      }
    }
  });

  it('uses the real Node loader without overriding runtime injection or logging file contents', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'rhc-env-test-'));
    const keys = ['RHC_ENV_TEST_INJECTED', 'RHC_ENV_TEST_SHARED', 'RHC_ENV_TEST_API', 'RHC_ENV_TEST_EMPTY'];
    // Jest replaces process.env; a child exercises the actual OS-backed Node loader.
    // No deployment credentials are inherited by the child.
    try {
      mkdirSync(resolve(root, 'apps/api'), { recursive: true });
      writeFileSync(resolve(root, '.env'), 'RHC_ENV_TEST_INJECTED=file\nRHC_ENV_TEST_SHARED=root\nRHC_ENV_TEST_EMPTY=file\n');
      writeFileSync(resolve(root, 'apps/api/.env'), 'RHC_ENV_TEST_INJECTED=api\nRHC_ENV_TEST_SHARED=api\nRHC_ENV_TEST_API="api fixture"\n');
      const script = `
        const assert = require('node:assert/strict');
        const { loadLocalEnvFiles } = require(${JSON.stringify(resolve(__dirname, '../../../packages/config/dist/index.js'))});
        loadLocalEnvFiles(${JSON.stringify(root)});
        assert.deepEqual(${JSON.stringify(keys)}.map(key => process.env[key]), ['runtime', 'root', 'api fixture', '']);
      `;
      const child = spawnSync(process.execPath, ['-e', script], {
        cwd: root, timeout: 5000, encoding: 'utf8',
        env: { SystemRoot: process.env.SystemRoot, RHC_ENV_TEST_INJECTED: 'runtime', RHC_ENV_TEST_EMPTY: '' },
      });
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(0);
      expect(child.stdout).toBe('');
      expect(child.stderr).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
