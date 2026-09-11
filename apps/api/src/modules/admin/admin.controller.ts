import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { propertySchema } from '@rhc/validation';
import { PrismaService } from '../../platform/prisma.service';
import { AuthGuard } from '../security/auth.guard';
import { PermissionGuard } from '../security/permission.guard';
import { RequirePermission } from '../security/permission.decorator';
import { AuditService } from '../security/audit.service';
import { EventsService } from '../events/events.service';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';
import {
  mockAuditLogs,
  mockBusinessServices,
  mockCompanies,
  mockCustomerProperties,
  mockFeatureFlags,
  mockIntegrations,
  mockPermissions,
  mockProjects,
  mockProperties,
  mockRoles,
  mockSystemSettings,
  mockUsers,
} from '../../platform/mock-data';

@Controller('admin')
@UseGuards(AuthGuard, PermissionGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly events: EventsService) {}

  @Get('dashboard')
  @RequirePermission('company.view')
  async dashboard() {
    if (this.prisma.mockMode) {
      return {
        totalUsers: mockUsers.length,
        verifiedCustomers: mockUsers.filter((user) => user.verification_status === 'VERIFIED').length,
        companies: mockCompanies.length,
        activeProjects: mockProjects.filter((project) => project.status === 'ACTIVE').length,
        totalAmicaProperties: mockProperties.length,
        availableProperties: mockProperties.filter((property) => property.status === 'AVAILABLE').length,
        reservedProperties: mockProperties.filter((property) => property.status === 'RESERVED').length,
        activeIntegrations: mockIntegrations.filter((integration) => integration.status === 'ACTIVE').length,
        auditCount: mockAuditLogs.length,
      };
    }

    const [totalUsers, verifiedCustomers, companies, activeProjects, totalAmicaProperties, availableProperties, reservedProperties, activeIntegrations, auditCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { verification_status: 'VERIFIED' } }),
      this.prisma.company.count(),
      this.prisma.project.count({ where: { status: 'ACTIVE' } }),
      this.prisma.property.count(),
      this.prisma.property.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.property.count({ where: { status: 'RESERVED' } }),
      this.prisma.companyIntegration.count({ where: { status: 'ACTIVE' } }),
      this.prisma.auditLog.count(),
    ]);
    return { totalUsers, verifiedCustomers, companies, activeProjects, totalAmicaProperties, availableProperties, reservedProperties, activeIntegrations, auditCount };
  }

  @Get('users')
  @RequirePermission('user.view')
  users() {
    if (this.prisma.mockMode) return mockUsers;
    return this.prisma.user.findMany({ select: { id: true, email: true, mobile_number: true, account_status: true, verification_status: true, created_at: true, updated_at: true, profile: true, roles: { include: { role: true, company: true, project: true } } } });
  }

  @Get('customers')
  @RequirePermission('customer.view')
  customers() {
    if (this.prisma.mockMode) return mockUsers;
    return this.prisma.user.findMany({ include: { profile: true } });
  }

  @Get('companies')
  @RequirePermission('company.view')
  companies() {
    if (this.prisma.mockMode) return mockCompanies;
    return this.prisma.company.findMany({ orderBy: { company_code: 'asc' } });
  }

  @Post('companies')
  @RequirePermission('company.manage')
  async createCompany(@Body() body: { company_code: string; legal_name: string; display_name: string; description?: string; business_type?: string }, @CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) {
      const created = { id: `mock-company-${body.company_code}`, status: 'PREPARED', integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: false, created_at: new Date(), updated_at: new Date(), ...body };
      await this.audit.record({ actor_user_id: user.id, action: 'company.create.mock', entity_type: 'company', entity_id: created.id, after_data: created });
      return created;
    }
    const created = await this.prisma.company.create({ data: body });
    await this.audit.record({ actor_user_id: user.id, action: 'company.create', entity_type: 'company', entity_id: created.id, after_data: created });
    await this.events.publish('COMPANY.CREATED', created, { actor_user_id: user.id, entity_type: 'company', entity_id: created.id });
    return created;
  }

  @Patch('companies/:id')
  @RequirePermission('company.manage')
  async updateCompany(@Param('id') id: string, @Body() body: object, @CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) {
      const before = mockCompanies.find((company) => company.id === id) ?? mockCompanies[0];
      const after = { ...before, ...body, updated_at: new Date() };
      await this.audit.record({ actor_user_id: user.id, action: 'company.update.mock', entity_type: 'company', entity_id: id, before_data: before, after_data: after });
      return after;
    }
    const before = await this.prisma.company.findUniqueOrThrow({ where: { id } });
    const after = await this.prisma.company.update({ where: { id }, data: body });
    await this.audit.record({ actor_user_id: user.id, action: 'company.update', entity_type: 'company', entity_id: id, before_data: before, after_data: after });
    return after;
  }

  @Get('projects')
  @RequirePermission('project.view')
  projects() {
    if (this.prisma.mockMode) return mockProjects;
    return this.prisma.project.findMany({ include: { company: true } });
  }

  @Post('projects')
  @RequirePermission('project.create')
  async createProject(@Body() body: any, @CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) {
      const project = { id: `mock-project-${Date.now()}`, created_at: new Date(), updated_at: new Date(), status: 'PLANNED', ...body };
      await this.events.publish('PROJECT.CREATED', project, { actor_user_id: user.id, entity_type: 'project', entity_id: project.id });
      return project;
    }
    const project = await this.prisma.project.create({ data: body });
    await this.events.publish('PROJECT.CREATED', project, { actor_user_id: user.id, entity_type: 'project', entity_id: project.id });
    return project;
  }

  @Get('properties')
  @RequirePermission('property.view')
  properties(@Query('status') status?: string, @Query('asset_type') assetType?: string, @Query('q') q?: string) {
    if (this.prisma.mockMode) {
      return mockProperties.filter((property) => {
        const statusOk = !status || property.status === status;
        const assetOk = !assetType || property.asset_type === assetType;
        const queryOk = !q || property.property_code.toLowerCase().includes(q.toLowerCase());
        return statusOk && assetOk && queryOk;
      });
    }
    return this.prisma.property.findMany({ where: { ...(status ? { status: status as any } : {}), ...(assetType ? { asset_type: assetType as any } : {}), ...(q ? { property_code: { contains: q, mode: 'insensitive' } } : {}) }, include: { project: { include: { company: true } } } });
  }

  @Post('properties')
  @RequirePermission('property.create')
  async createProperty(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const data = propertySchema.parse(body);
    if (this.prisma.mockMode) {
      const created = { id: `mock-property-${Date.now()}`, created_at: new Date(), updated_at: new Date(), ...data };
      await this.audit.record({ actor_user_id: user.id, action: 'property.create.mock', entity_type: 'property', entity_id: created.id, after_data: created });
      return created;
    }
    const createData: Prisma.PropertyUncheckedCreateInput = { ...data, metadata: data.metadata as Prisma.InputJsonValue };
    const created = await this.prisma.property.create({ data: createData });
    await this.audit.record({ actor_user_id: user.id, action: 'property.create', entity_type: 'property', entity_id: created.id, after_data: created });
    await this.events.publish('PROPERTY.CREATED', created, { actor_user_id: user.id, project_id: created.project_id, entity_type: 'property', entity_id: created.id });
    return created;
  }

  @Patch('properties/:id')
  @RequirePermission('property.edit')
  async updateProperty(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) {
      const before = mockProperties.find((property) => property.id === id) ?? mockProperties[0];
      const after = { ...before, ...body, updated_at: new Date() };
      await this.audit.record({ actor_user_id: user.id, action: before.status !== after.status ? 'property.change_status.mock' : 'property.update.mock', entity_type: 'property', entity_id: id, before_data: before, after_data: after });
      return after;
    }
    const before = await this.prisma.property.findUniqueOrThrow({ where: { id } });
    const after = await this.prisma.property.update({ where: { id }, data: body });
    await this.audit.record({ actor_user_id: user.id, action: before.status !== after.status ? 'property.change_status' : 'property.update', entity_type: 'property', entity_id: id, before_data: before, after_data: after });
    await this.events.publish(after.status === 'HELD' ? 'PROPERTY.HELD' : after.status === 'RESERVED' ? 'PROPERTY.RESERVED' : 'PROPERTY.UPDATED', after, { actor_user_id: user.id, project_id: after.project_id, entity_type: 'property', entity_id: id });
    return after;
  }

  @Get('customer-properties') @RequirePermission('customer_property.view') customerProperties() { if (this.prisma.mockMode) return mockCustomerProperties; return this.prisma.customerProperty.findMany({ include: { customer: { include: { profile: true } }, property: true } }); }
  @Post('customer-properties') @RequirePermission('customer_property.manage') async linkCustomerProperty(@Body() body: any, @CurrentUser() user: AuthUser) { if (this.prisma.mockMode) { const cp = { id: `mock-customer-property-${Date.now()}`, created_at: new Date(), updated_at: new Date(), ...body }; await this.audit.record({ actor_user_id: user.id, action: 'customer_property.create.mock', entity_type: 'customer_property', entity_id: cp.id, after_data: cp }); return cp; } const cp = await this.prisma.customerProperty.create({ data: body }); await this.audit.record({ actor_user_id: user.id, action: 'customer_property.create', entity_type: 'customer_property', entity_id: cp.id, after_data: cp }); await this.events.publish('CUSTOMER_PROPERTY.CREATED', cp, { actor_user_id: user.id, entity_type: 'customer_property', entity_id: cp.id }); return cp; }
  @Get('roles') @RequirePermission('role.view') roles() { if (this.prisma.mockMode) return mockRoles; return this.prisma.role.findMany({ include: { role_permissions: { include: { permission: true } } } }); }
  @Get('permissions') @RequirePermission('permission.view') permissions() { if (this.prisma.mockMode) return mockPermissions; return this.prisma.permission.findMany(); }
  @Get('integrations') @RequirePermission('integration.view') integrations() { if (this.prisma.mockMode) return mockIntegrations; return this.prisma.companyIntegration.findMany({ include: { company: true } }); }
  @Get('business-services') @RequirePermission('integration.view') businessServices() { return mockBusinessServices; }
  @Get('feature-flags') @RequirePermission('feature_flag.view') flags() { if (this.prisma.mockMode) return mockFeatureFlags; return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } }); }

  @Patch('feature-flags/:id')
  @RequirePermission('feature_flag.manage')
  async updateFlag(@Param('id') id: string, @Body() body: { enabled: boolean }, @CurrentUser() user: AuthUser) {
    if (this.prisma.mockMode) {
      const before = mockFeatureFlags.find((flag) => flag.id === id || flag.key === id) ?? mockFeatureFlags[0];
      const after = { ...before, enabled: body.enabled, updated_at: new Date() };
      await this.audit.record({ actor_user_id: user.id, action: 'feature_flag.update.mock', entity_type: 'feature_flag', entity_id: id, before_data: before, after_data: after });
      return after;
    }
    const before = await this.prisma.featureFlag.findUniqueOrThrow({ where: { id } });
    const after = await this.prisma.featureFlag.update({ where: { id }, data: { enabled: body.enabled } });
    await this.audit.record({ actor_user_id: user.id, action: 'feature_flag.update', entity_type: 'feature_flag', entity_id: id, before_data: before, after_data: after });
    return after;
  }

  @Get('audit-logs') @RequirePermission('audit.view') auditLogs() { if (this.prisma.mockMode) return mockAuditLogs; return this.prisma.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: 200 }); }
  @Get('system-settings') @RequirePermission('system_settings.view') settings() { if (this.prisma.mockMode) return mockSystemSettings; return this.prisma.systemSetting.findMany(); }
}
