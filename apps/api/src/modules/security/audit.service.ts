import { Injectable } from '@nestjs/common';
import { redactSensitive } from '@rhc/shared';
import { PrismaService } from '../../platform/prisma.service';
import { mockNow } from '../../platform/mock-data';
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  async record(input: { actor_user_id?: string; actor_role?: string; company_id?: string; project_id?: string; action: string; entity_type: string; entity_id?: string; before_data?: unknown; after_data?: unknown; request_id?: string; correlation_id?: string; ip_address?: string; user_agent?: string }) {
    const data = { ...input, before_data: input.before_data === undefined ? undefined : (redactSensitive(input.before_data) as object), after_data: input.after_data === undefined ? undefined : (redactSensitive(input.after_data) as object) };
    if (this.prisma.mockMode) return { id: `mock-audit-${Date.now()}`, ...data, created_at: mockNow };
    return this.prisma.auditLog.create({ data });
  }
}
