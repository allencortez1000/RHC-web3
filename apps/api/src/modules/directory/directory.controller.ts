import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { mockBusinessServices, mockCompanies, mockProjects, mockProperties } from '../../platform/mock-data';

@Controller()
export class DirectoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('companies')
  companies() {
    if (this.prisma.mockMode) {
      return mockCompanies.map(({ id, company_code, display_name, description, business_type, status, integration_status, rewards_enabled, digital_services_enabled }) => ({
        id,
        company_code,
        display_name,
        description,
        business_type,
        status,
        integration_status,
        rewards_enabled,
        digital_services_enabled,
      }));
    }
    return this.prisma.company.findMany({ where: { status: { in: ['ACTIVE', 'PREPARED'] } }, orderBy: { company_code: 'asc' }, select: { id: true, company_code: true, display_name: true, description: true, business_type: true, status: true, integration_status: true, rewards_enabled: true, digital_services_enabled: true } });
  }

  @Get('business-services')
  services() {
    if (this.prisma.mockMode) return mockBusinessServices;
    return this.prisma.businessService.findMany({ include: { company: { select: { company_code: true, display_name: true } } }, orderBy: { service_code: 'asc' } });
  }

  @Get('projects')
  projects() {
    if (this.prisma.mockMode) return mockProjects;
    return this.prisma.project.findMany({ include: { company: { select: { company_code: true, display_name: true } } } });
  }

  @Get('properties/:id')
  property(@Param('id') id: string) {
    if (this.prisma.mockMode) return mockProperties.find((property) => property.id === id || property.property_code === id) ?? null;
    return this.prisma.property.findUnique({ where: { id }, include: { project: { include: { company: true } } } });
  }
}
