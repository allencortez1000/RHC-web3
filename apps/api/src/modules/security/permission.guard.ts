import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION } from './permission.decorator';
import { RbacService } from './rbac.service';
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly rbac: RbacService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]);
    if (!required) return true;
    const req = context.switchToHttp().getRequest<{ user?: { id: string }; query: Record<string, string | undefined> }>();
    if (!req.user) return false;
    const ok = await this.rbac.hasPermission(req.user.id, required, req.query.company_id, req.query.project_id);
    if (!ok) throw new ForbiddenException('Insufficient permission');
    return true;
  }
}
