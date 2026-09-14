import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { requestContext } from '../../platform/request-context.middleware';

@Injectable()
export class RhcIdService {
  constructor(private readonly prisma: PrismaService) {}

  async issueForUser(userId: string): Promise<string> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const flag = await tx.featureFlag.findUnique({ where: { key: 'ENABLE_RHC_ID' }, select: { enabled: true } });
          if (!flag?.enabled) throw new ForbiddenException('RHC Digital ID issuance is disabled');
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
          const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { auth_email_confirmed_at: true, verification_status: true, account_status: true } });
          if (!user.auth_email_confirmed_at || user.auth_email_confirmed_at > new Date() || user.verification_status !== 'VERIFIED' || user.account_status !== 'ACTIVE') throw new ForbiddenException('Confirmed email, approved business verification, and an active account are required');
          const profile = await tx.userProfile.findUniqueOrThrow({ where: { user_id: userId }, select: { id: true, rhc_id: true } });
          if (profile.rhc_id) return profile.rhc_id;
          const year = new Date().getUTCFullYear();
          const sequence = await tx.rhcIdSequence.upsert({ where: { year }, update: { last_value: { increment: 1 } }, create: { year, last_value: 1 } });
          if (sequence.last_value > 99999999) throw new ServiceUnavailableException('Digital ID capacity exhausted');
          const rhc_id = `RHC-${year}-${String(sequence.last_value).padStart(8, '0')}`;
          await tx.userProfile.update({ where: { user_id: userId }, data: { rhc_id, rhc_id_issued_at: new Date() } });
          const context = requestContext.getStore();
          // Event and audit commit with issuance, exactly once; retries/readbacks do not duplicate them.
          await tx.activityEvent.create({ data: { event_type: 'RHC_ID.CREATED', actor_user_id: userId, entity_type: 'user_profile', entity_id: profile.id, payload: { rhc_id }, request_id: context?.request_id, correlation_id: context?.correlation_id } });
          await tx.auditLog.create({ data: { actor_user_id: userId, action: 'rhc_id.issue', entity_type: 'user_profile', entity_id: profile.id, after_data: { rhc_id }, ...context } });
          return rhc_id;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2034') throw error;
        if (attempt === 2) throw new ServiceUnavailableException('Digital ID issuance temporarily unavailable');
      }
    }
    throw new ServiceUnavailableException('Digital ID issuance temporarily unavailable');
  }
}
