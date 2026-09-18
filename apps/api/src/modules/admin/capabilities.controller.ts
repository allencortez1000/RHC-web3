import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../security/auth.guard';
import { AuthUser, CurrentUser } from '../security/auth-user.decorator';
import { RbacService } from '../security/rbac.service';
import { RateLimit } from '../security/rate-limit.guard';

// These are the read permissions that correspond to an Admin Portal module. The response is
// caller-specific and contains only effective grants; resource endpoints remain authoritative.
export const ADMIN_CAPABILITY_PERMISSIONS = [
  'company.view',
  'customer.view',
  'project.view',
  'property.view',
  'customer_property.view',
  'integration.view',
  'user.view',
  'role.view',
  'permission.view',
  'feature_flag.view',
  'audit.view',
  'system_settings.view',
] as const;

@Controller('admin')
@UseGuards(AuthGuard)
@RateLimit(60)
export class CapabilitiesController {
  constructor(private readonly rbac: RbacService) {}

  @Get('capabilities')
  @Header('Cache-Control', 'no-store')
  async capabilities(@CurrentUser() user: AuthUser) {
    const entries = await Promise.all(ADMIN_CAPABILITY_PERMISSIONS.map(async (permission) => ({
      permission,
      grants: await this.rbac.grants(user.id, permission),
    })));
    const effective = entries.filter((entry) => entry.grants.length > 0);
    return {
      permissions: effective.map((entry) => entry.permission),
      grants: Object.fromEntries(effective.map((entry) => [entry.permission, entry.grants])),
    };
  }
}
