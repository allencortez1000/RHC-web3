import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { requestContext } from '../../platform/request-context.middleware';
import { safeData } from '../../platform/safe-data';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}
  async publish(event_type: string, payload: object, context: { actor_user_id?: string; company_id?: string; project_id?: string; entity_type?: string; entity_id?: string; request_id?: string; correlation_id?: string } = {}, client: Pick<Prisma.TransactionClient, 'activityEvent'> = this.prisma) {
    const request = requestContext.getStore();
    return client.activityEvent.create({ data: { event_type, payload: safeData(payload) ?? Prisma.JsonNull, ...context, ...(request ? { request_id: request.request_id, correlation_id: request.correlation_id } : {}) } });
  }
}
