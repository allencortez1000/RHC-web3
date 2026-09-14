import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import type { SupabaseIdentity } from './supabase-jwt.service';

export type ApplicationUser = { id: string; email: string; supabase_user_id: string; account_status: AccountStatus; verification_status: VerificationStatus };

@Injectable()
export class ApplicationUserService {
  constructor(private readonly prisma: PrismaService) {}

  async provision(identity: SupabaseIdentity): Promise<ApplicationUser> {
    const existing = await this.prisma.user.findUnique({
      where: { supabase_user_id: identity.subject },
      select: { id: true, email: true, supabase_user_id: true, account_status: true, verification_status: true },
    });

    if (existing) {
      // A valid Supabase session must never override RHC business controls.
      if (existing.account_status === AccountStatus.DISABLED || existing.account_status === AccountStatus.LOCKED) {
        throw new UnauthorizedException('Account is unavailable');
      }
      const verification_status = identity.emailConfirmed ? VerificationStatus.VERIFIED : existing.verification_status;
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          email: identity.email,
          verification_status,
          profile: { update: { email: identity.email, verification_status } },
        },
        select: { id: true, email: true, supabase_user_id: true, account_status: true, verification_status: true },
      });
      return this.asApplicationUser(user);
    }

    const verification_status = identity.emailConfirmed ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED;
    const account_status = identity.emailConfirmed ? AccountStatus.ACTIVE : AccountStatus.PENDING;
    const user = await this.prisma.user.create({
      data: {
        supabase_user_id: identity.subject,
        email: identity.email,
        verification_status,
        account_status,
        profile: { create: { email: identity.email, verification_status, account_status } },
      },
      select: { id: true, email: true, supabase_user_id: true, account_status: true, verification_status: true },
    });
    return this.asApplicationUser(user);
  }

  private asApplicationUser(user: { id: string; email: string; supabase_user_id: string | null; account_status: AccountStatus; verification_status: VerificationStatus }): ApplicationUser {
    if (!user.supabase_user_id) throw new UnauthorizedException('Application user is not linked to a Supabase identity');
    return { ...user, supabase_user_id: user.supabase_user_id };
  }
}
