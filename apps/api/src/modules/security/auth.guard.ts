import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { mockUser } from '../../platform/mock-data';
import { ApplicationUserService } from './application-user.service';
import { SupabaseJwtService } from './supabase-jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: SupabaseJwtService,
    private readonly applicationUsers: ApplicationUserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: { id: string; email: string; supabase_user_id?: string; verification_status?: string } }>();
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentication required');
    if (this.prisma.mockMode) {
      if (token !== 'mock-token') throw new UnauthorizedException('Invalid mock session');
      req.user = mockUser;
      return true;
    }
    const identity = await this.jwt.verify(token);
    const user = await this.applicationUsers.provision(identity);
    req.user = user;
    return true;
  }
}
