import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { mockNow } from '../../platform/mock-data';
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}
  async publish(event_type: string, payload: object, context: { actor_user_id?: string; company_id?: string; project_id?: string; entity_type?: string; entity_id?: string; request_id?: string; correlation_id?: string } = {}) {
    if (this.prisma.mockMode) return { id: `mock-event-${Date.now()}`, event_type, payload, status: 'PROCESSED', created_at: mockNow, ...context };
    return this.prisma.activityEvent.create({ data: { event_type, payload, ...context } });
  }
}
