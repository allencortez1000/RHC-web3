import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';

export type Grant = { company_id: string | null; project_id: string | null };
export type ResourceScope = { company_id?: string; project_id?: string };
export type RbacDbClient = Pick<Prisma.TransactionClient, 'userRole'>;
export type ListResource = 'company' | 'project' | 'property' | 'customer' | 'user' | 'customer_property' | 'integration' | 'service' | 'audit' | 'role';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async grants(userId: string, permission: string, dbClient: RbacDbClient = this.prisma): Promise<Grant[]> {
    const roles = await dbClient.userRole.findMany({
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

  async capabilities(userId: string) {
    const assignments = await this.prisma.userRole.findMany({
      where: {
        user_id: userId,
        user: { account_status: 'ACTIVE' },
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        role: { code: { not: 'CUSTOMER' } },
      },
      select: {
        company_id: true,
        project_id: true,
        expires_at: true,
        role: {
          select: {
            code: true,
            company_id: true,
            role_permissions: { select: { permission: { select: { code: true } } } },
          },
        },
        project: { select: { company_id: true } },
      },
    });
    const valid = assignments.filter((assignment) => {
      if (assignment.role.code === 'CUSTOMER') return false;
      const company = assignment.company_id ?? assignment.role.company_id ?? assignment.project?.company_id ?? null;
      if (assignment.expires_at && assignment.expires_at <= new Date()) return false;
      if (assignment.role.company_id && assignment.role.company_id !== company) return false;
      if (assignment.project_id && (!assignment.project || assignment.project.company_id !== company)) return false;
      return true;
    });
    return {
      is_admin: valid.length > 0,
      roles: [...new Set(valid.map((assignment) => assignment.role.code))].sort(),
      permissions: [
        ...new Set(
          valid.flatMap((assignment) =>
            assignment.role.role_permissions.map((grant) => grant.permission.code),
          ),
        ),
      ].sort(),
      company_ids: [
        ...new Set(
          valid
            .map(
              (assignment) =>
                assignment.company_id ?? assignment.role.company_id ?? assignment.project?.company_id,
            )
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
      project_ids: [
        ...new Set(valid.map((assignment) => assignment.project_id).filter((value): value is string => Boolean(value))),
      ].sort(),
    };
  }

  async hasPermission(userId: string, permission: string, companyId?: string, projectId?: string, dbClient: RbacDbClient = this.prisma): Promise<boolean> {
    return (await this.grants(userId, permission, dbClient)).some((g) => (!g.company_id || g.company_id === companyId) && (!g.project_id || g.project_id === projectId));
  }

  async require(userId: string, permission: string, scope: ResourceScope = {}, dbClient: RbacDbClient = this.prisma) {
    if (!await this.hasPermission(userId, permission, scope.company_id, scope.project_id, dbClient)) throw new ForbiddenException('Insufficient permission for this resource');
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
