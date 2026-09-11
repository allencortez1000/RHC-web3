import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { registerSchema } from '@rhc/validation';
import { PrismaService } from '../../platform/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../security/audit.service';
import { mockProfile, mockUser } from '../../platform/mock-data';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService, private readonly audit: AuditService) {}

  async register(input: unknown, request_id?: string) {
    const data = registerSchema.parse(input);
    if (this.prisma.mockMode) {
      await this.events.publish('USER.CREATED', { user_id: mockUser.id, mock: true }, { actor_user_id: mockUser.id, entity_type: 'user', entity_id: mockUser.id, request_id });
      await this.audit.record({ actor_user_id: mockUser.id, action: 'auth.register.mock', entity_type: 'user', entity_id: mockUser.id, after_data: { email: data.email }, request_id });
      return { ...mockUser, email: data.email.toLowerCase(), profile: { ...mockProfile, email: data.email.toLowerCase(), mobile_number: data.mobile_number } };
    }

    const flag = await this.prisma.featureFlag.findUnique({ where: { key: 'ENABLE_REGISTRATION' } });
    if (flag && !flag.enabled) throw new BadRequestException('Registration is disabled');
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({ data: { email: data.email.toLowerCase(), mobile_number: data.mobile_number, password_hash: passwordHash, account_status: 'PENDING', verification_status: 'UNVERIFIED', profile: { create: { email: data.email.toLowerCase(), mobile_number: data.mobile_number, account_status: 'PENDING', verification_status: 'UNVERIFIED' } } } });
    await this.prisma.consentRecord.createMany({ data: [
      { user_id: user.id, consent_type: 'PRIVACY_POLICY', consent_version: '2026-09', granted: true, granted_at: new Date(), metadata: { source: 'registration' } },
      { user_id: user.id, consent_type: 'TERMS', consent_version: '2026-09', granted: true, granted_at: new Date(), metadata: { source: 'registration' } },
    ] });
    await this.events.publish('USER.CREATED', { user_id: user.id }, { actor_user_id: user.id, entity_type: 'user', entity_id: user.id, request_id });
    await this.audit.record({ actor_user_id: user.id, action: 'auth.register', entity_type: 'user', entity_id: user.id, after_data: { email: user.email }, request_id });
    return { id: user.id, email: user.email, account_status: user.account_status, verification_status: user.verification_status };
  }

  async login(email: string, password: string) {
    if (!email || !password) throw new UnauthorizedException('Invalid credentials');
    if (this.prisma.mockMode) {
      return { access_token: 'mock-token', token_type: 'Bearer', user: { ...mockUser, email: email.toLowerCase() } };
    }

    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.account_status === 'DISABLED' || user.account_status === 'LOCKED') throw new UnauthorizedException('Invalid credentials');
    const valid = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
    return { access_token: user.id, token_type: 'Bearer', user: { id: user.id, email: user.email, account_status: user.account_status, verification_status: user.verification_status } };
  }

  async verifyAccount(userId: string) {
    if (this.prisma.mockMode) {
      await this.events.publish('USER.VERIFIED', { user_id: mockUser.id, mock: true }, { actor_user_id: mockUser.id, entity_type: 'user', entity_id: mockUser.id });
      return { id: mockUser.id, verification_status: 'VERIFIED' };
    }

    const before = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const after = await this.prisma.user.update({ where: { id: userId }, data: { account_status: 'ACTIVE', verification_status: 'VERIFIED', profile: { update: { account_status: 'ACTIVE', verification_status: 'VERIFIED' } } } });
    await this.events.publish('USER.VERIFIED', { user_id: userId }, { actor_user_id: userId, entity_type: 'user', entity_id: userId });
    await this.audit.record({ actor_user_id: userId, action: 'auth.verify', entity_type: 'user', entity_id: userId, before_data: before, after_data: after });
    return { id: after.id, verification_status: after.verification_status };
  }
}
