import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { profileSchema } from '@rhc/validation';
import { PrismaService } from '../../platform/prisma.service';
import { AuthGuard } from '../security/auth.guard';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';
import { RhcIdService } from '../identity/rhc-id.service';
import { mockCustomerProperties, mockProfile, mockUser } from '../../platform/mock-data';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService, private readonly rhcId: RhcIdService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) return { user: { ...mockUser, id: user.id, email: user.email }, profile: mockProfile };
    const profile = await this.prisma.userProfile.findUnique({ where: { user_id: user.id } });
    return { user, profile };
  }

  @Patch()
  async updateMe(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const data = profileSchema.parse(body);
    if (this.prisma.mockMode) return { ...mockProfile, ...data, user_id: user.id, updated_at: new Date() };
    return this.prisma.userProfile.update({ where: { user_id: user.id }, data });
  }

  @Get('rhc-id')
  async getRhcId(@CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) return { rhc_id: mockProfile.rhc_id };
    const id = await this.rhcId.issueForUser(user.id);
    return { rhc_id: id };
  }

  @Get('properties')
  async properties(@CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) return mockCustomerProperties.map((item) => ({ ...item, customer_id: user.id }));
    return this.prisma.customerProperty.findMany({ where: { customer_id: user.id, status: 'ACTIVE' }, include: { property: { include: { project: { include: { company: true } } } } } });
  }

  @Get('notifications')
  async notifications(@CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) return [{ id: 'mock-notification-1', user_id: user.id, channel: 'IN_APP', subject: 'Welcome to RHC Digital', body: 'This is mock local development data.', status: 'DELIVERED', created_at: new Date(), sent_at: new Date() }];
    return this.prisma.notification.findMany({ where: { user_id: user.id }, orderBy: { created_at: 'desc' } });
  }
}
