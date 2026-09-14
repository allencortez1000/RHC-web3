import { Body, Controller, ForbiddenException, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { emptyBody, profileUpdate } from '../../platform/dto';
import { AuthGuard } from '../security/auth.guard';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';
import { RhcIdService } from '../identity/rhc-id.service';
import { RequireFeature } from '../security/feature.guard';
import { RateLimit } from '../security/rate-limit.guard';
import { AuditService } from '../security/audit.service';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService, private readonly rhcId: RhcIdService, private readonly audit: AuditService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const profile = await this.prisma.userProfile.findUnique({ where: { user_id: user.id } });
    return { user, profile };
  }

  @Patch() @RateLimit(20)
  async updateMe(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const data = profileUpdate.parse(body);
    return this.prisma.$transaction(async (tx) => {
      // Use the same parent-row lock as approval and ID issuance before reading state.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { verification_status: true } });
      const profile = await tx.userProfile.findUniqueOrThrow({ where: { user_id: user.id }, select: { verification_status: true, rhc_id: true, rhc_id_issued_at: true } });
      const identityLocked = current.verification_status === 'VERIFIED' || profile.verification_status === 'VERIFIED' || !!profile.rhc_id || !!profile.rhc_id_issued_at;
      // Contact-only allowlist: future profile fields are locked by default too.
      if (identityLocked && Object.keys(data).some((field) => field !== 'mobile_number')) throw new ForbiddenException('Approved identity fields require a separately reviewed administrative change');
      const after = await tx.userProfile.update({ where: { user_id: user.id }, data });
      await this.audit.record({ actor_user_id: user.id, action: 'profile.update', entity_type: 'user_profile', entity_id: after.id, after_data: { changed_fields: Object.keys(data) } }, tx);
      return after;
    });
  }

  @Get('rhc-id')
  async getRhcId(@CurrentUser() user: AuthUser) {
    const profile = await this.prisma.userProfile.findUniqueOrThrow({ where: { user_id: user.id }, select: { rhc_id: true, rhc_id_issued_at: true } });
    return profile;
  }

  @Post('rhc-id') @RequireFeature('ENABLE_RHC_ID') @RateLimit(5)
  async issueRhcId(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    emptyBody.parse(body ?? {});
    return { rhc_id: await this.rhcId.issueForUser(user.id) };
  }

  @Get('properties') @RequireFeature('ENABLE_PROPERTIES')
  properties(@CurrentUser() user: AuthUser) {
    return this.prisma.customerProperty.findMany({ where: { customer_id: user.id, status: 'ACTIVE', effective_from: { lte: new Date() }, OR: [{ effective_to: null }, { effective_to: { gt: new Date() } }] }, include: { property: { include: { project: { include: { company: { select: { id: true, company_code: true, display_name: true } } } } } } }, take: 200, orderBy: { id: 'asc' } });
  }

  @Get('notifications')
  notifications(@CurrentUser() user: AuthUser) {
    return this.prisma.notification.findMany({ where: { user_id: user.id }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 100 });
  }
}
