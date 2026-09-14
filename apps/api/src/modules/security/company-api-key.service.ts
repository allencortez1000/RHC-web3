import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../platform/prisma.service';
import { AuditService } from './audit.service';
import { FeatureService } from './feature.guard';
import { RbacService } from './rbac.service';
import { apiScope } from '../../platform/dto';
import type { z } from 'zod';

// Company directory metadata is public; other reads require their domain grant.
// Events remain company-bound and subject to the internal event allowlist/consent checks.
const scopePermissions: Record<z.infer<typeof apiScope>, string> = {
  'company.read': 'integration.manage',
  'projects.read': 'project.view',
  'properties.read': 'property.view',
  'identity.verify': 'customer.view',
  'events.write': 'integration.manage',
};

export const apiClientSelect = { id: true, company_id: true, client_name: true, client_id: true, scopes: true, status: true, last_used_at: true, created_at: true, updated_at: true } as const;
export type CompanyPrincipal = { client_id: string; company_id: string; scopes: string[] };
export function hashCompanyKey(key: string) { return `sha256:v1:${createHash('sha256').update(key).digest('hex')}`; }
function newKey(clientId: string) { return `rhc_${clientId}.${randomBytes(32).toString('base64url')}`; }

@Injectable()
export class CompanyApiKeyService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly features: FeatureService, private readonly rbac: RbacService) {}

    private async requireDelegation(actor: string, company_id: string, scopes: string[]) {
      await this.rbac.require(actor, 'integration.manage', { company_id });
      if (!scopes.length) throw new ForbiddenException('API scopes are required');
      for (const scope of scopes) {
        const parsed = apiScope.safeParse(scope);
        if (!parsed.success) throw new ForbiddenException('Unsupported API scope');
        // A machine key covers a whole company, so project-only rights cannot delegate it.
        await this.rbac.require(actor, scopePermissions[parsed.data], { company_id });
      }
    }

  async issue(data: { company_id: string; client_name: string; scopes: string[] }, actor: string) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize with role/status governance before checking the actor's current grants.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(734821906)`;
      await this.requireDelegation(actor, data.company_id, data.scopes);
      const company = await tx.company.findUniqueOrThrow({ where: { id: data.company_id }, select: { status: true, api_enabled: true } });
      if (company.status !== 'ACTIVE' || !company.api_enabled) throw new ForbiddenException('Company API is disabled');
      const client_id = randomUUID();
      const api_key = newKey(client_id);
      const client = await tx.companyApiClient.create({ data: { ...data, client_id, credential_ref: hashCompanyKey(api_key) }, select: apiClientSelect });
      await this.audit.record({ actor_user_id: actor, company_id: client.company_id, action: 'company_api_key.issue', entity_type: 'company_api_client', entity_id: client.id, after_data: client }, tx);
      return { client, api_key };
    });
  }

  async rotate(id: string, actor: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(734821906)`;
      await tx.$queryRaw`SELECT id FROM company_api_clients WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.companyApiClient.findUniqueOrThrow({ where: { id }, select: { ...apiClientSelect, company: { select: { status: true, api_enabled: true } } } });
      if (before.status !== 'ACTIVE' || before.company.status !== 'ACTIVE' || !before.company.api_enabled) throw new ForbiddenException('Company API is disabled');
      await this.requireDelegation(actor, before.company_id, before.scopes);
      const api_key = newKey(before.client_id);
      const client = await tx.companyApiClient.update({ where: { id }, data: { credential_ref: hashCompanyKey(api_key) }, select: apiClientSelect });
      await this.audit.record({ actor_user_id: actor, company_id: client.company_id, action: 'company_api_key.rotate', entity_type: 'company_api_client', entity_id: id }, tx);
      return { client, api_key };
    });
  }

  async revoke(id: string, actor: string) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.companyApiClient.update({ where: { id }, data: { status: 'INACTIVE', credential_ref: null }, select: apiClientSelect });
      await this.audit.record({ actor_user_id: actor, company_id: client.company_id, action: 'company_api_key.revoke', entity_type: 'company_api_client', entity_id: id }, tx);
      return client;
    });
  }

  async authenticate(key: unknown, requiredScope: string): Promise<CompanyPrincipal> {
    if (typeof key !== 'string' || key.length > 128) throw new UnauthorizedException();
    const match = /^rhc_([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/.exec(key);
    if (!match) throw new UnauthorizedException();
    const client = await this.prisma.companyApiClient.findUnique({ where: { client_id: match[1] }, include: { company: { select: { status: true, api_enabled: true } } } });
    const stored = client?.credential_ref;
    const actual = Buffer.from(hashCompanyKey(key));
    const expected = Buffer.from(stored && /^sha256:v1:[0-9a-f]{64}$/.test(stored) ? stored : `sha256:v1:${'0'.repeat(64)}`);
    const valid = timingSafeEqual(actual, expected);
    if (!valid || !client || client.status !== 'ACTIVE' || client.company.status !== 'ACTIVE' || !client.company.api_enabled) throw new UnauthorizedException();
    if (!client.scopes.includes(requiredScope)) throw new ForbiddenException('Insufficient API scope');
    await this.features.require('ENABLE_INTEGRATION_FRAMEWORK');
    await this.prisma.companyApiClient.update({ where: { id: client.id }, data: { last_used_at: new Date() } });
    return { client_id: client.client_id, company_id: client.company_id, scopes: client.scopes };
  }
}
