import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { EventsService } from '../events/events.service';
import { mockProfile } from '../../platform/mock-data';

@Injectable()
export class RhcIdService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService) {}

  async issueForUser(userId: string): Promise<string> {
    if (this.prisma.mockMode) return mockProfile.rhc_id!;
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: 'ENABLE_RHC_ID' }, select: { enabled: true } });
    if (flag && !flag.enabled) throw new ForbiddenException('RHC Digital ID issuance is disabled');

    let profile: { id: string; rhc_id: string | null } | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        profile = await this.prisma.$transaction(async (tx) => {
          // Serializes issuances for this identity so concurrent requests return one ID.
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
          const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, verification_status: true, account_status: true } });
          if (user.verification_status !== VerificationStatus.VERIFIED || user.account_status !== 'ACTIVE') {
            throw new ForbiddenException('A confirmed and active account is required before issuing an RHC Digital ID');
          }
          const existing = await tx.userProfile.findUniqueOrThrow({ where: { user_id: userId }, select: { id: true, rhc_id: true } });
          if (existing.rhc_id) return existing;
          const year = new Date().getUTCFullYear();
          const sequence = await tx.rhcIdSequence.upsert({
            where: { year }, update: { last_value: { increment: 1 } }, create: { year, last_value: 1 },
          });
          const rhc_id = `RHC-${year}-${String(sequence.last_value).padStart(8, '0')}`;
          return tx.userProfile.update({ where: { user_id: userId }, data: { rhc_id, rhc_id_issued_at: new Date() }, select: { id: true, rhc_id: true } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        break;
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2034' || attempt === 2) throw error;
      }
    }
    if (!profile?.rhc_id) throw new ServiceUnavailableException('Could not issue RHC Digital ID');
    await this.events.publish('RHC_ID.CREATED', { rhc_id: profile.rhc_id }, { actor_user_id: userId, entity_type: 'user_profile', entity_id: profile.id });
    return profile.rhc_id;
  }
}
