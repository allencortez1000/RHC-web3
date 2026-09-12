import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export type SupabaseIdentity = {
  subject: string;
  email: string;
  emailConfirmed: boolean;
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
      });
      return this.toIdentity(payload);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private toIdentity(payload: JWTPayload): SupabaseIdentity {
    if (!payload.sub || typeof payload.email !== 'string') throw new UnauthorizedException('Token is missing required identity claims');
    return {
      subject: payload.sub,
      email: payload.email.toLowerCase(),
      emailConfirmed: typeof payload.email_confirmed_at === 'string',
    };
  }
}
