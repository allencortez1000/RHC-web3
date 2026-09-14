import { Body, Controller, ForbiddenException, Get, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../platform/prisma.service';
import { uuid } from '../../platform/dto';
import { AuthGuard } from '../security/auth.guard';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';
import { AuditService } from '../security/audit.service';
import { EventsService } from '../events/events.service';
import { RateLimit } from '../security/rate-limit.guard';

const consentType = z.enum(['PRIVACY_POLICY', 'TERMS', 'MARKETING', 'DATA_SHARING', 'COMPANY_SERVICE']);
export const consentPolicies = [
  { consent_type: 'PRIVACY_POLICY', purpose: 'ACCOUNT_PRIVACY', description: 'Processing personal data to operate your RHC account under the privacy policy.', required: true, company_required: false },
  { consent_type: 'TERMS', purpose: 'ACCOUNT_TERMS', description: 'Acceptance of the terms governing your RHC account.', required: true, company_required: false },
  { consent_type: 'MARKETING', purpose: 'MARKETING_COMMUNICATIONS', description: 'Receiving optional marketing communications from RHC.', required: false, company_required: false },
  { consent_type: 'DATA_SHARING', purpose: 'COMPANY_DATA_SHARING', description: 'Sharing your RHC identity with the selected company.', required: false, company_required: true },
  { consent_type: 'COMPANY_SERVICE', purpose: 'COMPANY_SERVICE_DELIVERY', description: 'Allowing the selected company to report services associated with your RHC identity.', required: false, company_required: true },
] as const;
const decision = z.object({
  consent_type: consentType,
  purpose: z.enum(['ACCOUNT_PRIVACY', 'ACCOUNT_TERMS', 'MARKETING_COMMUNICATIONS', 'COMPANY_DATA_SHARING', 'COMPANY_SERVICE_DELIVERY']),
  consent_version: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/),
  company_id: uuid.nullable().optional(),
  granted: z.boolean(),
}).strict().superRefine((value, context) => {
  const policy = consentPolicies.find((item) => item.consent_type === value.consent_type)!;
  if (value.purpose !== policy.purpose) context.addIssue({ code: 'custom', path: ['purpose'], message: 'Purpose does not match consent type' });
  if (policy.company_required !== Boolean(value.company_id)) context.addIssue({ code: 'custom', path: ['company_id'], message: policy.company_required ? 'A company is required' : 'Account consent cannot be company scoped' });
});
const historyQuery = z.object({
  take: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).max(100000).default(0),
  company_id: uuid.optional(),
  consent_type: consentType.optional(),
}).strict();
const recordSelect = { id: true, consent_type: true, company_id: true, consent_version: true, granted: true, granted_at: true, withdrawn_at: true, created_at: true, metadata: true, company: { select: { id: true, display_name: true, status: true } } } satisfies Prisma.ConsentRecordSelect;
function publicRecord(record: Prisma.ConsentRecordGetPayload<{ select: typeof recordSelect }>) {
  const { metadata, ...fields } = record;
  const purpose = metadata && typeof metadata === 'object' && !Array.isArray(metadata) && typeof metadata.purpose === 'string' ? metadata.purpose : null;
  return { ...fields, purpose };
}

@Controller('me/consents')
@UseGuards(AuthGuard)
export class ConsentController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly events: EventsService) {}

  @Get()
  async history(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const { take, skip, ...filters } = historyQuery.parse(query);
    const records = await this.prisma.consentRecord.findMany({ where: { user_id: user.id, ...filters }, select: recordSelect, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take, skip });
    return { policies: consentPolicies, records: records.map(publicRecord) };
  }

  @Post() @RateLimit(20)
  async append(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = decision.parse(body);
    return this.prisma.$transaction(async (tx) => {
      // Serialize self-service decisions without rewriting any historical evidence.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`consent:${user.id}`}, 0))`;
      if (input.company_id) {
        const company = await tx.company.findUnique({ where: { id: input.company_id }, select: { status: true } });
        if (!company) throw new NotFoundException('Company not found');
        // Withdrawal must remain possible after a company is suspended or made inactive.
        if (input.granted && company.status !== 'ACTIVE') throw new ForbiddenException('Company is not active');
      }
      const now = new Date();
      const record = await tx.consentRecord.create({ data: {
        user_id: user.id, consent_type: input.consent_type, company_id: input.company_id ?? null,
        consent_version: input.consent_version, granted: input.granted,
        granted_at: input.granted ? now : null, withdrawn_at: input.granted ? null : now,
        created_at: now, metadata: { purpose: input.purpose },
      }, select: recordSelect });
      const context = { actor_user_id: user.id, company_id: input.company_id ?? undefined, entity_type: 'consent_record', entity_id: record.id };
      const evidence = { consent_type: input.consent_type, purpose: input.purpose, consent_version: input.consent_version, granted: input.granted, granted_at: record.granted_at, withdrawn_at: record.withdrawn_at };
      await this.audit.record({ ...context, action: input.granted ? 'consent.grant' : 'consent.withdraw', after_data: evidence }, tx);
      await this.events.publish(input.granted ? 'CONSENT.GRANTED' : 'CONSENT.WITHDRAWN', evidence, context, tx);
      return publicRecord(record);
    });
  }
}
