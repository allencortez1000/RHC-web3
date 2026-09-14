import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { uuid } from '../../platform/dto';
import { businessServiceCreate, businessServicePatch, integrationCreate, integrationPatch, managedSetting, projectPatch, relationshipPatch, reviewedAction, roleCreate, rolePatch, rolePermissionsReplace, settingBody, userRoleCreate, userRoleQuery, userStatusPatch } from '../../platform/management-dto';
import { AuthGuard } from '../security/auth.guard';
import { AuthUser, CurrentUser } from '../security/auth-user.decorator';
import { PermissionGuard } from '../security/permission.guard';
import { Authorization, Authorized, RequirePermission } from '../security/permission.decorator';
import { RequireFeature } from '../security/feature.guard';
import { RateLimit } from '../security/rate-limit.guard';
import { RbacService, ResourceScope } from '../security/rbac.service';
import { AuditService } from '../security/audit.service';
import { EventsService } from '../events/events.service';

const integrationSelect = { id: true, company_id: true, integration_key: true, name: true, status: true, created_at: true, updated_at: true } satisfies Prisma.CompanyIntegrationSelect;
const roleSelect = { id: true, company_id: true, code: true, name: true, description: true, is_system: true, created_at: true, updated_at: true } satisfies Prisma.RoleSelect;

@Controller('admin')
@UseGuards(AuthGuard, PermissionGuard)
@RateLimit(30)
export class ManagementController {
  constructor(private readonly prisma: PrismaService, private readonly rbac: RbacService, private readonly audit: AuditService, private readonly events: EventsService) {}

  private async record(tx: Prisma.TransactionClient, actor: AuthUser, action: string, event: string, entity: string, id: string, before: unknown, after: unknown, scope: ResourceScope = {}) {
    const context = { actor_user_id: actor.id, entity_type: entity, entity_id: id, ...scope };
    await this.audit.record({ ...context, action, before_data: before, after_data: after }, tx);
    await this.events.publish(event, { entity_id: id }, context, tx);
  }

  private governance<T>(actor: AuthUser, permission: string, work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(async (tx) => {
      // Shared with the bootstrap CLI: serialize nullable-scope grants and protection checks.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(734821906)`;
      await this.rbac.require(actor.id, permission);
      return work(tx);
    }, { isolationLevel: 'ReadCommitted' });
  }

  private async canDelegate(actor: AuthUser, permissions: Array<{ code: string }>) {
    for (const permission of permissions) await this.rbac.require(actor.id, permission.code);
  }

  @Patch('projects/:id') @RequirePermission('project.edit', { target: 'project' }) @RequireFeature('ENABLE_PROPERTIES')
  async updateProject(@Param('id') id: string, @Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    const data = projectPatch.parse(body);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projects WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.project.findUniqueOrThrow({ where: { id } });
      const start = data.start_date === undefined ? before.start_date : data.start_date;
      const end = data.target_completion === undefined ? before.target_completion : data.target_completion;
      if (start && end && end < start) throw new BadRequestException('Invalid project dates');
      const after = await tx.project.update({ where: { id }, data });
      await this.record(tx, actor, 'project.update', 'PROJECT.UPDATED', 'project', id, before, after, access.scope);
      return after;
    });
  }

  @Patch('customer-properties/:id') @RequirePermission('customer_property.manage', { target: 'relationship' }) @RequireFeature('ENABLE_PROPERTIES')
  async updateRelationship(@Param('id') id: string, @Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    const data = relationshipPatch.parse(body);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM customer_properties WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.customerProperty.findUniqueOrThrow({ where: { id } });
      const start = data.effective_from ?? before.effective_from;
      const end = data.effective_to === undefined ? before.effective_to : data.effective_to;
      if (end && end <= start) throw new BadRequestException('Invalid relationship dates');
      const after = await tx.customerProperty.update({ where: { id }, data });
      await this.record(tx, actor, 'customer_property.update', 'CUSTOMER_PROPERTY.UPDATED', 'customer_property', id, before, after, access.scope);
      return after;
    });
  }

  @Patch('users/:id/status') @RequirePermission('user.manage')
  async updateUserStatus(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const id = uuid.parse(rawId);
    const data = userStatusPatch.parse(body);
    if (id === actor.id && data.account_status !== 'ACTIVE') throw new ForbiddenException('Self-disable is not allowed');
    return this.governance(actor, 'user.manage', async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.user.findUniqueOrThrow({ where: { id }, select: { id: true, account_status: true, supabase_user_id: true, auth_email_confirmed_at: true, profile: { select: { id: true } } } });
      if (before.account_status === data.account_status) return { id, account_status: before.account_status };
      if (before.account_status !== data.expected_status) throw new ConflictException('Account status changed');
      if (data.account_status === 'ACTIVE' && (!before.supabase_user_id || !before.auth_email_confirmed_at || before.auth_email_confirmed_at > new Date())) throw new ConflictException('Confirmed linked identity required for activation');
      if (data.account_status !== 'ACTIVE' && await tx.userRole.count({ where: { user_id: id, company_id: null, project_id: null, role: { code: 'SUPER_ADMIN', company_id: null }, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] } })) throw new ForbiddenException('Bootstrap administrator status requires operator review');
      const after = await tx.user.update({ where: { id }, data: { account_status: data.account_status, ...(before.profile ? { profile: { update: { account_status: data.account_status } } } : {}) }, select: { id: true, account_status: true } });
      await this.record(tx, actor, 'user.status.update', 'USER.STATUS_CHANGED', 'user', id, { account_status: before.account_status }, { ...after, review_reference: data.review_reference });
      return after;
    });
  }

  @Post('roles') @RequirePermission('role.manage')
  async createRole(@Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const data = roleCreate.parse(body);
    if (['CUSTOMER', 'SUPER_ADMIN'].includes(data.code)) throw new ForbiddenException('Reserved role code');
    return this.governance(actor, 'role.manage', async (tx) => {
      if (data.company_id) await tx.company.findUniqueOrThrow({ where: { id: data.company_id }, select: { id: true } });
      if (await tx.role.findFirst({ where: { company_id: data.company_id ?? null, code: data.code }, select: { id: true } })) throw new ConflictException('Role already exists');
      const after = await tx.role.create({ data, select: roleSelect });
      await this.record(tx, actor, 'role.create', 'ROLE.CREATED', 'role', after.id, undefined, after, { company_id: after.company_id ?? undefined });
      return after;
    });
  }

  @Patch('roles/:id') @RequirePermission('role.manage')
  async updateRole(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const id = uuid.parse(rawId); const data = rolePatch.parse(body);
    return this.governance(actor, 'role.manage', async (tx) => {
      const before = await tx.role.findUniqueOrThrow({ where: { id }, select: roleSelect });
      if (before.is_system || ['CUSTOMER', 'SUPER_ADMIN'].includes(before.code)) throw new ForbiddenException('System role metadata is protected');
      const after = await tx.role.update({ where: { id }, data, select: roleSelect });
      await this.record(tx, actor, 'role.update', 'ROLE.UPDATED', 'role', id, before, after, { company_id: before.company_id ?? undefined });
      return after;
    });
  }

  @Delete('roles/:id') @RequirePermission('role.manage')
  async deleteRole(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const id = uuid.parse(rawId); const review = reviewedAction.parse(body);
    return this.governance(actor, 'role.manage', async (tx) => {
      const before = await tx.role.findUniqueOrThrow({ where: { id }, select: roleSelect });
      if (before.is_system || ['CUSTOMER', 'SUPER_ADMIN'].includes(before.code)) throw new ForbiddenException('System roles cannot be deleted');
      if (await tx.userRole.count({ where: { role_id: id } })) throw new ConflictException('Remove role assignments before deleting the role');
      await tx.role.delete({ where: { id } });
      await this.record(tx, actor, 'role.delete', 'ROLE.DELETED', 'role', id, before, review, { company_id: before.company_id ?? undefined });
      return { id, deleted: true };
    });
  }

  @Put('roles/:id/permissions') @RequirePermission('role.manage')
  async replaceRolePermissions(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const id = uuid.parse(rawId); const data = rolePermissionsReplace.parse(body);
    return this.governance(actor, 'role.manage', async (tx) => {
      await this.rbac.require(actor.id, 'permission.manage');
      const role = await tx.role.findUniqueOrThrow({ where: { id }, include: { role_permissions: true } });
      if (role.code === 'SUPER_ADMIN' || (role.code === 'CUSTOMER' && data.permission_ids.length)) throw new ForbiddenException('Protected role permissions');
      const permissions = await tx.permission.findMany({ where: { id: { in: data.permission_ids } }, select: { id: true, code: true } });
      if (permissions.length !== data.permission_ids.length) throw new BadRequestException('Unknown permission');
      await this.canDelegate(actor, permissions);
      const before = role.role_permissions.map((grant) => grant.permission_id).sort();
      const after = [...data.permission_ids].sort();
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await tx.rolePermission.deleteMany({ where: { role_id: id } });
        if (after.length) await tx.rolePermission.createMany({ data: after.map((permission_id) => ({ role_id: id, permission_id })) });
        await this.record(tx, actor, 'role.permissions.replace', 'ROLE.PERMISSIONS_UPDATED', 'role', id, { permission_ids: before }, { permission_ids: after, review_reference: data.review_reference }, { company_id: role.company_id ?? undefined });
      }
      return { id, permission_ids: after };
    });
  }

  @Get('user-roles') @RequirePermission('role.view')
  userRoles(@Query() query: unknown) {
    const q = userRoleQuery.parse(query);
    return this.prisma.userRole.findMany({ where: { user_id: q.user_id, role_id: q.role_id, company_id: q.company_id, project_id: q.project_id }, select: { id: true, user_id: true, role_id: true, company_id: true, project_id: true, expires_at: true, created_at: true, role: { select: { code: true, name: true } } }, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }

  @Post('user-roles') @RequirePermission('role.manage')
  async assignRole(@Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const data = userRoleCreate.parse(body);
    if (data.user_id === actor.id) throw new ForbiddenException('Self-assignment is not allowed');
    return this.governance(actor, 'role.manage', async (tx) => {
      await this.rbac.require(actor.id, 'user.manage');
      const role = await tx.role.findUniqueOrThrow({ where: { id: data.role_id }, include: { role_permissions: { include: { permission: true } } } });
      if (role.code === 'SUPER_ADMIN') throw new ForbiddenException('Use the explicit bootstrap operator workflow');
      if (role.code !== 'CUSTOMER') await this.canDelegate(actor, role.role_permissions.map((grant) => grant.permission));
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${data.user_id}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: data.user_id }, select: { account_status: true, supabase_user_id: true, auth_email_confirmed_at: true } });
      if (user.account_status !== 'ACTIVE' || !user.supabase_user_id || !user.auth_email_confirmed_at || user.auth_email_confirmed_at > new Date()) throw new ConflictException('Active confirmed linked user required');
      const project = data.project_id ? await tx.project.findUniqueOrThrow({ where: { id: data.project_id }, select: { company_id: true } }) : null;
      const company_id = data.company_id ?? role.company_id ?? project?.company_id ?? null;
      if ((role.company_id && role.company_id !== company_id) || (project && project.company_id !== company_id)) throw new BadRequestException('Role/project company scope mismatch');
      if (company_id) await tx.company.findUniqueOrThrow({ where: { id: company_id }, select: { id: true } });
      const assignment = { user_id: data.user_id, role_id: role.id, company_id, project_id: data.project_id ?? null };
      const existing = await tx.userRole.findMany({ where: assignment });
      if (existing.length > 1 || (existing.length && (existing[0].expires_at?.getTime() ?? null) !== (data.expires_at?.getTime() ?? null))) throw new ConflictException('Remove the existing assignment before changing its expiry');
      if (existing.length) return existing[0];
      const after = await tx.userRole.create({ data: { ...assignment, expires_at: data.expires_at ?? null } });
      await this.record(tx, actor, 'user_role.assign', 'USER_ROLE.ASSIGNED', 'user_role', after.id, undefined, { ...after, review_reference: data.review_reference }, { company_id: company_id ?? undefined, project_id: data.project_id });
      return after;
    });
  }

  @Delete('user-roles/:id') @RequirePermission('role.manage')
  async removeAssignment(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const id = uuid.parse(rawId); const review = reviewedAction.parse(body);
    return this.governance(actor, 'role.manage', async (tx) => {
      await this.rbac.require(actor.id, 'user.manage');
      const before = await tx.userRole.findUniqueOrThrow({ where: { id }, include: { role: { select: { code: true } } } });
      if (before.user_id === actor.id || before.role.code === 'SUPER_ADMIN') throw new ForbiddenException('Protected assignment');
      await tx.userRole.delete({ where: { id } });
      await this.record(tx, actor, 'user_role.remove', 'USER_ROLE.REMOVED', 'user_role', id, before, review, { company_id: before.company_id ?? undefined, project_id: before.project_id ?? undefined });
      return { id, removed: true };
    });
  }

  @Post('integrations') @RequirePermission('integration.manage', { target: 'body-company' }) @RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
  async createIntegration(@Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const data = integrationCreate.parse(body);
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.companyIntegration.create({ data, select: integrationSelect });
      await this.record(tx, actor, 'integration.create', 'INTEGRATION.CREATED', 'company_integration', after.id, undefined, after, { company_id: after.company_id });
      return after;
    });
  }

  @Patch('integrations/:id') @RequirePermission('integration.manage', { target: 'integration' }) @RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
  async updateIntegration(@Param('id') id: string, @Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    const data = integrationPatch.parse(body);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM company_integrations WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.companyIntegration.findUniqueOrThrow({ where: { id }, select: integrationSelect });
      const after = await tx.companyIntegration.update({ where: { id }, data, select: integrationSelect });
      await this.record(tx, actor, 'integration.update', 'INTEGRATION.UPDATED', 'company_integration', id, before, after, access.scope);
      return after;
    });
  }

  @Post('business-services') @RequirePermission('integration.manage', { target: 'body-company' }) @RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
  async createService(@Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const data = businessServiceCreate.parse(body);
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.businessService.create({ data });
      await this.record(tx, actor, 'business_service.create', 'BUSINESS_SERVICE.CREATED', 'business_service', after.id, undefined, after, { company_id: after.company_id });
      return after;
    });
  }

  @Patch('business-services/:id') @RequirePermission('integration.manage', { target: 'service' }) @RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
  async updateService(@Param('id') id: string, @Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    const data = businessServicePatch.parse(body);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM business_services WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.businessService.findUniqueOrThrow({ where: { id } });
      const after = await tx.businessService.update({ where: { id }, data });
      await this.record(tx, actor, 'business_service.update', 'BUSINESS_SERVICE.UPDATED', 'business_service', id, before, after, access.scope);
      return after;
    });
  }

  @Put('system-settings/:key') @RequirePermission('system_settings.manage')
  async setSetting(@Param('key') key: string, @Body() body: unknown, @CurrentUser() actor: AuthUser) {
    const input = settingBody.parse(body);
    const data = managedSetting.parse({ key, value: input.value });
    return this.prisma.$transaction(async (tx) => {
      // Serialize even the first write, when there is no row to lock yet.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(734821907, hashtext(${key}))`;
      const before = await tx.systemSetting.findUnique({ where: { key } });
      const previous = managedSetting.safeParse({ key, value: before?.value });
      const after = await tx.systemSetting.upsert({ where: { key }, create: data, update: { value: data.value } });
      // Legacy values may contain untyped configuration; never copy those into audit history.
      await this.record(tx, actor, 'system_setting.update', 'SYSTEM_SETTING.UPDATED', 'system_setting', after.id, before ? { key, ...(previous.success ? { value: previous.data.value } : {}) } : undefined, { key, value: data.value, review_reference: input.review_reference });
      return after;
    });
  }
}
