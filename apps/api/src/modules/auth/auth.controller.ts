import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../security/auth.guard';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';

/**
 * Authentication is performed by Supabase in the browser. This API accepts only
 * a verified Supabase access JWT and deliberately has no password endpoints.
 */
@Controller('auth')
export class AuthController {
  @Get('session')
  @UseGuards(AuthGuard)
  session(@CurrentUser() user: AuthUser) {
    return { authenticated: true, user };
  }
}
