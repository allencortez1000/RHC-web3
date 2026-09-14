import { Body, CanActivate, Controller, ExecutionContext, Get, Header, Injectable, Param, Post, Query, Req, SetMetadata, UseGuards, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../platform/prisma.service';
import { apiClientCreate, emptyBody, listQuery } from '../../platform/dto';
import { AuthGuard } from './auth.guard';
import { CurrentUser, AuthUser } from './auth-user.decorator';
import { Authorization, Authorized, RequirePermission } from './permission.decorator';
import { PermissionGuard } from './permission.guard';
import { RequireFeature } from './feature.guard';
import { RateLimit, RateLimitStore } from './rate-limit.guard';
import { RbacService } from './rbac.service';
import { apiClientSelect, CompanyApiKeyService, CompanyPrincipal } from './company-api-key.service';

@Controller('admin/api-clients')
@UseGuards(AuthGuard, PermissionGuard)
@RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
@RateLimit(10)
export class ApiClientsController {
  constructor(private readonly prisma: PrismaService, private readonly keys: CompanyApiKeyService, private readonly rbac: RbacService) {}
  @Get() @RequirePermission('integration.view', { list: 'integration' })
  list(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = listQuery.omit({ project_id: true }).parse(query);
    return this.prisma.companyApiClient.findMany({ where: { company: this.rbac.companyWhere(access.grants), company_id: q.company_id }, select: apiClientSelect, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }
  @Post() @RequirePermission('integration.manage', { target: 'body-company' }) @Header('Cache-Control', 'no-store')
  issue(@Body() body: unknown, @CurrentUser() user: AuthUser) { return this.keys.issue(apiClientCreate.parse(body), user.id); }
  @Post(':id/rotate') @RequirePermission('integration.manage', { target: 'api-client' }) @Header('Cache-Control', 'no-store')
  rotate(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) { emptyBody.parse(body ?? {}); return this.keys.rotate(id, user.id); }
  // Emergency revocation remains available even when the integration kill switch is off.
  @Post(':id/revoke') @RequirePermission('integration.manage', { target: 'api-client' }) @RequireFeature(null)
  revoke(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) { emptyBody.parse(body ?? {}); return this.keys.revoke(id, user.id); }
}

const API_SCOPE = 'company_api_scope';
export const RequireApiScope = (scope: string) => SetMetadata(API_SCOPE, scope);
@Injectable()
export class CompanyApiGuard implements CanActivate {
  constructor(private readonly keys: CompanyApiKeyService, private readonly reflector: Reflector, private readonly rateLimits: RateLimitStore) {}
  async canActivate(context: ExecutionContext) {
    const scope = this.reflector.get<string>(API_SCOPE, context.getHandler());
    if (!scope) throw new ForbiddenException();
    const req = context.switchToHttp().getRequest<{ headers: Record<string, unknown>; companyPrincipal?: CompanyPrincipal }>();
    req.companyPrincipal = await this.keys.authenticate(req.headers['x-api-key'], scope);
    await this.rateLimits.consumeAuthenticated(context, { kind: 'client', id: req.companyPrincipal.client_id });
    return true;
  }
}

// These machine directory routes are read-only. Machine credentials never become AuthUser/JWT sessions.
@Controller('company-api')
@UseGuards(CompanyApiGuard)
@RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
@RateLimit(60)
export class CompanyApiController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('company') @SetMetadata(API_SCOPE, 'company.read')
  company(@Req() req: { companyPrincipal: CompanyPrincipal }, @Query() query: unknown) {
    emptyBody.parse(query);
    return this.prisma.company.findUniqueOrThrow({ where: { id: req.companyPrincipal.company_id }, select: { id: true, company_code: true, display_name: true, status: true } });
  }
  @Get('projects') @SetMetadata(API_SCOPE, 'projects.read') @RequireFeature('ENABLE_PROPERTIES')
  projects(@Req() req: { companyPrincipal: CompanyPrincipal }, @Query() query: unknown) {
    const q = listQuery.omit({ company_id: true }).parse(query);
    return this.prisma.project.findMany({ where: { company_id: req.companyPrincipal.company_id, id: q.project_id }, select: { id: true, project_code: true, project_name: true, status: true }, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }
  @Get('properties') @SetMetadata(API_SCOPE, 'properties.read') @RequireFeature('ENABLE_PROPERTIES')
  properties(@Req() req: { companyPrincipal: CompanyPrincipal }, @Query() query: unknown) {
    const q = listQuery.omit({ company_id: true }).parse(query);
    return this.prisma.property.findMany({ where: { project: { company_id: req.companyPrincipal.company_id }, project_id: q.project_id }, select: { id: true, project_id: true, property_code: true, asset_type: true, status: true }, take: q.take, skip: q.skip, orderBy: { id: 'asc' } });
  }
}
