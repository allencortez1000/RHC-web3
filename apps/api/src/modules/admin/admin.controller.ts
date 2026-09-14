import { Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { safeData } from '../../platform/safe-data';
import { managedSetting } from '../../platform/management-dto';
import { companyCreate, companyUpdate, customerPropertyCreate, flagUpdate, listQuery, projectCreate, propertyCreate, propertyQuery, propertyUpdate, uuid, verificationApproval, emptyBody } from '../../platform/dto';
import { AuthGuard } from '../security/auth.guard';
import { PermissionGuard } from '../security/permission.guard';
import { Authorization, Authorized, RequirePermission } from '../security/permission.decorator';
import { RequireFeature } from '../security/feature.guard';
import { RateLimit } from '../security/rate-limit.guard';
import { AuditService } from '../security/audit.service';
import { EventsService } from '../events/events.service';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';
import { RbacService } from '../security/rbac.service';

const userSelect = { id: true, email: true, account_status: true, verification_status: true, created_at: true, profile: { select: { first_name: true, last_name: true, rhc_id: true } } } satisfies Prisma.UserSelect;

@Controller('admin')
@UseGuards(AuthGuard, PermissionGuard)
@RateLimit(60)
export class AdminController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly events: EventsService, private readonly rbac: RbacService) {}

  @Get('dashboard')
  @RequirePermission('company.view', { list: 'company' })
  async dashboard(@CurrentUser() user: AuthUser) {
    // Each metric uses its own permission, not company.view as a proxy for PII access.
    const [companies, projects, properties, users, customers, integrations, audit] = await Promise.all(['company.view', 'project.view', 'property.view', 'user.view', 'customer.view', 'integration.view', 'audit.view'].map((permission) => this.rbac.grants(user.id, permission)));
    const [totalUsers, verifiedCustomers, companyCount, activeProjects, totalAmicaProperties, availableProperties, reservedProperties, activeIntegrations, auditCount] = await Promise.all([
      this.prisma.user.count({ where: this.rbac.userWhere(users) }),
      this.prisma.user.count({ where: { AND: [this.rbac.userWhere(customers, true), { verification_status: 'VERIFIED' }] } }),
      this.prisma.company.count({ where: this.rbac.companyWhere(companies) }),
      this.prisma.project.count({ where: { AND: [this.rbac.projectWhere(projects), { status: 'ACTIVE' }] } }),
      this.prisma.property.count({ where: this.rbac.propertyWhere(properties) }),
      this.prisma.property.count({ where: { AND: [this.rbac.propertyWhere(properties), { status: 'AVAILABLE' }] } }),
      this.prisma.property.count({ where: { AND: [this.rbac.propertyWhere(properties), { status: 'RESERVED' }] } }),
      this.prisma.companyIntegration.count({ where: { AND: [this.rbac.tenantWhere(integrations), { status: 'ACTIVE' }] } }),
      this.prisma.auditLog.count({ where: this.rbac.auditWhere(audit) }),
    ]);
    return { totalUsers, verifiedCustomers, companies: companyCount, activeProjects, totalAmicaProperties, availableProperties, reservedProperties, activeIntegrations, auditCount };
  }

  private projectFilter(query: ReturnType<typeof listQuery.parse>): Prisma.ProjectWhereInput {
    return { ...(query.company_id ? { company_id: query.company_id } : {}), ...(query.project_id ? { id: query.project_id } : {}) };
  }

  @Get('users') @RequirePermission('user.view', { list: 'user' })
  users(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.parse(query);
    return this.prisma.user.findMany({ where: { AND: [this.rbac.userWhere(access.grants), ...(q.company_id || q.project_id ? [{ customer_properties: { some: { property: { project: this.projectFilter(q) } } } }] : [])] }, select: userSelect, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }

  // Business verification is global user state, not a company/project-local grant.
  // Compliance review remains available when registration or ID issuance is paused.
  @Post('users/:id/verification/approve') @HttpCode(200) @RequirePermission('user.manage') @RateLimit(10)
  async approveVerification(@Param('id') rawId: string, @Body() body: unknown, @Query() query: unknown, @CurrentUser() actor: AuthUser) {
    const id = uuid.parse(rawId);
    const data = verificationApproval.parse(body);
    emptyBody.parse(query);
    if (id === actor.id) throw new ForbiddenException('Self-approval is not allowed');
    return this.prisma.$transaction(async (tx) => {
      // Coordinate with auth synchronization and ID issuance using the same user row lock.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.user.findUniqueOrThrow({ where: { id }, select: { id: true, account_status: true, verification_status: true, supabase_user_id: true, auth_email_confirmed_at: true, profile: { select: { verification_status: true } } } });
      if (before.account_status !== 'ACTIVE' || !before.supabase_user_id || !before.auth_email_confirmed_at || before.auth_email_confirmed_at > new Date()) throw new ConflictException('Active account and confirmed email are required');
      if (!before.profile) throw new ConflictException('Application profile is required');
      if (before.verification_status === 'VERIFIED') {
        if (before.profile.verification_status !== 'VERIFIED') throw new ConflictException('Verification state requires review');
        return { id, verification_status: before.verification_status };
      }
      if (before.verification_status !== data.expected_status) throw new ConflictException('Verification status changed; review again');
      const after = await tx.user.update({ where: { id }, data: { verification_status: 'VERIFIED', profile: { update: { verification_status: 'VERIFIED' } } }, select: { id: true, verification_status: true } });
      const context = { actor_user_id: actor.id, entity_type: 'user', entity_id: id };
      await this.audit.record({ ...context, action: 'user.verification.approve', before_data: { verification_status: before.verification_status, profile_verification_status: before.profile.verification_status }, after_data: { verification_status: after.verification_status, review_reference: data.review_reference } }, tx);
      await this.events.publish('USER.VERIFICATION_APPROVED', { verification_status: after.verification_status }, context, tx);
      return after;
    }, { isolationLevel: 'ReadCommitted' });
  }

  @Get('customers') @RequirePermission('customer.view', { list: 'customer' })
  customers(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.parse(query);
    return this.prisma.user.findMany({ where: { AND: [this.rbac.userWhere(access.grants, true), ...(q.company_id || q.project_id ? [{ customer_properties: { some: { property: { project: this.projectFilter(q) } } } }] : [])] }, select: userSelect, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }

  @Get('companies') @RequirePermission('company.view', { list: 'company' })
  companies(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.omit({ project_id: true }).parse(query);
    return this.prisma.company.findMany({ where: { AND: [this.rbac.companyWhere(access.grants), q.company_id ? { id: q.company_id } : {}] }, take: q.take, skip: q.skip, orderBy: { company_code: 'asc' } });
  }

  @Post('companies') @RequirePermission('company.manage')
  async createCompany(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const data = companyCreate.parse(body);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({ data });
      const context = { actor_user_id: user.id, company_id: created.id, entity_type: 'company', entity_id: created.id };
      await this.audit.record({ ...context, action: 'company.create', after_data: created }, tx);
      await this.events.publish('COMPANY.CREATED', created, context, tx);
      return created;
    });
  }

  @Patch('companies/:id') @RequirePermission('company.manage', { target: 'company' })
  async updateCompany(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const data = companyUpdate.parse(body);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.company.findUniqueOrThrow({ where: { id } });
      const after = await tx.company.update({ where: { id }, data });
      await this.audit.record({ actor_user_id: user.id, company_id: id, action: 'company.update', entity_type: 'company', entity_id: id, before_data: before, after_data: after }, tx);
      return after;
    });
  }

  @Get('projects') @RequirePermission('project.view', { list: 'project' }) @RequireFeature('ENABLE_PROPERTIES')
  projects(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.parse(query);
    return this.prisma.project.findMany({ where: { AND: [this.rbac.projectWhere(access.grants), this.projectFilter(q)] }, include: { company: true }, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }

  @Post('projects') @RequirePermission('project.create', { target: 'body-company' }) @RequireFeature('ENABLE_PROPERTIES')
  async createProject(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const data = projectCreate.parse(body);
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({ data });
      const context = { actor_user_id: user.id, company_id: project.company_id, project_id: project.id, entity_type: 'project', entity_id: project.id };
      await this.audit.record({ ...context, action: 'project.create', after_data: project }, tx);
      await this.events.publish('PROJECT.CREATED', project, context, tx);
      return project;
    });
  }

  @Get('properties') @RequirePermission('property.view', { list: 'property' }) @RequireFeature('ENABLE_PROPERTIES')
  properties(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = propertyQuery.parse(query);
    return this.prisma.property.findMany({ where: { AND: [this.rbac.propertyWhere(access.grants), { project: this.projectFilter(q), status: q.status, asset_type: q.asset_type, ...(q.q ? { property_code: { contains: q.q, mode: 'insensitive' } } : {}) }] }, include: { project: { include: { company: true } } }, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }

  @Post('properties') @RequirePermission('property.create', { target: 'body-project' }) @RequireFeature('ENABLE_PROPERTIES')
  async createProperty(@Body() body: unknown, @CurrentUser() user: AuthUser, @Authorized() access: Authorization) {
    const data = propertyCreate.parse(body);
    if (data.status !== 'AVAILABLE') await this.rbac.require(user.id, 'property.change_status', access.scope);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.property.create({ data });
      const context = { actor_user_id: user.id, ...access.scope, entity_type: 'property', entity_id: created.id };
      await this.audit.record({ ...context, action: 'property.create', after_data: created }, tx);
      await this.events.publish('PROPERTY.CREATED', created, context, tx);
      return created;
    });
  }

  @Patch('properties/:id') @RequirePermission('property.edit', { target: 'property' }) @RequireFeature('ENABLE_PROPERTIES')
  async updateProperty(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser, @Authorized() access: Authorization) {
    const data = propertyUpdate.parse(body);
    if (data.status !== undefined) await this.rbac.require(user.id, 'property.change_status', access.scope);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.property.findUniqueOrThrow({ where: { id } });
      const after = await tx.property.update({ where: { id }, data });
      const context = { actor_user_id: user.id, ...access.scope, entity_type: 'property', entity_id: id };
      await this.audit.record({ ...context, action: before.status !== after.status ? 'property.change_status' : 'property.update', before_data: before, after_data: after }, tx);
      await this.events.publish(after.status === 'HELD' ? 'PROPERTY.HELD' : after.status === 'RESERVED' ? 'PROPERTY.RESERVED' : 'PROPERTY.UPDATED', after, context, tx);
      return after;
    });
  }

  @Get('customer-properties') @RequirePermission('customer_property.view', { list: 'customer_property' }) @RequireFeature('ENABLE_PROPERTIES')
  customerProperties(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.parse(query);
    return this.prisma.customerProperty.findMany({ where: { AND: [this.rbac.customerPropertyWhere(access.grants), { property: { project: this.projectFilter(q) } }] }, select: { id: true, customer_id: true, property_id: true, relationship_type: true, status: true, effective_from: true, effective_to: true, created_at: true, updated_at: true }, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }

  @Post('customer-properties') @RequirePermission('customer_property.manage', { target: 'body-property' }) @RequireFeature('ENABLE_PROPERTIES')
  async linkCustomerProperty(@Body() body: unknown, @CurrentUser() user: AuthUser, @Authorized() access: Authorization) {
    const data = customerPropertyCreate.parse(body);
    // Knowing another tenant's customer UUID does not authorize linking that customer.
    await this.prisma.user.findFirstOrThrow({ where: { AND: [{ id: data.customer_id, account_status: 'ACTIVE' }, this.rbac.userWhere(await this.rbac.grants(user.id, 'customer.view'), true)] }, select: { id: true } });
    return this.prisma.$transaction(async (tx) => {
      const cp = await tx.customerProperty.create({ data });
      const context = { actor_user_id: user.id, ...access.scope, entity_type: 'customer_property', entity_id: cp.id };
      await this.audit.record({ ...context, action: 'customer_property.create', after_data: cp }, tx);
      await this.events.publish('CUSTOMER_PROPERTY.CREATED', cp, context, tx);
      return cp;
    });
  }

  @Get('roles') @RequirePermission('role.view', { list: 'role' })
  roles(@Authorized() access: Authorization) {
    return this.prisma.role.findMany({ where: access.grants.some((g) => !g.company_id && !g.project_id) ? {} : { OR: access.grants.map((g) => ({ company_id: g.company_id })) }, include: { role_permissions: { include: { permission: true } } }, take: 200, orderBy: { id: 'asc' } });
  }
  @Get('permissions') @RequirePermission('permission.view')
  permissions() { return this.prisma.permission.findMany({ take: 200, orderBy: { code: 'asc' } }); }

  @Get('integrations') @RequirePermission('integration.view', { list: 'integration' }) @RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
  integrations(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.omit({ project_id: true }).parse(query);
    return this.prisma.companyIntegration.findMany({ where: { AND: [this.rbac.tenantWhere(access.grants), { company_id: q.company_id }] }, select: { id: true, company_id: true, integration_key: true, name: true, status: true, created_at: true, updated_at: true, company: { select: { company_code: true, display_name: true } } }, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }
  @Get('business-services') @RequirePermission('integration.view', { list: 'service' }) @RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
  businessServices(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.omit({ project_id: true }).parse(query);
    return this.prisma.businessService.findMany({ where: { AND: [{ company: this.rbac.companyWhere(access.grants) }, { company_id: q.company_id }] }, include: { company: { select: { company_code: true, display_name: true } } }, take: q.take, skip: q.skip, orderBy: { service_code: 'asc' } });
  }
  @Get('feature-flags') @RequirePermission('feature_flag.view')
  flags() { return this.prisma.featureFlag.findMany({ select: { id: true, key: true, description: true, enabled: true, scope: true, updated_at: true }, orderBy: { key: 'asc' }, take: 200 }); }

  @Patch('feature-flags/:id') @RequirePermission('feature_flag.manage')
  async updateFlag(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const id = uuid.parse(rawId);
    const data = flagUpdate.parse(body);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.featureFlag.findUniqueOrThrow({ where: { id } });
      const after = await tx.featureFlag.update({ where: { id }, data, select: { id: true, key: true, enabled: true, scope: true, updated_at: true } });
      await this.audit.record({ actor_user_id: user.id, action: 'feature_flag.update', entity_type: 'feature_flag', entity_id: id, before_data: { enabled: before.enabled }, after_data: after }, tx);
      return after;
    });
  }

  @Get('audit-logs') @RequirePermission('audit.view', { list: 'audit' })
  async auditLogs(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.parse(query);
    const logs = await this.prisma.auditLog.findMany({ where: { AND: [this.rbac.auditWhere(access.grants), { company_id: q.company_id, project_id: q.project_id }] }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: q.take, skip: q.skip });
    return logs.map((log) => ({ ...log, before_data: safeData(log.before_data), after_data: safeData(log.after_data) }));
  }
  @Get('system-settings') @RequirePermission('system_settings.view')
  async settings() {
    const rows = await this.prisma.systemSetting.findMany({ select: { id: true, key: true, value: true, description: true, updated_at: true }, take: 200, orderBy: { key: 'asc' } });
    return rows.map(({ value, ...metadata }) => {
      const setting = managedSetting.safeParse({ key: metadata.key, value });
      return { ...metadata, ...(setting.success ? { value: setting.data.value } : {}) };
    });
  }
}
