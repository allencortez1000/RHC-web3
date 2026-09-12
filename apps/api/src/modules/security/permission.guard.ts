import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION } from './permission.decorator';
import { RbacService } from './rbac.service';
import { PrismaService } from '../../platform/prisma.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly rbac: RbacService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]);
    if (!required) return true;
    const req = context.switchToHttp().getRequest<{ user?: { id: string }; query: Record<string, string | undefined>; params: Record<string, string | undefined>; path: string }>();
    if (!req.user) throw new ForbiddenException('Authentication required');

    let companyId = req.query.company_id;
    let projectId = req.query.project_id;
    // Route parameters identify the resource; never accept caller-provided
    // scope as authority for property mutations.
    if (req.params.id && req.path.includes('/properties/')) {
      const property = await this.prisma.property.findUnique({
        where: { id: req.params.id },
        select: { project_id: true, project: { select: { company_id: true } } },
      });
      if (!property) return true; // handler returns the canonical 404
      companyId = property.project.company_id;
      projectId = property.project_id;
    }
    const ok = await this.rbac.hasPermission(req.user.id, required, companyId, projectId);
    if (!ok) throw new ForbiddenException('Insufficient permission for this resource');
    return true;
  }
}
