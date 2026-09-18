import { PrismaClient } from '@prisma/client';

export type SeedDelegate = {
  findUnique(args: any): Promise<any>;
  findFirst(args: any): Promise<any>;
  create(args: any): Promise<any>;
  createMany(args: any): Promise<any>;
};

export type SeedDatabase = {
  company: SeedDelegate;
  project: SeedDelegate;
  property: SeedDelegate;
  permission: SeedDelegate;
  role: SeedDelegate;
  rolePermission: SeedDelegate;
  featureFlag: SeedDelegate;
  businessService: SeedDelegate;
  systemSetting: SeedDelegate;
};

export type SeedOptions = {
  sampleInventory?: boolean;
};

export class SeedConflictError extends Error {
  readonly code = 'SEED_CONFLICT';

  constructor(message: string) {
    super(message);
    this.name = 'SeedConflictError';
  }
}

export const PILOT_COMPANIES = [
  { company_code: 'RHC', legal_name: 'Rabino Holdings Corporation', display_name: 'RHC', business_type: 'Holding Company', description: 'Corporate parent and RHC Digital operator', status: 'ACTIVE' },
  { company_code: 'AMICA_CONDO', legal_name: 'Amica Condominium Realty Corporation', display_name: 'AMICA', business_type: 'Real Estate', description: 'Property and resident services', status: 'ACTIVE' },
  { company_code: 'RHBC', legal_name: 'Rabino Home Builders Corporation', display_name: 'RHBC', business_type: 'Construction', description: 'Construction and project information', status: 'PREPARED' },
  { company_code: 'AMICA_WATER', legal_name: 'Amica Water Co. Ltd.', display_name: 'AMICA WATER', business_type: 'Utilities', description: 'Utility services', status: 'PREPARED' },
  { company_code: 'AMICA_MART', legal_name: 'Amica Mart Trading Corporation', display_name: 'AMICA MART', business_type: 'Retail', description: 'Retail and future rewards', status: 'PREPARED' },
  { company_code: 'RBAC', legal_name: 'Rabino Broadcasting and Advertising Corporation', display_name: 'RBAC', business_type: 'Media', description: 'Communications and promotions', status: 'PREPARED' },
  { company_code: 'RSSC', legal_name: 'Rabino Security Services Corporation', display_name: 'RSSC', business_type: 'Security', description: 'Resident and security services', status: 'PREPARED' },
  { company_code: 'COASTLINE', legal_name: 'Coastline Food Corporation', display_name: 'COASTLINE', business_type: 'Commerce', description: 'Commerce and loyalty participation', status: 'PREPARED' },
] as const;

export const PERMISSION_CODES = [
  'customer.view', 'customer.edit', 'company.view', 'company.manage', 'project.view', 'project.create', 'project.edit',
  'property.view', 'property.create', 'property.edit', 'property.change_status', 'customer_property.view', 'customer_property.manage',
  'reservation.view', 'reservation.create', 'reservation.manage', 'reservation.cancel',
  'role.view', 'role.manage', 'permission.view', 'permission.manage', 'integration.view', 'integration.manage', 'feature_flag.view',
  'feature_flag.manage', 'audit.view', 'user.view', 'user.manage', 'system_settings.view', 'system_settings.manage',
] as const;

export const SYSTEM_ROLE_CODES = [
  'CUSTOMER', 'SALES_AGENT', 'SALES_MANAGER', 'FINANCE_STAFF', 'FINANCE_MANAGER', 'PROPERTY_ADMIN',
  'DOCUMENT_OFFICER', 'REWARDS_ADMIN', 'COMPLIANCE_OFFICER', 'DPO', 'AUDITOR', 'SYSTEM_ADMIN', 'SUPER_ADMIN',
] as const;

export const FEATURE_FLAG_DEFAULTS = {
  ENABLE_REGISTRATION: true,
  ENABLE_RHC_ID: true,
  ENABLE_PROPERTIES: true,
  ENABLE_COMPANY_DIRECTORY: true,
  ENABLE_INTEGRATION_FRAMEWORK: true,
  ENABLE_REWARDS: false,
  ENABLE_WALLET: false,
  ENABLE_MARKETPLACE: false,
  ENABLE_BLOCKCHAIN: false,
  ENABLE_EXTERNAL_WALLET: false,
  ENABLE_TOKEN: false,
  ENABLE_TOKEN_TRANSFER: false,
  ENABLE_TOKEN_SALE: false,
  ENABLE_CRYPTO_PAYMENT: false,
  ENABLE_STAKING: false,
} as const;

const rolePermissions: Record<string, readonly string[]> = {
  CUSTOMER: ['customer.view', 'customer.edit', 'company.view', 'project.view', 'property.view'],
  SALES_AGENT: ['customer.view', 'project.view', 'property.view', 'customer_property.view', 'reservation.view', 'reservation.create'],
  SALES_MANAGER: ['customer.view', 'customer.edit', 'project.view', 'property.view', 'property.edit', 'customer_property.view', 'customer_property.manage', 'reservation.view', 'reservation.create', 'reservation.manage', 'reservation.cancel'],
  FINANCE_STAFF: ['customer.view', 'property.view', 'customer_property.view', 'reservation.view'],
  FINANCE_MANAGER: ['customer.view', 'customer.edit', 'property.view', 'customer_property.view', 'reservation.view', 'reservation.manage'],
  PROPERTY_ADMIN: ['company.view', 'project.view', 'project.create', 'project.edit', 'property.view', 'property.create', 'property.edit', 'property.change_status', 'customer_property.view', 'customer_property.manage', 'reservation.view', 'reservation.create', 'reservation.manage', 'reservation.cancel'],
  DOCUMENT_OFFICER: ['customer.view', 'customer.edit', 'customer_property.view'],
  REWARDS_ADMIN: ['customer.view', 'company.view', 'integration.view'],
  COMPLIANCE_OFFICER: ['customer.view', 'user.view', 'audit.view'],
  DPO: ['customer.view', 'customer.edit', 'audit.view'],
  AUDITOR: ['company.view', 'project.view', 'property.view', 'customer_property.view', 'reservation.view', 'role.view', 'permission.view', 'integration.view', 'feature_flag.view', 'audit.view', 'user.view', 'system_settings.view'],
  SYSTEM_ADMIN: ['company.view', 'project.view', 'property.view', 'reservation.view', 'role.view', 'permission.view', 'integration.view', 'integration.manage', 'feature_flag.view', 'feature_flag.manage', 'user.view', 'user.manage', 'system_settings.view', 'system_settings.manage'],
  SUPER_ADMIN: [...PERMISSION_CODES],
};

const pilotProject = {
  project_code: 'AMICA-T1',
  project_name: 'Amica Residences Tower 1',
  description: 'Initial RHC Digital pilot property project',
  location: 'Philippines',
  status: 'ACTIVE',
} as const;

const sampleProperties = [
  { property_code: 'AMICA-T1-RES-0501', tower: 'Tower 1', floor: '5', unit_number: '501', asset_type: 'RESIDENTIAL', status: 'AVAILABLE' },
  { property_code: 'AMICA-T1-RES-0502', tower: 'Tower 1', floor: '5', unit_number: '502', asset_type: 'RESIDENTIAL', status: 'HELD' },
  { property_code: 'AMICA-T1-COM-G01', tower: 'Tower 1', floor: 'G', unit_number: 'C01', asset_type: 'COMMERCIAL', status: 'AVAILABLE' },
  { property_code: 'AMICA-T1-PARK-B1-001', tower: 'Tower 1', floor: 'B1', unit_number: 'P001', asset_type: 'PARKING', status: 'AVAILABLE' },
] as const;

const serviceSeeds = [
  { company_code: 'AMICA_CONDO', service_code: 'PROPERTY_SERVICES', service_name: 'Property Services', service_type: 'PROPERTY', rewards_eligible: true, requires_property: true, status: 'ACTIVE' },
  { company_code: 'AMICA_WATER', service_code: 'WATER_ACCOUNT', service_name: 'Water Account', service_type: 'UTILITY', rewards_eligible: false, requires_property: false, status: 'PREPARED' },
  { company_code: 'AMICA_MART', service_code: 'RETAIL_REWARDS', service_name: 'Retail Rewards', service_type: 'RETAIL', rewards_eligible: true, requires_property: false, status: 'PREPARED' },
  { company_code: 'RSSC', service_code: 'RESIDENT_ACCESS', service_name: 'Resident Access', service_type: 'SECURITY', rewards_eligible: false, requires_property: true, status: 'PREPARED' },
  { company_code: 'RBAC', service_code: 'PROMOTIONAL_REWARDS', service_name: 'Promotional Rewards', service_type: 'MEDIA', rewards_eligible: true, requires_property: false, status: 'PREPARED' },
  { company_code: 'COASTLINE', service_code: 'LOYALTY_COMMERCE', service_name: 'Loyalty Commerce', service_type: 'COMMERCE', rewards_eligible: true, requires_property: false, status: 'PREPARED' },
] as const;

type SeedRow = { id: string; company_id?: string | null; project_id?: string | null; project_code?: string };

async function ensureCompanies(db: SeedDatabase): Promise<Map<string, SeedRow>> {
  const result = new Map<string, SeedRow>();
  for (const definition of PILOT_COMPANIES) {
    const existing = await db.company.findUnique({ where: { company_code: definition.company_code } });
    const company = existing ?? await db.company.create({ data: {
      ...definition,
      integration_status: 'PREPARED',
      api_enabled: false,
      rewards_enabled: false,
    } });
    result.set(definition.company_code, company);
  }
  return result;
}

async function ensurePilotProject(db: SeedDatabase, company: SeedRow): Promise<SeedRow> {
  const existing = await db.project.findUnique({ where: { project_code: pilotProject.project_code } });
  if (existing) {
    if (existing.company_id !== company.id) throw new SeedConflictError('AMICA-T1 already belongs to a different company; manual reconciliation is required');
    return existing;
  }
  return db.project.create({ data: { ...pilotProject, company_id: company.id } });
}

async function ensurePermissions(db: SeedDatabase): Promise<Map<string, SeedRow>> {
  const result = new Map<string, SeedRow>();
  for (const code of PERMISSION_CODES) {
    const existing = await db.permission.findUnique({ where: { code } });
    const permission = existing ?? await db.permission.create({ data: { code, description: code } });
    result.set(code, permission);
  }
  return result;
}

async function ensureRoles(db: SeedDatabase, permissions: Map<string, SeedRow>): Promise<void> {
  for (const code of SYSTEM_ROLE_CODES) {
    const existing = await db.role.findFirst({ where: { code, company_id: null } });
    if (existing) continue;
    const role = await db.role.create({ data: { company_id: null, code, name: code.replaceAll('_', ' '), is_system: true } });
    const codes = rolePermissions[code] ?? [];
    const data = codes.map((permissionCode) => {
      const permission = permissions.get(permissionCode);
      if (!permission) throw new SeedConflictError(`Permission definition missing for role ${code}`);
      return { role_id: role.id, permission_id: permission.id };
    });
    if (data.length) await db.rolePermission.createMany({ data });
  }
}

async function ensureFeatureFlags(db: SeedDatabase): Promise<void> {
  for (const [key, enabled] of Object.entries(FEATURE_FLAG_DEFAULTS)) {
    const existing = await db.featureFlag.findUnique({ where: { key } });
    if (!existing) await db.featureFlag.create({ data: { key, enabled, description: `Month 1 flag ${key}`, scope: 'GLOBAL' } });
  }
}

async function ensureOptionalSampleInventory(db: SeedDatabase, project: SeedRow): Promise<number> {
  let created = 0;
  for (const property of sampleProperties) {
    const existing = await db.property.findUnique({ where: { property_code: property.property_code } });
    if (existing) {
      if (existing.project_id !== project.id) throw new SeedConflictError(`Synthetic property ${property.property_code} belongs to a different project; manual reconciliation is required`);
      continue;
    }
    await db.property.create({ data: {
      ...property,
      project_id: project.id,
      currency: 'PHP',
      metadata: { seeded: true, provenance: 'synthetic-sample' },
    } });
    created += 1;
  }
  return created;
}

async function ensureBusinessServices(db: SeedDatabase, companies: Map<string, SeedRow>): Promise<void> {
  for (const service of serviceSeeds) {
    const company = companies.get(service.company_code);
    if (!company) throw new SeedConflictError(`Company definition missing for service ${service.service_code}`);
    const where = { company_id_service_code: { company_id: company.id, service_code: service.service_code } };
    const existing = await db.businessService.findUnique({ where });
    if (existing) continue;
    await db.businessService.create({ data: {
      company_id: company.id,
      service_code: service.service_code,
      service_name: service.service_name,
      service_type: service.service_type,
      rewards_eligible: service.rewards_eligible,
      wallet_eligible: false,
      requires_property: service.requires_property,
      status: service.status,
      integration_status: 'PREPARED',
      description: `${service.service_name} architecture foundation`,
    } });
  }
}

async function ensureSystemSettings(db: SeedDatabase): Promise<void> {
  const key = 'month_1_acceptance_state';
  const existing = await db.systemSetting.findUnique({ where: { key } });
  if (!existing) await db.systemSetting.create({ data: { key, value: { status: 'foundation_seeded' }, description: 'Month 1 acceptance marker' } });
}

export async function runSeed(db: SeedDatabase, options: SeedOptions = {}) {
  const companies = await ensureCompanies(db);
  const amica = companies.get('AMICA_CONDO');
  if (!amica) throw new SeedConflictError('AMICA_CONDO company definition is missing');
  const project = await ensurePilotProject(db, amica);
  const permissions = await ensurePermissions(db);
  await ensureRoles(db, permissions);
  await ensureFeatureFlags(db);
  const samplePropertyCount = options.sampleInventory === true ? await ensureOptionalSampleInventory(db, project) : 0;
  await ensureBusinessServices(db, companies);
  await ensureSystemSettings(db);
  return { companyCount: companies.size, projectCode: project.project_code, samplePropertyCount };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction((tx) => runSeed(tx as unknown as SeedDatabase, { sampleInventory: process.env.SEED_SAMPLE_INVENTORY === 'true' }));
  } catch {
    // Prisma connection errors can include connection details; do not log the raw error.
    console.error('Database seed failed. Check connectivity, applied migrations, and seed prerequisites.');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
