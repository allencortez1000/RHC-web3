import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose';
import { ProviderUnavailableException, type ControlledErrorLogMetadata } from '../../platform/controlled-errors';

export type SupabaseIdentity = {
  subject: string;
  email: string;
  emailConfirmed: boolean;
  emailConfirmedAt?: string | null;
};

const defaultProviderMetadata: ControlledErrorLogMetadata = {
  category: 'provider_unavailable',
  internal_code: 'SUPABASE_AUTH_PROVIDER_UNAVAILABLE',
  provider: 'supabase',
  operation: 'admin_identity_lookup',
};

export class SupabaseProviderUnavailableException extends ProviderUnavailableException {
  constructor(metadata: ControlledErrorLogMetadata = defaultProviderMetadata) {
    super(metadata);
  }
}

function providerUnavailable(providerStatus?: number): SupabaseProviderUnavailableException {
  return new SupabaseProviderUnavailableException({
    ...defaultProviderMetadata,
    ...(providerStatus !== undefined ? { provider_status: providerStatus } : {}),
  });
}

export class SupabaseJwksUnavailableException extends SupabaseProviderUnavailableException {
  constructor(providerStatus?: number) {
    super({
      category: 'provider_unavailable',
      internal_code: 'SUPABASE_JWKS_UNAVAILABLE',
      provider: 'supabase',
      operation: 'jwks_fetch',
      ...(providerStatus !== undefined ? { provider_status: providerStatus } : {}),
    });
  }
}

export class SupabaseAdminCredentialRejectedException extends SupabaseProviderUnavailableException {
  constructor(providerStatus: number) {
    super({
      category: 'provider_unavailable',
      internal_code: 'SUPABASE_ADMIN_CREDENTIAL_REJECTED',
      provider: 'supabase',
      operation: 'admin_identity_lookup',
      provider_status: providerStatus,
    });
  }
}

const providerErrorCodes = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EHOSTUNREACH',
  'ENETUNREACH', 'EPIPE', 'ECONNABORTED', 'UND_ERR_CONNECT_TIMEOUT', 'ERR_NETWORK',
  'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
]);

function isProviderJwksFailure(error: unknown): boolean {
  if (error instanceof errors.JWKSTimeout || error instanceof errors.JWKInvalid || error instanceof errors.JWKSInvalid || error instanceof errors.JWKSMultipleMatchingKeys) return true;
  if (error instanceof errors.JOSEError) return error.code === 'ERR_JOSE_GENERIC';
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; name?: unknown };
  return (typeof candidate.code === 'string' && providerErrorCodes.has(candidate.code)) || candidate.name === 'AbortError' || candidate.name === 'TimeoutError';
}

@Injectable()
export class SupabaseJwtService {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  private getJwks() {
    const url = process.env.SUPABASE_JWKS_URL;
    if (!url) throw new SupabaseJwksUnavailableException();
    try {
      this.jwks ??= createRemoteJWKSet(new URL(url), { timeoutDuration: 5000 });
      return this.jwks;
    } catch {
      throw new SupabaseJwksUnavailableException();
    }
  }

  async verify(token: string): Promise<SupabaseIdentity> {
    let payload: JWTPayload;
    try {
      const issuer = process.env.JWT_ISSUER;
      if (!issuer) throw new SupabaseJwksUnavailableException();
      ({ payload } = await jwtVerify(token, this.getJwks(), {
        issuer,
        audience: process.env.JWT_AUDIENCE ?? 'authenticated',
        algorithms: ['ES256', 'RS256'],
        requiredClaims: ['sub', 'exp', 'iat'],
      }));
    } catch (error) {
      if (error instanceof SupabaseProviderUnavailableException) throw error;
      if (isProviderJwksFailure(error)) throw new SupabaseJwksUnavailableException();
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const identity = this.toIdentity(payload);
    const confirmed = await this.confirmedIdentity(identity.subject);
    return { subject: identity.subject, ...confirmed };
  }

  private toIdentity(payload: JWTPayload): SupabaseIdentity {
    if (!payload.sub || typeof payload.email !== 'string') throw new UnauthorizedException('Token is missing required identity claims');
    return {
      subject: payload.sub,
      email: payload.email.toLowerCase(),
      // Supabase access-token claims do not provide a portable, authoritative
      // email confirmation field. Confirmation is verified below through the
      // server-only Auth admin API after JWT signature validation.
      emailConfirmed: false,
    };
  }

  private async confirmedIdentity(subject: string): Promise<Omit<SupabaseIdentity, 'subject'>> {
    const baseUrl = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!baseUrl || !secret) throw providerUnavailable();

    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(subject)}`, {
        headers: { Authorization: `Bearer ${secret}`, apikey: secret },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
    } catch {
      throw providerUnavailable();
    }

    if (!response.ok) {
      if ([401, 403].includes(response.status)) throw new SupabaseAdminCredentialRejectedException(response.status);
      if (response.status === 404) throw new UnauthorizedException('Invalid or expired access token');
      if (response.status >= 500 || [408, 429].includes(response.status) || (response.status >= 300 && response.status < 400)) throw providerUnavailable(response.status);
      throw new UnauthorizedException('Invalid or expired access token');
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw providerUnavailable(response.status);
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw providerUnavailable(response.status);
    const user = raw as { id?: unknown; email?: unknown; email_confirmed_at?: unknown; is_anonymous?: boolean; deleted_at?: unknown; banned_until?: unknown };
    if (user.id !== subject || typeof user.email !== 'string' || user.is_anonymous || user.deleted_at || (typeof user.banned_until === 'string' && Date.parse(user.banned_until) > Date.now())) throw new UnauthorizedException('Invalid or expired access token');
    const date = typeof user.email_confirmed_at === 'string' ? Date.parse(user.email_confirmed_at) : NaN;
    const confirmed = Number.isFinite(date) && date <= Date.now();
    return { email: user.email.toLowerCase(), emailConfirmed: confirmed, emailConfirmedAt: confirmed ? new Date(date).toISOString() : null };
  }
}
