import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { mockUser } from '../../platform/mock-data';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: { id: string; email: string } }>();
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentication required');
    if (this.prisma.mockMode) {
      req.user = { id: mockUser.id, email: mockUser.email };
      return true;
    }
    const user = await this.prisma.user.findUnique({ where: { id: token } });
    if (!user || user.account_status === 'DISABLED' || user.account_status === 'LOCKED') throw new UnauthorizedException('Invalid session');
    req.user = { id: user.id, email: user.email };
    return true;
  }
}
