import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { ApplicationUserService } from './application-user.service';
import { SupabaseJwtService } from './supabase-jwt.service';
import { RateLimitStore } from './rate-limit.guard';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(

    private readonly jwt: SupabaseJwtService,
    private readonly applicationUsers: ApplicationUserService,
    private readonly rateLimits: RateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: { id: string; email: string; supabase_user_id?: string; verification_status?: string } }>();
    const header = req.headers.authorization;
    const token = typeof header === 'string' ? /^Bearer ([^\s]+)$/i.exec(header)?.[1] : undefined;
    if (!token) throw new UnauthorizedException('Authentication required');

    const identity = await this.jwt.verify(token);
    const user = await this.applicationUsers.provision(identity);
    if (!user.supabase_user_id) throw new UnauthorizedException('Application identity is not linked');
    await this.rateLimits.consumeAuthenticated(context, { kind: 'user', id: user.id });
    req.user = { ...user, supabase_user_id: user.supabase_user_id };
    return true;
  }
}
