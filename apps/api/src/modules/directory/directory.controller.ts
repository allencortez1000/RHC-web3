import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { listQuery, uuid } from '../../platform/dto';
import { RequireFeature } from '../security/feature.guard';

const publicCompany = { id: true, company_code: true, display_name: true, description: true, business_type: true, status: true, integration_status: true, rewards_enabled: true, digital_services_enabled: true } as const;

@Controller()
export class DirectoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('companies') @RequireFeature('ENABLE_COMPANY_DIRECTORY')
  companies(@Query() query: unknown) {
    const q = listQuery.omit({ project_id: true }).parse(query);
    return this.prisma.company.findMany({ where: { id: q.company_id, status: { in: ['ACTIVE', 'PREPARED'] } }, orderBy: { company_code: 'asc' }, select: publicCompany, take: q.take, skip: q.skip });
  }

  @Get('business-services') @RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
  services(@Query() query: unknown) {
    const q = listQuery.omit({ project_id: true }).parse(query);
    return this.prisma.businessService.findMany({ where: { company_id: q.company_id, status: { in: ['ACTIVE', 'PREPARED', 'COMING_SOON'] }, company: { status: { in: ['ACTIVE', 'PREPARED'] }, digital_services_enabled: true } }, select: { id: true, service_code: true, service_name: true, service_type: true, description: true, status: true, company: { select: { company_code: true, display_name: true } } }, orderBy: { service_code: 'asc' }, take: q.take, skip: q.skip });
  }

  @Get('projects') @RequireFeature('ENABLE_PROPERTIES')
  projects(@Query() query: unknown) {
    const q = listQuery.parse(query);
    return this.prisma.project.findMany({ where: { id: q.project_id, company_id: q.company_id, status: 'ACTIVE', company: { status: 'ACTIVE' } }, select: { id: true, project_code: true, project_name: true, description: true, location: true, status: true, company: { select: { company_code: true, display_name: true } } }, orderBy: { id: 'asc' }, take: q.take, skip: q.skip });
  }

  @Get('properties/:id') @RequireFeature('ENABLE_PROPERTIES')
  async property(@Param('id') rawId: string) {
    const id = uuid.parse(rawId);
    const property = await this.prisma.property.findFirst({ where: { id, status: 'AVAILABLE', project: { status: 'ACTIVE', company: { status: 'ACTIVE' } } }, select: { id: true, property_code: true, tower: true, floor: true, unit_number: true, asset_type: true, area: true, list_price: true, currency: true, status: true, project: { select: { id: true, project_name: true, company: { select: { company_code: true, display_name: true } } } } } });
    if (!property) throw new NotFoundException('Resource not found');
    return property;
  }
}
