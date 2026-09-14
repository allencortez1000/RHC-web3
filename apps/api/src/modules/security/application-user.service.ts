import { ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, Prisma, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { requestContext } from '../../platform/request-context.middleware';
import type { SupabaseIdentity } from './supabase-jwt.service';

const userSelect = { id: true, email: true, supabase_user_id: true, account_status: true, verification_status: true, auth_email_confirmed_at: true } satisfies Prisma.UserSelect;
export type ApplicationUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class ApplicationUserService {
  constructor(private readonly prisma: PrismaService) {}

  async provision(identity: SupabaseIdentity): Promise<ApplicationUser> {
    const confirmedAt = identity.emailConfirmedAt ? new Date(identity.emailConfirmedAt) : null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // Also serialize first access, when no application row exists to lock.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity.subject}, 0))`;
          await tx.$queryRaw`SELECT id FROM users WHERE supabase_user_id = ${identity.subject} FOR UPDATE`;
          const existing = await tx.user.findUnique({ where: { supabase_user_id: identity.subject }, select: userSelect });
          if (existing) {
            if (existing.account_status === AccountStatus.DISABLED || existing.account_status === AccountStatus.LOCKED) throw new UnauthorizedException('Account is unavailable');
            // Authentication confirmation never changes compliance or account state.
            return tx.user.update({
              where: { id: existing.id },
              data: { email: identity.email, auth_email_confirmed_at: confirmedAt, profile: { upsert: {
                create: { email: identity.email, account_status: existing.account_status, verification_status: existing.verification_status },
                update: { email: identity.email },
              } } }, select: userSelect,
            });
          }
          const registration = await tx.featureFlag.findUnique({ where: { key: 'ENABLE_REGISTRATION' }, select: { enabled: true } });
          if (!registration?.enabled) throw new ForbiddenException('Application registration is disabled');
          const account_status = confirmedAt ? AccountStatus.ACTIVE : AccountStatus.PENDING;
          const user = await tx.user.create({ data: {
            supabase_user_id: identity.subject, email: identity.email, auth_email_confirmed_at: confirmedAt,
            account_status, verification_status: VerificationStatus.PENDING,
            profile: { create: { email: identity.email, account_status, verification_status: VerificationStatus.PENDING } },
          }, select: userSelect });
          const context = requestContext.getStore();
          await tx.activityEvent.create({ data: { event_type: 'USER.CREATED', actor_user_id: user.id, entity_type: 'user', entity_id: user.id, payload: {}, request_id: context?.request_id, correlation_id: context?.correlation_id } });
          await tx.auditLog.create({ data: { action: 'user.provision', actor_user_id: user.id, entity_type: 'user', entity_id: user.id, ...context } });
          return user;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002' || code === 'P2034') {
          if (attempt < 2) continue;
          if (code === 'P2002') throw new ConflictException('Identity linking requires administrator review');
          throw new ServiceUnavailableException('Identity synchronization temporarily unavailable');
        }
        throw error;
      }
    }
    throw new ServiceUnavailableException('Identity synchronization temporarily unavailable');
  }
}
