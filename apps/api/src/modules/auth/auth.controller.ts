import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthGuard } from '../security/auth.guard';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') @Throttle({ default: { limit: 5, ttl: 60000 } }) register(@Body() body: unknown) { return this.auth.register(body); }
  @Post('login') @Throttle({ default: { limit: 8, ttl: 60000 } }) login(@Body() body: { email: string; password: string }) { return this.auth.login(body.email, body.password); }
  @Post('logout') logout() { return { logged_out: true }; }
  @Post('forgot-password') forgotPassword() { return { accepted: true, delivery: 'email-provider-abstraction' }; }
  @Post('reset-password') resetPassword() { return { accepted: true }; }
  @Post('verify') @UseGuards(AuthGuard) verify(@CurrentUser() user: AuthUser) { return this.auth.verifyAccount(user.id); }
  @Get('session') @UseGuards(AuthGuard) session(@CurrentUser() user: AuthUser) { return { authenticated: true, user }; }
}
