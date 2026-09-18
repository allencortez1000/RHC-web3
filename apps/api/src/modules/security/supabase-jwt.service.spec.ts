import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { errors, exportJWK, generateKeyPair, JWTPayload, KeyLike, SignJWT } from 'jose';
import { getControlledErrorLogMetadata } from '../../platform/controlled-errors';
import { SupabaseAdminCredentialRejectedException, SupabaseJwksUnavailableException, SupabaseJwtService, SupabaseProviderUnavailableException } from './supabase-jwt.service';

const subject = '10000000-0000-4000-8000-000000000001';
const issuer = 'https://issuer.example.test/auth/v1';
const confirmedAt = '2026-01-01T00:00:00.000Z';
const envKeys = ['SUPABASE_JWKS_URL', 'JWT_ISSUER', 'JWT_AUDIENCE', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY'] as const;

describe('SupabaseJwtService (real jose signatures and local JWKS; mocked Auth admin lookup)', () => {
  let server: Server;
  let jwksUrl: string;
  let ecKey: KeyLike;
  let rsaKey: KeyLike;
  let attackerKey: KeyLike;
  let service: SupabaseJwtService;
  let authFetch: jest.SpiedFunction<typeof fetch>;
  let authUser: Record<string, unknown>;
  let savedEnv: Array<[typeof envKeys[number], string | undefined]>;
  let jwksRequests = 0;
  let jwksStatus = 200;

  beforeAll(async () => {
    const [ec, rsa, attacker] = await Promise.all([generateKeyPair('ES256'), generateKeyPair('RS256'), generateKeyPair('ES256')]);
    ecKey = ec.privateKey;
    rsaKey = rsa.privateKey;
    attackerKey = attacker.privateKey;
    const keys = [
      { ...await exportJWK(ec.publicKey), kid: 'ec-test', alg: 'ES256', use: 'sig' },
      { ...await exportJWK(rsa.publicKey), kid: 'rsa-test', alg: 'RS256', use: 'sig' },
    ];
    server = createServer((_req, res) => {
      jwksRequests += 1;
      res.writeHead(jwksStatus, { 'Content-Type': 'application/json' });
      res.end(jwksStatus === 200 ? JSON.stringify({ keys }) : '{}');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    jwksUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/.well-known/jwks.json`;
  });

  afterAll(async () => {
    if (server?.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  beforeEach(() => {
    savedEnv = envKeys.map((key) => [key, process.env[key]]);
    Object.assign(process.env, {
      SUPABASE_JWKS_URL: jwksUrl, JWT_ISSUER: issuer, JWT_AUDIENCE: 'authenticated',
      SUPABASE_URL: 'https://auth.example.test/', SUPABASE_SECRET_KEY: 'test-only-server-secret',
    });
    jwksStatus = 200;
    authUser = { id: subject, email: 'CURRENT@EXAMPLE.TEST', email_confirmed_at: confirmedAt };
    authFetch = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(authUser), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    service = new SupabaseJwtService();
  });

  afterEach(() => {
    authFetch.mockRestore();
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function token(patch: JWTPayload = {}, key = ecKey, alg = 'ES256', kid = 'ec-test') {
    const seconds = Math.floor(Date.now() / 1000);
    return new SignJWT({ sub: subject, email: 'stale@example.test', iss: issuer, aud: 'authenticated', iat: seconds, exp: seconds + 300, ...patch })
      .setProtectedHeader({ alg, kid }).sign(key);
  }

  it.each(['ES256', 'RS256'])('validates a real %s signature and uses authoritative Auth identity, not stale token claims', async (alg) => {
    const before = jwksRequests;
    const signed = alg === 'RS256' ? await token({}, rsaKey, alg, 'rsa-test') : await token();
    await expect(service.verify(signed)).resolves.toEqual({ subject, email: 'current@example.test', emailConfirmed: true, emailConfirmedAt: confirmedAt });
    expect(jwksRequests).toBeGreaterThan(before);
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(authFetch).toHaveBeenCalledWith(`https://auth.example.test/auth/v1/admin/users/${subject}`, {
      headers: { Authorization: 'Bearer test-only-server-secret', apikey: 'test-only-server-secret' },
      signal: expect.any(AbortSignal), redirect: 'error',
    });
  });

  it('caches the JWKS but rechecks authoritative identity for every verification', async () => {
    const signed = await token();
    await service.verify(signed);
    const requestsAfterFirst = jwksRequests;
    authUser.email_confirmed_at = null;
    await expect(service.verify(signed)).resolves.toMatchObject({ emailConfirmed: false, emailConfirmedAt: null });
    expect(jwksRequests).toBe(requestsAfterFirst);
    expect(authFetch).toHaveBeenCalledTimes(2);
  });

  it('rejects a signature from an attacker key even with the trusted kid', async () => {
    await expect(service.verify(await token({}, attackerKey))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('rejects payload tampering before contacting Auth', async () => {
    const parts = (await token()).split('.');
    parts[1] = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(parts[1], 'base64url').toString()), sub: 'attacker' })).toString('base64url');
    await expect(service.verify(parts.join('.'))).rejects.toThrow('Invalid or expired access token');
    expect(authFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong issuer', { iss: 'https://attacker.example.test' }],
    ['wrong audience', { aud: 'service_role' }],
    ['expired', { exp: 1 }],
    ['not yet valid', { nbf: 4102444800 }],
    ['missing subject', { sub: undefined }],
    ['empty subject', { sub: '' }],
    ['missing expiry', { exp: undefined }],
    ['missing issued-at', { iat: undefined }],
    ['missing email', { email: undefined }],
    ['non-string email', { email: 42 }],
  ] as Array<[string, JWTPayload]>)('rejects a signed token with %s before contacting Auth', async (_label, patch) => {
    await expect(service.verify(await token(patch))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('rejects symmetric HS256 tokens even with otherwise valid claims', async () => {
    const seconds = Math.floor(Date.now() / 1000);
    const signed = await new SignJWT({ sub: subject, email: 'user@example.test', iss: issuer, aud: 'authenticated', iat: seconds, exp: seconds + 300 })
      .setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode('test-only-symmetric-key-not-trusted'));
    await expect(service.verify(signed)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it.each(['', 'not-a-jwt', 'e30.e30.'])('rejects malformed/unsigned token %j', async (signed) => {
    await expect(service.verify(signed)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('defaults the audience to authenticated when JWT_AUDIENCE is absent', async () => {
    delete process.env.JWT_AUDIENCE;
    await expect(service.verify(await token())).resolves.toMatchObject({ subject });
  });

  it('honors a configured non-default audience', async () => {
    process.env.JWT_AUDIENCE = 'custom-audience';
    await expect(service.verify(await token())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authFetch).not.toHaveBeenCalled();
    await expect(service.verify(await token({ aud: 'custom-audience' }))).resolves.toMatchObject({ subject });
  });

  it.each(['JWT_ISSUER', 'SUPABASE_JWKS_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY'] as const)('fails closed with provider-unavailable when %s is missing', async (key) => {
    delete process.env[key];
    await expect(service.verify(await token())).rejects.toBeInstanceOf(SupabaseProviderUnavailableException);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it.each([null, undefined, 'not-a-date', '2999-01-01T00:00:00Z', true])('does not trust JWT confirmation claims when Auth confirmation is %s', async (email_confirmed_at) => {
    authUser.email_confirmed_at = email_confirmed_at;
    const signed = await token({ email_confirmed: true, email_confirmed_at: confirmedAt, user_metadata: { email_verified: true } });
    await expect(service.verify(signed)).resolves.toEqual({ subject, email: 'current@example.test', emailConfirmed: false, emailConfirmedAt: null });
  });

  it.each([
    { id: 'another-user' }, { id: undefined }, { email: null }, { is_anonymous: true },
    { deleted_at: confirmedAt }, { banned_until: '2999-01-01T00:00:00Z' },
  ])('rejects an ineligible or mismatched Auth identity %j', async (patch) => {
    Object.assign(authUser, patch);
    await expect(service.verify(await token())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts an expired ban and normalizes the authoritative confirmation timestamp', async () => {
    Object.assign(authUser, { banned_until: '2000-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T01:00:00+01:00' });
    await expect(service.verify(await token())).resolves.toMatchObject({ emailConfirmed: true, emailConfirmedAt: confirmedAt });
  });

  it.each([401, 403])('classifies Auth Admin HTTP %s as a provider credential rejection, not a customer authentication rejection', async (status) => {
    authFetch.mockResolvedValueOnce(new Response('{}', { status }));
    const error = await service.verify(await token()).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(SupabaseAdminCredentialRejectedException);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(getControlledErrorLogMetadata(error)).toEqual({ category: 'provider_unavailable', internal_code: 'SUPABASE_ADMIN_CREDENTIAL_REJECTED', provider: 'supabase', operation: 'admin_identity_lookup', provider_status: status });
  });

  it('keeps an Auth Admin 404 as a customer authentication rejection', async () => {
    authFetch.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    await expect(service.verify(await token())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([408, 429, 500, 502, 503, 504])('classifies Auth HTTP %s as provider unavailable', async (status) => {
    authFetch.mockResolvedValueOnce(new Response('{}', { status }));
    const error = await service.verify(await token()).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(SupabaseProviderUnavailableException);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(getControlledErrorLogMetadata(error)).toEqual(expect.objectContaining({ category: 'provider_unavailable', internal_code: 'SUPABASE_AUTH_PROVIDER_UNAVAILABLE', provider: 'supabase', operation: 'admin_identity_lookup', provider_status: status }));
  });

  it.each([
    ['network failure', Object.assign(new Error('Simulated connection reset'), { code: 'ECONNRESET' })],
    ['timeout', Object.assign(new Error('Simulated provider timeout'), { name: 'AbortError' })],
  ] as const)('fails closed on an Auth %s without misclassifying it as invalid credentials', async (_label, failure) => {
    authFetch.mockRejectedValueOnce(failure);
    const error = await service.verify(await token()).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(SupabaseProviderUnavailableException);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(getControlledErrorLogMetadata(error)).toEqual(expect.objectContaining({ category: 'provider_unavailable', internal_code: 'SUPABASE_AUTH_PROVIDER_UNAVAILABLE', provider: 'supabase', operation: 'admin_identity_lookup' }));
  });

  it('fails closed on malformed Auth JSON as provider unavailable', async () => {
    authFetch.mockResolvedValueOnce(new Response('not-json', { status: 200 }));
    const error = await service.verify(await token()).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(SupabaseProviderUnavailableException);
    expect(getControlledErrorLogMetadata(error)).toEqual(expect.objectContaining({ operation: 'admin_identity_lookup', provider_status: 200 }));
  });

  it('classifies an HTTP JWKS failure as provider unavailability without contacting Auth Admin', async () => {
    jwksStatus = 500;
    const error = await service.verify(await token()).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(SupabaseJwksUnavailableException);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(getControlledErrorLogMetadata(error)).toEqual({ category: 'provider_unavailable', internal_code: 'SUPABASE_JWKS_UNAVAILABLE', provider: 'supabase', operation: 'jwks_fetch' });
    expect(authFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['timeout', new errors.JWKSTimeout()],
    ['connection failure', Object.assign(new Error('Simulated connection refusal'), { code: 'ECONNREFUSED' })],
    ['TLS certificate validation failure', Object.assign(new Error('Simulated certificate validation failure'), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' })],
  ] as const)('classifies a JWKS %s as provider unavailability without contacting Auth Admin', async (_label, failure) => {
    (service as any).jwks = jest.fn().mockRejectedValue(failure);
    const error = await service.verify(await token()).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(SupabaseJwksUnavailableException);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(getControlledErrorLogMetadata(error)).toEqual({ category: 'provider_unavailable', internal_code: 'SUPABASE_JWKS_UNAVAILABLE', provider: 'supabase', operation: 'jwks_fetch' });
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('keeps an unmatched JWKS signing key as an authentication rejection', async () => {
    await expect(service.verify(await token({}, ecKey, 'ES256', 'unknown-kid'))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authFetch).not.toHaveBeenCalled();
  });
});
