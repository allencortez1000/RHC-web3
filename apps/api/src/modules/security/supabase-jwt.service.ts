import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export type SupabaseIdentity = {
  subject: string;
  email: string;
  emailConfirmed: boolean;
  emailConfirmedAt?: string | null;
};

@Injectable()
export class SupabaseJwtService {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  private getJwks() {
    const url = process.env.SUPABASE_JWKS_URL;
    if (!url) throw new UnauthorizedException('Authentication is not configured');
    this.jwks ??= createRemoteJWKSet(new URL(url));
    return this.jwks;
  }

  async verify(token: string): Promise<SupabaseIdentity> {
    try {
      const issuer = process.env.JWT_ISSUER;
      if (!issuer) throw new Error('JWT issuer is not configured');
      const { payload } = await jwtVerify(token, this.getJwks(), {
        issuer,
        audience: process.env.JWT_AUDIENCE ?? 'authenticated',
        algorithms: ['ES256', 'RS256'],
        requiredClaims: ['sub', 'exp', 'iat'],
      });
      const identity = this.toIdentity(payload);
      const confirmed = await this.confirmedIdentity(identity.subject);
      return { subject: identity.subject, ...confirmed };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
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
    if (!baseUrl || !secret) throw new UnauthorizedException('Account verification is not configured');
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(subject)}`, {
        headers: { Authorization: `Bearer ${secret}`, apikey: secret },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Supabase Auth lookup failed');
      const user = await response.json() as { id?: unknown; email?: unknown; email_confirmed_at?: unknown; is_anonymous?: boolean; deleted_at?: unknown; banned_until?: string };
      if (user.id !== subject || typeof user.email !== 'string' || user.is_anonymous || user.deleted_at || (user.banned_until && Date.parse(user.banned_until) > Date.now())) throw new Error('Invalid identity');
      const date = typeof user.email_confirmed_at === 'string' ? Date.parse(user.email_confirmed_at) : NaN;
      const confirmed = Number.isFinite(date) && date <= Date.now();
      return { email: user.email.toLowerCase(), emailConfirmed: confirmed, emailConfirmedAt: confirmed ? new Date(date).toISOString() : null };
    } catch {
      // Failing closed prevents an unavailable identity provider from issuing
      // verified RHC identities or Digital IDs.
      throw new UnauthorizedException('Account verification is unavailable');
    }
  }
}
