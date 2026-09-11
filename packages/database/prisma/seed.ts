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
    await prisma.company.upsert({
      where: { company_code },
      update: { legal_name, display_name, business_type, description },
      create: { company_code, legal_name, display_name, business_type, description, status: 'ACTIVE', integration_status: company_code === 'AMICA_CONDO' ? 'PREPARED' : 'PREPARED' },
    });
  }

  for (const code of permissions) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code, description: code } });
  }

  for (const code of roles) {
    await prisma.role.upsert({
      where: { company_id_code: { company_id: null as never, code } },
      update: {},
      create: { code, name: code.replaceAll('_', ' '), is_system: true },
    }).catch(async () => {
      const existing = await prisma.role.findFirst({ where: { company_id: null, code } });
      if (!existing) await prisma.role.create({ data: { code, name: code.replaceAll('_', ' '), is_system: true } });
    });
  }

  const superAdmin = await prisma.role.findFirstOrThrow({ where: { code: 'SUPER_ADMIN', company_id: null } });
  const allPermissions = await prisma.permission.findMany();
  for (const p of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { role_id_permission_id: { role_id: superAdmin.id, permission_id: p.id } },
      update: {},
      create: { role_id: superAdmin.id, permission_id: p.id },
    });
  }

  const customerRole = await prisma.role.findFirstOrThrow({ where: { code: 'CUSTOMER', company_id: null } });
  const customerPerms = await prisma.permission.findMany({ where: { code: { in: ['customer.view', 'customer.edit', 'company.view', 'project.view', 'property.view'] } } });
  for (const p of customerPerms) {
    await prisma.rolePermission.upsert({
      where: { role_id_permission_id: { role_id: customerRole.id, permission_id: p.id } },
      update: {},
      create: { role_id: customerRole.id, permission_id: p.id },
    });
  }

  for (const [key, enabled] of Object.entries(featureFlags)) {
    await prisma.featureFlag.upsert({ where: { key }, update: { enabled }, create: { key, enabled, description: `Month 1 flag ${key}` } });
  }

  const amica = await prisma.company.findUniqueOrThrow({ where: { company_code: 'AMICA_CONDO' } });
  const project = await prisma.project.upsert({
    where: { project_code: 'AMICA-T1' },
    update: { company_id: amica.id, project_name: 'Amica Residences Tower 1', status: 'ACTIVE' },
    create: {
      company_id: amica.id,
      project_code: 'AMICA-T1',
      project_name: 'Amica Residences Tower 1',
      description: 'Initial RHC Digital pilot property project',
      location: 'Philippines',
      status: 'ACTIVE',
    },
  });

  const sampleProperties = [
    ['AMICA-T1-RES-0501', 'Tower 1', '5', '501', 'RESIDENTIAL', 'AVAILABLE'],
    ['AMICA-T1-RES-0502', 'Tower 1', '5', '502', 'RESIDENTIAL', 'HELD'],
    ['AMICA-T1-COM-G01', 'Tower 1', 'G', 'C01', 'COMMERCIAL', 'AVAILABLE'],
    ['AMICA-T1-PARK-B1-001', 'Tower 1', 'B1', 'P001', 'PARKING', 'AVAILABLE'],
  ] as const;

  for (const [property_code, tower, floor, unit_number, asset_type, status] of sampleProperties) {
    await prisma.property.upsert({
      where: { property_code },
      update: { status },
      create: { project_id: project.id, property_code, tower, floor, unit_number, asset_type, status, currency: 'PHP', metadata: { seeded: true } },
    });
  }

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
    await prisma.businessService.upsert({
      where: { company_id_service_code: { company_id: company.id, service_code } },
      update: { status, rewards_eligible, requires_property },
      create: { company_id: company.id, service_code, service_name, service_type, rewards_eligible, requires_property, status, description: `${service_name} architecture foundation` },
    });
  }

  await prisma.systemSetting.upsert({ where: { key: 'month_1_acceptance_state' }, update: { value: { status: 'foundation_seeded' } }, create: { key: 'month_1_acceptance_state', value: { status: 'foundation_seeded' }, description: 'Month 1 acceptance marker' } });
}

main().finally(async () => prisma.$disconnect());
