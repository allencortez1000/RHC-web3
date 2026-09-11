import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { EventsService } from '../events/events.service';
import { mockProfile } from '../../platform/mock-data';
@Injectable()
export class RhcIdService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService) {}
  async issueForUser(userId: string): Promise<string> {
    if (this.prisma.mockMode) return mockProfile.rhc_id!;
    const existing = await this.prisma.userProfile.findUnique({ where: { user_id: userId } });
    if (existing?.rhc_id) return existing.rhc_id;
    const year = new Date().getUTCFullYear();
    const profile = await this.prisma.$transaction(async (tx) => {
      const seq = await tx.rhcIdSequence.upsert({ where: { year }, update: { last_value: { increment: 1 } }, create: { year, last_value: 1 } });
      const rhcId = `RHC-${year}-${String(seq.last_value).padStart(8, '0')}`;
      return tx.userProfile.upsert({
        where: { user_id: userId },
        update: { rhc_id: rhcId, rhc_id_issued_at: new Date(), verification_status: 'VERIFIED', account_status: 'ACTIVE' },
        create: { user_id: userId, email: '', rhc_id: rhcId, rhc_id_issued_at: new Date(), verification_status: 'VERIFIED', account_status: 'ACTIVE' },
      });
    });
    await this.events.publish('RHC_ID.CREATED', { rhc_id: profile.rhc_id }, { actor_user_id: userId, entity_type: 'user_profile', entity_id: profile.id });
    return profile.rhc_id!;
  }
}
