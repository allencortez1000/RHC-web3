import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { requestContext } from '../../platform/request-context.middleware';
import { safeData } from '../../platform/safe-data';

export type AuditInput = { actor_user_id?: string; actor_role?: string; company_id?: string; project_id?: string; action: string; entity_type: string; entity_id?: string; before_data?: unknown; after_data?: unknown; request_id?: string; correlation_id?: string; ip_address?: string; user_agent?: string };
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  async record(input: AuditInput, client: Pick<Prisma.TransactionClient, 'auditLog'> = this.prisma) {
    const data = { ...input, ...requestContext.getStore(), before_data: input.before_data === undefined ? undefined : safeData(input.before_data) ?? Prisma.JsonNull, after_data: input.after_data === undefined ? undefined : safeData(input.after_data) ?? Prisma.JsonNull };
    return client.auditLog.create({ data });
  }
}
