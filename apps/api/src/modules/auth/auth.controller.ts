import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { AuthGuard } from '../security/auth.guard';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';

/**
 * Authentication is performed by Supabase in the browser. This API accepts only
 * a verified Supabase access JWT and deliberately has no password endpoints.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('config')
  @Header('Cache-Control', 'no-store')
  async config() {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: 'ENABLE_REGISTRATION' }, select: { enabled: true } });
    return { registration_enabled: flag?.enabled === true };
  }

  @Get('session')
  @UseGuards(AuthGuard)
  session(@CurrentUser() user: AuthUser) {
    return { authenticated: true, user };
  }
}
