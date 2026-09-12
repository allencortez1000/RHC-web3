import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}
  async hasPermission(userId: string, permission: string, companyId?: string, projectId?: string): Promise<boolean> {
    if (this.prisma.mockMode) return true;
    const roles = await this.prisma.userRole.findMany({
      where: { user_id: userId, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] },
      include: { role: { include: { role_permissions: { include: { permission: true } } } } },
    });
    return roles.some((ur) => {
      // Scoped grants are valid only when the protected resource has supplied
      // the matching, resource-derived scope. Missing query parameters never
      // broaden a grant.
      const companyOk = !ur.company_id || ur.company_id === companyId;
      const projectOk = !ur.project_id || ur.project_id === projectId;
      return companyOk && projectOk && ur.role.role_permissions.some((rp) => rp.permission.code === permission);
    });
  }
}
