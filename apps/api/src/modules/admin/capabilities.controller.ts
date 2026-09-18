import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../security/auth.guard';
import { AuthUser, CurrentUser } from '../security/auth-user.decorator';
import { RbacService, type Grant, type ListResource } from '../security/rbac.service';
import { RateLimit } from '../security/rate-limit.guard';

export const ADMIN_CAPABILITY_PERMISSIONS = [
  'company.view',
  'customer.view',
  'project.view',
  'property.view',
  'reservation.view',
  'customer_property.view',
  'integration.view',
  'user.view',
  'role.view',
  'permission.view',
  'feature_flag.view',
  'audit.view',
  'system_settings.view',
] as const;

export const ADMIN_MUTATION_PERMISSIONS = [
  'company.manage',
  'project.create',
  'project.edit',
  'property.create',
  'property.edit',
  'property.change_status',
  'reservation.create',
  'reservation.manage',
  'reservation.cancel',
  'customer_property.manage',
  'user.manage',
  'role.manage',
  'permission.manage',
  'integration.manage',
  'feature_flag.manage',
  'system_settings.manage',
] as const;

type CapabilityModule = {
  path: string;
  permission: (typeof ADMIN_CAPABILITY_PERMISSIONS)[number];
  list?: ListResource;
};

// Keep this list aligned with the Admin Portal destinations and their actual list guards.
// It describes navigation usability only; resource guards still authorize every request.
export const ADMIN_CAPABILITY_MODULES: readonly CapabilityModule[] = [
  { path: '/', permission: 'company.view', list: 'company' },
  { path: '/customers', permission: 'customer.view', list: 'customer' },
  { path: '/rhc-digital-ids', permission: 'customer.view', list: 'customer' },
  { path: '/companies', permission: 'company.view', list: 'company' },
  { path: '/projects', permission: 'project.view', list: 'project' },
  { path: '/properties', permission: 'property.view', list: 'property' },
  { path: '/amica-tower-inventory', permission: 'property.view', list: 'property' },
  { path: '/reservations', permission: 'reservation.view', list: 'property' },
  { path: '/customer-properties', permission: 'customer_property.view', list: 'customer_property' },
  { path: '/business-services', permission: 'integration.view', list: 'service' },
  { path: '/users', permission: 'user.view', list: 'user' },
  { path: '/roles', permission: 'role.view', list: 'role' },
  { path: '/user-roles', permission: 'role.view', list: 'role' },
  { path: '/permissions', permission: 'permission.view' },
  { path: '/integrations', permission: 'integration.view', list: 'integration' },
  { path: '/feature-flags', permission: 'feature_flag.view' },
  { path: '/audit-logs', permission: 'audit.view', list: 'audit' },
  { path: '/system-settings', permission: 'system_settings.view' },
];

function listGrantIsUsable(grant: Grant, list?: ListResource) {
  if (!list) return !grant.company_id && !grant.project_id;
  if (['company', 'integration', 'service', 'role'].includes(list)) return !grant.project_id;
  return true;
}

@Controller('admin')
@UseGuards(AuthGuard)
@RateLimit(60)
export class CapabilitiesController {
  constructor(private readonly rbac: RbacService) {}

  @Get('capabilities')
  @Header('Cache-Control', 'no-store')
  async capabilities(@CurrentUser() user: AuthUser) {
    const permissions = [...ADMIN_CAPABILITY_PERMISSIONS, ...ADMIN_MUTATION_PERMISSIONS];
    const entries = await Promise.all(permissions.map(async (permission) => ({
      permission,
      grants: await this.rbac.grants(user.id, permission),
    })));
    const grantsFor = (permission: string) => entries.find((entry) => entry.permission === permission)?.grants ?? [];
    const readEntries = entries.filter((entry) => (ADMIN_CAPABILITY_PERMISSIONS as readonly string[]).includes(entry.permission));
    const mutationEntries = entries.filter((entry) => (ADMIN_MUTATION_PERMISSIONS as readonly string[]).includes(entry.permission));
    const effectiveModules = ADMIN_CAPABILITY_MODULES.map((module) => ({
      path: module.path,
      permission: module.permission,
      usable: grantsFor(module.permission).some((grant) => listGrantIsUsable(grant, module.list)),
    }));

    return {
      permissions: readEntries.filter((entry) => entry.grants.length > 0).map((entry) => entry.permission),
      grants: Object.fromEntries(readEntries.filter((entry) => entry.grants.length > 0).map((entry) => [entry.permission, entry.grants])),
      mutation_permissions: mutationEntries.filter((entry) => entry.grants.length > 0).map((entry) => entry.permission),
      mutation_grants: Object.fromEntries(mutationEntries.filter((entry) => entry.grants.length > 0).map((entry) => [entry.permission, entry.grants])),
      modules: effectiveModules,
    };
  }
}
