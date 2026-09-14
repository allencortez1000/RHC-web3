import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';

export type Grant = { company_id: string | null; project_id: string | null };
export type ResourceScope = { company_id?: string; project_id?: string };
export type ListResource = 'company' | 'project' | 'property' | 'customer' | 'user' | 'customer_property' | 'integration' | 'service' | 'audit' | 'role';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async grants(userId: string, permission: string): Promise<Grant[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { user_id: userId, user: { account_status: 'ACTIVE' }, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }], role: { code: { not: 'CUSTOMER' }, role_permissions: { some: { permission: { code: permission } } } } },
      select: { company_id: true, project_id: true, expires_at: true, role: { select: { company_id: true, code: true } }, project: { select: { company_id: true } } },
    });
    return roles.flatMap((grant) => {
      // Customer self-service is authorized by ownership in /me, never seeded admin permissions.
      if (grant.role.code === 'CUSTOMER') return [];
      // A tenant-owned role can never become a global grant through a null assignment.
      const company = grant.company_id ?? grant.role.company_id ?? grant.project?.company_id ?? null;
      if (grant.expires_at && grant.expires_at <= new Date()) return [];
      if (grant.role.company_id && grant.role.company_id !== company) return [];
      if (grant.project_id && (!grant.project || grant.project.company_id !== company)) return [];
      return [{ company_id: company, project_id: grant.project_id }];
    });
  }

  async hasPermission(userId: string, permission: string, companyId?: string, projectId?: string): Promise<boolean> {
    return (await this.grants(userId, permission)).some((g) => (!g.company_id || g.company_id === companyId) && (!g.project_id || g.project_id === projectId));
  }

  async require(userId: string, permission: string, scope: ResourceScope = {}) {
    if (!await this.hasPermission(userId, permission, scope.company_id, scope.project_id)) throw new ForbiddenException('Insufficient permission for this resource');
  }

  companyWhere(grants: Grant[]): Prisma.CompanyWhereInput {
    if (grants.some((g) => !g.company_id && !g.project_id)) return {};
    return { OR: grants.filter((g) => !g.project_id).map((g) => g.company_id ? { id: g.company_id } : {}) };
  }

  projectWhere(grants: Grant[]): Prisma.ProjectWhereInput {
    if (grants.some((g) => !g.company_id && !g.project_id)) return {};
    return { OR: grants.map((g) => ({ ...(g.company_id ? { company_id: g.company_id } : {}), ...(g.project_id ? { id: g.project_id } : {}) })) };
  }

  propertyWhere(grants: Grant[]): Prisma.PropertyWhereInput { return { project: this.projectWhere(grants) }; }

  customerPropertyWhere(grants: Grant[]): Prisma.CustomerPropertyWhereInput { return { property: this.propertyWhere(grants) }; }

  userWhere(grants: Grant[], customersOnly = false): Prisma.UserWhereInput {
    if (grants.some((g) => !g.company_id && !g.project_id)) return {};
    const customer = { customer_properties: { some: { ...this.customerPropertyWhere(grants), status: 'ACTIVE' as const, effective_from: { lte: new Date() }, OR: [{ effective_to: null }, { effective_to: { gt: new Date() } }] } } };
    if (customersOnly) return customer;
    return { OR: [customer, { roles: { some: { OR: grants.map((g) => ({ company_id: g.company_id, ...(g.project_id ? { project_id: g.project_id } : {}) })), AND: [{ OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] }] } } }] };
  }

  tenantWhere(grants: Grant[]): Prisma.CompanyIntegrationWhereInput {
    return { company: this.companyWhere(grants) };
  }

  auditWhere(grants: Grant[]): Prisma.AuditLogWhereInput {
    if (grants.some((g) => !g.company_id && !g.project_id)) return {};
    return { OR: grants.map((g) => ({ ...(g.company_id ? { company_id: g.company_id } : {}), ...(g.project_id ? { project_id: g.project_id } : {}) })) };
  }
}
