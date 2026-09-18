import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { listQuery, propertyQuery, uuid } from '../../platform/dto';
import { RequireFeature } from '../security/feature.guard';

function decodeRhcVerificationToken(token: string) {
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(token)) return null;
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(token.length / 4) * 4, '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8').trim().toUpperCase();
    return /^RHC-\d{4}-\d{8}$/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function maskName(first?: string | null, last?: string | null) {
  const safeFirst = first?.trim();
  const safeLast = last?.trim();
  if (!safeFirst && !safeLast) return 'RHC customer';
  const maskedLast = safeLast ? `${safeLast[0]}${'•'.repeat(Math.max(safeLast.length - 1, 1))}` : '';
  return [safeFirst, maskedLast].filter(Boolean).join(' ');
}

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

  @Get('properties') @RequireFeature('ENABLE_PROPERTIES')
  properties(@Query() query: unknown) {
    const q = propertyQuery.parse(query);
    return this.prisma.property.findMany({
      where: {
        project: { id: q.project_id, company_id: q.company_id, status: 'ACTIVE', company: { status: 'ACTIVE' } },
        status: q.status,
        asset_type: q.asset_type,
        ...(q.q ? { property_code: { contains: q.q, mode: 'insensitive' as const } } : {}),
      },
      select: { id: true, property_code: true, tower: true, floor: true, unit_number: true, asset_type: true, area: true, list_price: true, currency: true, status: true, metadata: true, project: { select: { id: true, project_code: true, project_name: true, company: { select: { company_code: true, display_name: true } } } } },
      orderBy: [{ property_code: 'asc' }, { id: 'asc' }],
      take: q.take,
      skip: q.skip,
    });
  }

  @Get('verify/rhc-id/:token')
  async verifyRhcId(@Param('token') token: string) {
    const rhcId = decodeRhcVerificationToken(token);
    if (!rhcId) return { valid: false, status: 'INVALID', message: 'RHC Digital ID verification token is invalid.' };
    const profile = await this.prisma.userProfile.findUnique({
      where: { rhc_id: rhcId },
      select: {
        rhc_id: true,
        rhc_id_issued_at: true,
        verification_status: true,
        account_status: true,
        first_name: true,
        last_name: true,
      },
    });
    if (!profile) return { valid: false, status: 'INVALID', rhc_id: rhcId, message: 'RHC Digital ID was not found.' };
    const valid = profile.account_status === 'ACTIVE' && profile.verification_status === 'VERIFIED';
    return {
      valid,
      status: valid ? 'VALID' : profile.account_status === 'DISABLED' || profile.account_status === 'LOCKED' ? 'REVOKED' : 'INACTIVE',
      rhc_id: profile.rhc_id,
      display_name: maskName(profile.first_name, profile.last_name),
      verification_status: profile.verification_status,
      issued_at: profile.rhc_id_issued_at,
    };
  }

  @Get('properties/:id') @RequireFeature('ENABLE_PROPERTIES')
  async property(@Param('id') rawId: string) {
    const id = uuid.parse(rawId);
    const property = await this.prisma.property.findFirst({
      where: { id, status: 'AVAILABLE', project: { status: 'ACTIVE', company: { status: 'ACTIVE' } } },
      select: {
        id: true,
        property_code: true,
        tower: true,
        floor: true,
        unit_number: true,
        asset_type: true,
        area: true,
        list_price: true,
        currency: true,
        status: true,
        metadata: true,
        project: {
          select: {
            id: true,
            project_code: true,
            project_name: true,
            company: { select: { company_code: true, display_name: true } },
          },
        },
      },
    });
    if (!property) throw new NotFoundException('Resource not found');
    return property;
  }
}
