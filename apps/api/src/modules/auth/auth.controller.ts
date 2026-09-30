import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { AuthGuard } from '../security/auth.guard';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';
import { RbacService } from '../security/rbac.service';
import { FeatureService } from '../security/feature.guard';

/**
 * Authentication is performed by Supabase in the browser. This API accepts only
 * a verified Supabase access JWT and deliberately has no password endpoints.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly features: FeatureService,
  ) {}

  @Get('config')
  @Header('Cache-Control', 'no-store')
  async config() {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: 'ENABLE_REGISTRATION' }, select: { enabled: true } });
    return {
      registration_enabled: flag?.enabled === true,
      web3_read_preview_enabled: await this.features.isEnabled('ENABLE_WEB3_READ_PREVIEW'),
    };
  }

  @Get('session')
  @UseGuards(AuthGuard)
  async session(@CurrentUser() user: AuthUser) {
    const capabilities = await this.rbac.capabilities(user.id);
    return {
      authenticated: true,
      user: {
        ...user,
        ...capabilities,
        role: capabilities.roles[0] || 'CUSTOMER',
      },
    };
  }
}
