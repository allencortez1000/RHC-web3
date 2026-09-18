import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { z } from 'zod';
import { Authorization, PermissionPolicy, REQUIRED_PERMISSION } from './permission.decorator';
import { RbacService, ResourceScope } from './rbac.service';
import { PrismaService } from '../../platform/prisma.service';

type ReservationDelegates = { reservation: any };
const reservationDb = <T extends object>(client: T) => client as T & ReservationDelegates;

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly rbac: RbacService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<PermissionPolicy>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]);
    if (!policy) throw new ForbiddenException('No authorization policy configured');
    const req = context.switchToHttp().getRequest<{ user?: { id: string }; body?: Record<string, unknown>; params: Record<string, string>; authorization?: Authorization }>();
    if (!req.user) throw new ForbiddenException('Authentication required');
    if (policy.list) {
      let grants = await this.rbac.grants(req.user.id, policy.permission);
      if (['company', 'integration', 'service', 'role'].includes(policy.list)) grants = grants.filter((g) => !g.project_id);
      if (!grants.length) throw new ForbiddenException('Insufficient permission');
      req.authorization = { grants, scope: {} };
      return true;
    }

    let scope: ResourceScope = {};
    const target = policy.target ?? 'global';
    if (target === 'company' || target === 'body-company') {
      const id = z.string().uuid().parse(target === 'company' ? req.params.id : req.body?.company_id);
      const company = await this.prisma.company.findUnique({ where: { id }, select: { id: true } });
      if (!company) throw new NotFoundException('Resource not found');
      scope = { company_id: company.id };
    } else if (target === 'body-project' || target === 'project') {
      const id = z.string().uuid().parse(target === 'project' ? req.params.id : req.body?.project_id);
      const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true, company_id: true } });
      if (!project) throw new NotFoundException('Resource not found');
      scope = { company_id: project.company_id, project_id: project.id };
    } else if (target === 'property' || target === 'body-property') {
      const id = z.string().uuid().parse(target === 'property' ? req.params.id : req.body?.property_id);
      const property = await this.prisma.property.findUnique({ where: { id }, select: { project_id: true, project: { select: { company_id: true } } } });
      if (!property) throw new NotFoundException('Resource not found');
      scope = { company_id: property.project.company_id, project_id: property.project_id };
    } else if (target === 'relationship') {
      const id = z.string().uuid().parse(req.params.id);
      const relationship = await this.prisma.customerProperty.findUnique({ where: { id }, select: { property: { select: { project_id: true, project: { select: { company_id: true } } } } } });
      if (!relationship) throw new NotFoundException('Resource not found');
      scope = { company_id: relationship.property.project.company_id, project_id: relationship.property.project_id };
    } else if (target === 'reservation') {
      const id = z.string().uuid().parse(req.params.id);
      const reservation = await reservationDb(this.prisma).reservation.findUnique({ where: { id }, select: { property: { select: { project_id: true, project: { select: { company_id: true } } } } } });
      if (!reservation) throw new NotFoundException('Resource not found');
      scope = { company_id: reservation.property.project.company_id, project_id: reservation.property.project_id };
    } else if (target === 'integration' || target === 'service') {
      const id = z.string().uuid().parse(req.params.id);
      const resource = target === 'integration'
        ? await this.prisma.companyIntegration.findUnique({ where: { id }, select: { company_id: true } })
        : await this.prisma.businessService.findUnique({ where: { id }, select: { company_id: true } });
      if (!resource) throw new NotFoundException('Resource not found');
      scope = { company_id: resource.company_id };
    } else if (target === 'api-client') {
      const id = z.string().uuid().parse(req.params.id);
      const client = await this.prisma.companyApiClient.findUnique({ where: { id }, select: { company_id: true } });
      if (!client) throw new NotFoundException('Resource not found');
      scope = { company_id: client.company_id };
    }
    await this.rbac.require(req.user.id, policy.permission, scope);
    req.authorization = { grants: [], scope };
    return true;
  }
}
