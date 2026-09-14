import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const companies = [
  ['RHC', 'Rabino Holdings Corporation', 'RHC', 'Holding Company', 'Corporate parent and RHC Digital operator'],
  ['AMICA_CONDO', 'Amica Condominium Realty Corporation', 'AMICA', 'Real Estate', 'Property and resident services'],
  ['RHBC', 'Rabino Home Builders Corporation', 'RHBC', 'Construction', 'Construction and project information'],
  ['AMICA_WATER', 'Amica Water Co. Ltd.', 'AMICA WATER', 'Utilities', 'Utility services'],
  ['AMICA_MART', 'Amica Mart Trading Corporation', 'AMICA MART', 'Retail', 'Retail and future rewards'],
  ['RBAC', 'Rabino Broadcasting and Advertising Corporation', 'RBAC', 'Media', 'Communications and promotions'],
  ['RSSC', 'Rabino Security Services Corporation', 'RSSC', 'Security', 'Resident and security services'],
  ['COASTLINE', 'Coastline Food Corporation', 'COASTLINE', 'Commerce', 'Commerce and loyalty participation'],
];

const permissions = [
  'customer.view','customer.edit','company.view','company.manage','project.view','project.create','project.edit',
  'property.view','property.create','property.edit','property.change_status','customer_property.view','customer_property.manage',
  'role.view','role.manage','permission.view','permission.manage','integration.view','integration.manage','feature_flag.view',
  'feature_flag.manage','audit.view','user.view','user.manage','system_settings.view','system_settings.manage'
];

const roles = [
  'CUSTOMER','SALES_AGENT','SALES_MANAGER','FINANCE_STAFF','FINANCE_MANAGER','PROPERTY_ADMIN','DOCUMENT_OFFICER',
  'REWARDS_ADMIN','COMPLIANCE_OFFICER','DPO','AUDITOR','SYSTEM_ADMIN','SUPER_ADMIN'
];

const featureFlags: Record<string, boolean> = {
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
};

async function main() {
  for (const [company_code, legal_name, display_name, business_type, description] of companies) {
    await prisma.company.createMany({
      data: [{ company_code, legal_name, display_name, business_type, description, status: company_code === 'RHC' || company_code === 'AMICA_CONDO' ? 'ACTIVE' : 'PREPARED', integration_status: 'PREPARED' }],
      skipDuplicates: true,
    });
  }

  for (const code of permissions) {
    await prisma.permission.createMany({ data: [{ code, description: code }], skipDuplicates: true });
  }

  // PostgreSQL ON CONFLICT also honors the SQL-only global role partial index.
  // Apply all migrations before seeding; nullable compound Prisma upserts cannot target it.
  await prisma.role.createMany({
    data: roles.map((code) => ({ company_id: null, code, name: code.replaceAll('_', ' '), is_system: true })),
    skipDuplicates: true,
  });

  const superAdmin = await prisma.role.findFirstOrThrow({ where: { code: 'SUPER_ADMIN', company_id: null } });
  const allPermissions = await prisma.permission.findMany();
  for (const p of allPermissions) {
    await prisma.rolePermission.createMany({
      data: [{ role_id: superAdmin.id, permission_id: p.id }],
      skipDuplicates: true,
    });
  }

  const rolePermissions: Record<string, string[]> = {
    CUSTOMER: ['customer.view', 'customer.edit', 'company.view', 'project.view', 'property.view'],
    SALES_AGENT: ['customer.view', 'project.view', 'property.view', 'customer_property.view'],
    SALES_MANAGER: ['customer.view', 'customer.edit', 'project.view', 'property.view', 'property.edit', 'customer_property.view', 'customer_property.manage'],
    FINANCE_STAFF: ['customer.view', 'property.view', 'customer_property.view'],
    FINANCE_MANAGER: ['customer.view', 'customer.edit', 'property.view', 'customer_property.view'],
    PROPERTY_ADMIN: ['company.view', 'project.view', 'project.create', 'project.edit', 'property.view', 'property.create', 'property.edit', 'property.change_status', 'customer_property.view', 'customer_property.manage'],
    DOCUMENT_OFFICER: ['customer.view', 'customer.edit', 'customer_property.view'],
    REWARDS_ADMIN: ['customer.view', 'company.view', 'integration.view'],
    COMPLIANCE_OFFICER: ['customer.view', 'user.view', 'audit.view'],
    DPO: ['customer.view', 'customer.edit', 'audit.view'],
    AUDITOR: ['company.view', 'project.view', 'property.view', 'customer_property.view', 'role.view', 'permission.view', 'integration.view', 'feature_flag.view', 'audit.view', 'user.view', 'system_settings.view'],
    SYSTEM_ADMIN: ['company.view', 'project.view', 'property.view', 'role.view', 'permission.view', 'integration.view', 'integration.manage', 'feature_flag.view', 'feature_flag.manage', 'user.view', 'user.manage', 'system_settings.view', 'system_settings.manage'],
  };
  for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findFirstOrThrow({ where: { code: roleCode, company_id: null } });
    const granted = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
    await prisma.rolePermission.createMany({ data: granted.map((permission) => ({ role_id: role.id, permission_id: permission.id })), skipDuplicates: true });
  }

  for (const [key, enabled] of Object.entries(featureFlags)) {
    await prisma.featureFlag.createMany({ data: [{ key, enabled, description: `Month 1 flag ${key}` }], skipDuplicates: true });
  }

  if (process.env.SEED_SAMPLE_INVENTORY === 'true') await seedSampleInventory();

  const serviceSeeds = [
    ['AMICA_CONDO', 'PROPERTY_SERVICES', 'Property Services', 'PROPERTY', true, true, 'ACTIVE'],
    ['AMICA_WATER', 'WATER_ACCOUNT', 'Water Account', 'UTILITY', false, false, 'PREPARED'],
    ['AMICA_MART', 'RETAIL_REWARDS', 'Retail Rewards', 'RETAIL', true, false, 'PREPARED'],
    ['RSSC', 'RESIDENT_ACCESS', 'Resident Access', 'SECURITY', false, true, 'PREPARED'],
    ['RBAC', 'PROMOTIONAL_REWARDS', 'Promotional Rewards', 'MEDIA', true, false, 'PREPARED'],
    ['COASTLINE', 'LOYALTY_COMMERCE', 'Loyalty Commerce', 'COMMERCE', true, false, 'PREPARED'],
  ] as const;

  for (const [companyCode, service_code, service_name, service_type, rewards_eligible, requires_property, status] of serviceSeeds) {
    const company = await prisma.company.findUniqueOrThrow({ where: { company_code: companyCode } });
    await prisma.businessService.createMany({
      data: [{ company_id: company.id, service_code, service_name, service_type, rewards_eligible, requires_property, status, description: `${service_name} architecture foundation` }],
      skipDuplicates: true,
    });
  }

  await prisma.systemSetting.createMany({ data: [{ key: 'month_1_acceptance_state', value: { status: 'foundation_seeded' }, description: 'Month 1 acceptance marker' }], skipDuplicates: true });
}

async function seedSampleInventory() {
  const amica = await prisma.company.findUniqueOrThrow({ where: { company_code: 'AMICA_CONDO' } });
  await prisma.project.createMany({
    data: [{
      company_id: amica.id,
      project_code: 'AMICA-T1',
      project_name: 'Amica Residences Tower 1',
      description: 'Initial RHC Digital pilot property project',
      location: 'Philippines',
      status: 'ACTIVE',
    }],
    skipDuplicates: true,
  });
  const project = await prisma.project.findUniqueOrThrow({ where: { project_code: 'AMICA-T1' } });
  if (project.company_id !== amica.id) throw new Error('Sample project belongs to a different company');

  const sampleProperties = [
    ['AMICA-T1-RES-0501', 'Tower 1', '5', '501', 'RESIDENTIAL', 'AVAILABLE'],
    ['AMICA-T1-RES-0502', 'Tower 1', '5', '502', 'RESIDENTIAL', 'HELD'],
    ['AMICA-T1-COM-G01', 'Tower 1', 'G', 'C01', 'COMMERCIAL', 'AVAILABLE'],
    ['AMICA-T1-PARK-B1-001', 'Tower 1', 'B1', 'P001', 'PARKING', 'AVAILABLE'],
  ] as const;

  // Even explicit sample seeding must not reset live inventory statuses.
  await prisma.property.createMany({
    data: sampleProperties.map(([property_code, tower, floor, unit_number, asset_type, status]) => ({
      project_id: project.id, property_code, tower, floor, unit_number, asset_type, status, currency: 'PHP', metadata: { seeded: true },
    })),
    skipDuplicates: true,
  });
}

main()
  .catch(() => {
    // Prisma connection errors can include connection details; do not log the raw error.
    console.error('Database seed failed. Check connectivity, applied migrations, and seed prerequisites.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
