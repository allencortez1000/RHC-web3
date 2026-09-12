import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import type { SupabaseIdentity } from './supabase-jwt.service';

export type ApplicationUser = { id: string; email: string; supabase_user_id: string; account_status: string; verification_status: string };

@Injectable()
export class ApplicationUserService {
  constructor(private readonly prisma: PrismaService) {}

  async provision(identity: SupabaseIdentity): Promise<ApplicationUser> {
    const verification_status = identity.emailConfirmed ? 'VERIFIED' : 'UNVERIFIED';
    const account_status = identity.emailConfirmed ? 'ACTIVE' : 'PENDING';
    const user = await this.prisma.user.upsert({
      where: { supabase_user_id: identity.subject },
      update: {
        email: identity.email,
        verification_status,
        account_status,
        profile: { upsert: { create: { email: identity.email, verification_status, account_status }, update: { email: identity.email, verification_status, account_status } } },
      },
      create: {
        supabase_user_id: identity.subject,
        email: identity.email,
        verification_status,
        account_status,
        profile: { create: { email: identity.email, verification_status, account_status } },
      },
      select: { id: true, email: true, supabase_user_id: true, account_status: true, verification_status: true },
    });
    if (user.account_status === 'DISABLED' || user.account_status === 'LOCKED') throw new UnauthorizedException('Account is unavailable');
    return { ...user, supabase_user_id: user.supabase_user_id ?? identity.subject };
  }
}
