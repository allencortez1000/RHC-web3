import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { z } from 'zod';
import { PrismaService } from '../../platform/prisma.service';
import { requestContext } from '../../platform/request-context.middleware';
import { AuditService } from './audit.service';
import { EventsService } from '../events/events.service';
import type { CompanyPrincipal } from './company-api-key.service';

const rhcId = z.string().regex(/^RHC-\d{4}-\d{8}$/);
export const identityVerificationBody = z.object({ rhc_id: rhcId }).strict();
export const integrationEventBody = z.object({
  event_type: z.enum(['SERVICE.REQUESTED', 'SERVICE.COMPLETED', 'SERVICE.CANCELLED']),
  source_reference: z.string().uuid(),
  occurred_at: z.string().datetime({ offset: true }).refine((value) => new Date(value).getTime() <= Date.now() + 300000, 'Event timestamp is in the future'),
  rhc_id: rhcId.optional(),
}).strict();
export const integrationIdempotencyKey = z.string().uuid();
const responseSchema = z.union([z.object({ verified: z.boolean() }).strict(), z.object({ accepted: z.literal(true), event_id: z.string() }).strict()]);
type IntegrationResponse = z.infer<typeof responseSchema>;
const receiptSchema = z.object({ fingerprint: z.string(), response: responseSchema });

@Injectable()
export class InternalIntegrationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly events: EventsService) {}

  async verifyIdentity(principal: CompanyPrincipal, key: string, body: z.infer<typeof identityVerificationBody>) {
    return this.once(principal, key, 'IDENTITY.VERIFY', body, async (tx, previous) => {
      const subject = await this.consentedIdentity(tx, principal.company_id, body.rhc_id);
      // A cached positive result must never outlive account disablement or consent withdrawal.
      if (previous) {
        if (!('verified' in previous)) throw new ConflictException();
        return { verified: previous.verified && subject !== null };
      }
      return { verified: subject !== null };
    });
  }

  async receiveEvent(principal: CompanyPrincipal, key: string, body: z.infer<typeof integrationEventBody>) {
    return this.once(principal, key, 'EVENTS.RECEIVE', body, async (tx, previous) => {
      const allowed = await tx.companyEvent.findUnique({ where: { company_id_event_type: { company_id: principal.company_id, event_type: body.event_type } }, select: { enabled: true } });
      if (!allowed?.enabled) throw new ForbiddenException('Event is not allowed');
      const subject = body.rhc_id ? await this.consentedIdentity(tx, principal.company_id, body.rhc_id, true) : null;
      if (body.rhc_id && !subject) throw new ForbiddenException('Event is not allowed');
      if (previous) {
        if (!('accepted' in previous)) throw new ConflictException();
        return previous;
      }
      // External service reports are not trusted business transitions or ledger commands.
      const event = await this.events.publish(`INTEGRATION.${body.event_type}`, { source_reference: body.source_reference, occurred_at: body.occurred_at, client_id: principal.client_id }, {
        company_id: principal.company_id,
        ...(subject ? { entity_type: 'user', entity_id: subject } : { entity_type: 'company', entity_id: principal.company_id }),
      }, tx);
      return { accepted: true, event_id: event.id };
    });
  }

  private async consentedIdentity(tx: Prisma.TransactionClient, companyId: string, rhcId: string, service = false): Promise<string | null> {
    // This separate auth field is main-owned; never substitute business verification_status.
    const authSelect = { auth_email_confirmed_at: true } as const;
    const profile = await tx.userProfile.findUnique({ where: { rhc_id: rhcId }, select: { rhc_id_issued_at: true, user: { select: { id: true, account_status: true, ...authSelect } } } });
    const user = profile?.user as { id: string; account_status: string; auth_email_confirmed_at?: Date | null } | undefined;
    if (!profile?.rhc_id_issued_at || !user || user.account_status !== 'ACTIVE' || !user.auth_email_confirmed_at) return null;
    if (!await this.hasConsent(tx, user.id, companyId, 'DATA_SHARING')) return null;
    if (service && !await this.hasConsent(tx, user.id, companyId, 'COMPANY_SERVICE')) return null;
    return user.id;
  }

  private async hasConsent(tx: Prisma.TransactionClient, userId: string, companyId: string, type: 'DATA_SHARING' | 'COMPANY_SERVICE') {
    // Do not filter to granted records before choosing the latest decision: withdrawals win.
    const records = await tx.consentRecord.findMany({ where: { user_id: userId, company_id: companyId, consent_type: type }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 2, select: { granted: true, granted_at: true, withdrawn_at: true, created_at: true } });
    const latest = records[0];
    if (!latest || (records[1] && records[1].created_at.getTime() === latest.created_at.getTime())) return false;
    const now = new Date();
    return latest.granted && !!latest.granted_at && latest.granted_at <= now && latest.created_at <= now && latest.withdrawn_at === null;
  }

  private async once(principal: CompanyPrincipal, key: string, operation: string, body: unknown, work: (tx: Prisma.TransactionClient, previous?: IntegrationResponse) => Promise<IntegrationResponse>) {
    const reference = createHash('sha256').update(JSON.stringify([principal.company_id, principal.client_id, operation, key])).digest('hex');
    // The random idempotency key salts the fingerprint; logs need no raw identity or body.
    const fingerprint = createHash('sha256').update(JSON.stringify([operation, key, body])).digest('hex');
    const lockId = Buffer.from(reference, 'hex').readBigInt64BE();
    return this.prisma.$transaction(async (tx) => {
      // request_ref has no unique index. Every writer here holds this transaction lock;
      // READ COMMITTED sees the preceding committed receipt after a concurrent waiter wakes.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;
      const existing = await tx.integrationLog.findMany({ where: { company_id: principal.company_id, direction: 'INBOUND', request_ref: reference }, take: 2, select: { metadata: true, status: true } });
      if (existing.length > 1) throw new ConflictException('Ambiguous idempotency receipt');
      const receipt = existing.length ? receiptSchema.safeParse(existing[0].metadata) : undefined;
      if (receipt && (!receipt.success || receipt.data.fingerprint !== fingerprint || existing[0].status !== 'PROCESSED')) throw new ConflictException('Idempotency key conflict');
      const response = await work(tx, receipt?.success ? receipt.data.response : undefined);
      if (receipt) return response;
      const context = requestContext.getStore();
      const log = await tx.integrationLog.create({ data: { company_id: principal.company_id, direction: 'INBOUND', event_type: operation, status: 'PROCESSED', request_ref: reference, metadata: { client_id: principal.client_id, fingerprint, response, ...(context ? { request_id: context.request_id, correlation_id: context.correlation_id } : {}) } } });
      await this.audit.record({ company_id: principal.company_id, action: operation === 'IDENTITY.VERIFY' ? 'integration.identity.verify' : 'integration.event.receive', entity_type: 'integration_log', entity_id: log.id, after_data: { client_id: principal.client_id, ...response } }, tx);
      return response;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 2000, timeout: 5000 });
  }
}
