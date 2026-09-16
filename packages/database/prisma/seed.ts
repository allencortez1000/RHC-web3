import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaClient, type Prisma } from '@prisma/client';

function loadLocalEnvFiles() {
  for (const path of [resolve(__dirname, '../../../.env'), resolve(__dirname, '../../../apps/api/.env')]) {
    try {
      process.loadEnvFile(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') continue;
      throw new Error('Unable to load optional environment file');
    }
  }
}

loadLocalEnvFiles();
const prisma = new PrismaClient();
const demoCorrelationId = 'demo-month1-rhc-web3';
const demoNow = new Date('2026-09-16T09:00:00.000Z');

function stableUuid(seed: string) {
  const hash = createHash('sha256').update(`rhc-month1-demo:${seed}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
}

function dateOffset(days: number, hours = 0, minutes = 0) {
  const date = new Date(demoNow);
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}

function assertSafeSeedEnvironment() {
  const marker = [process.env.NODE_ENV, process.env.APP_ENV, process.env.RHC_ENV, process.env.VERCEL_ENV]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (marker.includes('production') || marker.includes('prod')) {
    throw new Error('Refusing to seed demo data in a production environment.');
  }
}

const companies = [
  ['RHC', 'Rabino Holdings Corporation', 'Rabino Holdings Corporation', 'HOLDING_COMPANY', 'Parent organization used for the RHC Digital & Web3 Ecosystem demonstration environment.', 'ACTIVE'],
  ['AMICA', 'Amica', 'Amica', 'REAL_ESTATE', 'Demo real estate business unit for Month 1 property and reservation workflows.', 'ACTIVE'],
  ['RHBC', 'Rabino Home Builders Corporation', 'Rabino Home Builders Corporation', 'CONSTRUCTION', 'Future construction integration business unit for the RHC ecosystem.', 'ACTIVE'],
  ['AMICA-WATER', 'Amica Water', 'Amica Water', 'UTILITY', 'Future utility integration business unit for resident services.', 'ACTIVE'],
  ['AMICA-MART', 'Amica Mart', 'Amica Mart', 'RETAIL', 'Future retail and rewards integration business unit.', 'ACTIVE'],
  ['RSSC', 'Rabino Security Services', 'Rabino Security Services', 'SECURITY', 'Future security and resident access integration business unit.', 'ACTIVE'],
  // Legacy Month 1 aliases retained so older routes and tests keep working.
  ['AMICA_CONDO', 'Amica Condominium Realty Corporation', 'AMICA', 'REAL_ESTATE', 'Legacy Month 1 Amica company code retained for compatibility.', 'ACTIVE'],
  ['AMICA_WATER', 'Amica Water Co. Ltd.', 'AMICA WATER', 'UTILITY', 'Legacy compatibility company code.', 'PREPARED'],
  ['AMICA_MART', 'Amica Mart Trading Corporation', 'AMICA MART', 'RETAIL', 'Legacy compatibility company code.', 'PREPARED'],
  ['RBAC', 'Rabino Broadcasting and Advertising Corporation', 'RBAC', 'MEDIA', 'Future communications and promotions integration.', 'PREPARED'],
  ['COASTLINE', 'Coastline Food Corporation', 'COASTLINE', 'COMMERCE', 'Future loyalty commerce integration.', 'PREPARED'],
] as const;

const permissionCodes = [
  'customer.view', 'customer.edit', 'company.view', 'company.manage', 'project.view', 'project.create', 'project.edit',
  'property.view', 'property.create', 'property.edit', 'property.change_status', 'customer_property.view', 'customer_property.manage',
  'reservation.view', 'reservation.create', 'reservation.manage', 'reservation.cancel',
  'role.view', 'role.manage', 'permission.view', 'permission.manage', 'integration.view', 'integration.manage', 'feature_flag.view',
  'feature_flag.manage', 'audit.view', 'user.view', 'user.manage', 'system_settings.view', 'system_settings.manage',
  // Demo/business-language aliases. The API uses the *.view/*.edit codes above.
  'customer.read', 'project.read', 'project.manage', 'property.read', 'property.manage', 'property.override', 'reservation.read',
  'digital_id.read', 'audit.read', 'role.manage', 'system.manage',
];

const rolePermissionMap: Record<string, string[]> = {
  CUSTOMER: ['customer.view', 'customer.edit', 'company.view', 'project.view', 'property.view', 'reservation.create', 'reservation.view'],
  SALES_AGENT: ['customer.view', 'project.view', 'property.view', 'customer_property.view', 'reservation.view', 'reservation.create'],
  SALES_MANAGER: ['customer.view', 'customer.edit', 'project.view', 'property.view', 'property.edit', 'customer_property.view', 'customer_property.manage', 'reservation.view', 'reservation.create', 'reservation.manage', 'reservation.cancel'],
  FINANCE_STAFF: ['customer.view', 'property.view', 'customer_property.view', 'reservation.view'],
  FINANCE_MANAGER: ['customer.view', 'customer.edit', 'property.view', 'customer_property.view', 'reservation.view', 'reservation.manage'],
  PROPERTY_ADMIN: ['company.view', 'project.view', 'project.create', 'project.edit', 'property.view', 'property.create', 'property.edit', 'property.change_status', 'customer_property.view', 'customer_property.manage', 'reservation.view', 'reservation.create', 'reservation.manage', 'reservation.cancel'],
  DOCUMENT_OFFICER: ['customer.view', 'customer.edit', 'customer_property.view'],
  REWARDS_ADMIN: ['customer.view', 'company.view', 'integration.view'],
  COMPLIANCE_OFFICER: ['customer.view', 'user.view', 'audit.view', 'digital_id.read'],
  DPO: ['customer.view', 'customer.edit', 'audit.view'],
  AUDITOR: ['company.view', 'project.view', 'property.view', 'customer_property.view', 'reservation.view', 'role.view', 'permission.view', 'integration.view', 'feature_flag.view', 'audit.view', 'user.view', 'system_settings.view'],
  SYSTEM_ADMIN: ['company.view', 'project.view', 'property.view', 'role.view', 'role.manage', 'permission.view', 'integration.view', 'integration.manage', 'feature_flag.view', 'feature_flag.manage', 'user.view', 'user.manage', 'system_settings.view', 'system_settings.manage'],
  SUPER_ADMIN: permissionCodes,
  SUPER_ADMINISTRATOR: permissionCodes,
  SYSTEM_ADMINISTRATOR: ['user.view', 'user.manage', 'role.view', 'role.manage', 'system_settings.view', 'system_settings.manage', 'project.view', 'property.view', 'reservation.view', 'audit.view'],
  AMICA_SALES: ['customer.view', 'project.view', 'property.view', 'reservation.view', 'reservation.create', 'reservation.manage', 'customer_property.view'],
  AMICA_FINANCE: ['customer.view', 'property.view', 'reservation.view', 'customer_property.view'],
  PROPERTY_ADMINISTRATOR: ['project.view', 'project.create', 'project.edit', 'property.view', 'property.create', 'property.edit', 'property.change_status', 'reservation.view', 'reservation.manage', 'customer_property.view', 'customer_property.manage'],
  INTERNAL_AUDITOR: ['customer.view', 'project.view', 'property.view', 'reservation.view', 'audit.view'],
};

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

type CustomerSeed = {
  index: number;
  rhcId: string;
  first: string;
  middle: string;
  last: string;
  email: string;
  mobile: string;
  account: 'ACTIVE' | 'PENDING' | 'DISABLED' | 'LOCKED' | 'INACTIVE';
  verification: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  customerType: string;
  city: string;
  province: string;
};

const customers: CustomerSeed[] = [
  { index: 1, rhcId: 'RHC-2026-000001', first: 'Miguel', middle: 'Santos', last: 'Reyes', email: 'miguel.reyes@example.com', mobile: '09170000001', account: 'ACTIVE', verification: 'VERIFIED', customerType: 'PROPERTY_BUYER', city: 'Angeles City', province: 'Pampanga' },
  { index: 2, rhcId: 'RHC-2026-000002', first: 'Angela', middle: 'Cruz', last: 'Santos', email: 'angela.santos@example.com', mobile: '09170000002', account: 'ACTIVE', verification: 'VERIFIED', customerType: 'PROPERTY_BUYER', city: 'San Fernando', province: 'Pampanga' },
  { index: 3, rhcId: 'RHC-2026-000003', first: 'Paolo', middle: 'Garcia', last: 'Mendoza', email: 'paolo.mendoza@example.com', mobile: '09170000003', account: 'ACTIVE', verification: 'VERIFIED', customerType: 'PROPERTY_BUYER', city: 'Mabalacat City', province: 'Pampanga' },
  { index: 4, rhcId: 'RHC-2026-000004', first: 'Sofia', middle: 'Lim', last: 'Navarro', email: 'sofia.navarro@example.com', mobile: '09170000004', account: 'ACTIVE', verification: 'PENDING', customerType: 'PROSPECT', city: 'Tarlac City', province: 'Tarlac' },
  { index: 5, rhcId: 'RHC-2026-000005', first: 'Daniel', middle: 'Torres', last: 'Villanueva', email: 'daniel.villanueva@example.com', mobile: '09170000005', account: 'ACTIVE', verification: 'VERIFIED', customerType: 'PROPERTY_OWNER', city: 'Quezon City', province: 'Metro Manila' },
  { index: 6, rhcId: 'RHC-2026-000006', first: 'Isabella', middle: 'Dizon', last: 'Aquino', email: 'customer06@example.com', mobile: '09170000006', account: 'ACTIVE', verification: 'VERIFIED', customerType: 'PROPERTY_BUYER', city: 'Angeles City', province: 'Pampanga' },
  { index: 7, rhcId: 'RHC-2026-000007', first: 'Marco', middle: 'Rivera', last: 'Bautista', email: 'customer07@example.com', mobile: '09170000007', account: 'ACTIVE', verification: 'PENDING', customerType: 'PROSPECT', city: 'San Fernando', province: 'Pampanga' },
  { index: 8, rhcId: 'RHC-2026-000008', first: 'Camille', middle: 'Ocampo', last: 'Flores', email: 'customer08@example.com', mobile: '09170000008', account: 'ACTIVE', verification: 'REJECTED', customerType: 'PROSPECT', city: 'Mabalacat City', province: 'Pampanga' },
  { index: 9, rhcId: 'RHC-2026-000009', first: 'Nathan', middle: 'Ramos', last: 'Castillo', email: 'customer09@example.com', mobile: '09170000009', account: 'INACTIVE', verification: 'UNVERIFIED', customerType: 'PROSPECT', city: 'Tarlac City', province: 'Tarlac' },
  { index: 10, rhcId: 'RHC-2026-000010', first: 'Alyssa', middle: 'Mercado', last: 'Domingo', email: 'customer10@example.com', mobile: '09170000010', account: 'ACTIVE', verification: 'VERIFIED', customerType: 'PROPERTY_BUYER', city: 'Quezon City', province: 'Metro Manila' },
  { index: 11, rhcId: 'RHC-2026-000011', first: 'Gabriel', middle: 'Salazar', last: 'Valdez', email: 'customer11@example.com', mobile: '09170000011', account: 'ACTIVE', verification: 'PENDING', customerType: 'PROSPECT', city: 'Angeles City', province: 'Pampanga' },
  { index: 12, rhcId: 'RHC-2026-000012', first: 'Bianca', middle: 'Manalo', last: 'Perez', email: 'customer12@example.com', mobile: '09170000012', account: 'DISABLED', verification: 'REJECTED', customerType: 'PROSPECT', city: 'San Fernando', province: 'Pampanga' },
];

const staffUsers = [
  { email: 'superadmin@example.com', first: 'RHC Demo', last: 'Super Admin', role: 'SUPER_ADMINISTRATOR', company: null },
  { email: 'systemadmin@example.com', first: 'RHC Demo', last: 'System Admin', role: 'SYSTEM_ADMINISTRATOR', company: null },
  { email: 'sales@example.com', first: 'Amica Demo', last: 'Sales', role: 'AMICA_SALES', company: 'AMICA' },
  { email: 'finance@example.com', first: 'Amica Demo', last: 'Finance', role: 'AMICA_FINANCE', company: 'AMICA' },
  { email: 'propertyadmin@example.com', first: 'Amica Demo', last: 'Property Admin', role: 'PROPERTY_ADMINISTRATOR', company: 'AMICA' },
  { email: 'compliance@example.com', first: 'RHC Demo', last: 'Compliance Officer', role: 'COMPLIANCE_OFFICER', company: null },
  { email: 'auditor@example.com', first: 'RHC Demo', last: 'Internal Auditor', role: 'INTERNAL_AUDITOR', company: null },
] as const;

type DemoProperty = {
  code: string;
  project: string;
  tower: string;
  floor: string;
  unit: string;
  asset: 'RESIDENTIAL' | 'COMMERCIAL' | 'PARKING';
  area: string;
  price: string;
  status: 'AVAILABLE' | 'HELD' | 'RESERVED' | 'CONTRACTED' | 'SOLD' | 'BLOCKED';
  unitType: string;
  demoStatusLabel?: string;
  lock?: 'ACTIVE' | 'EXPIRED';
};

const properties: DemoProperty[] = [
  { code: 'AMICA-R1-A-01-01', project: 'AMICA-R1', tower: 'Building A', floor: '1', unit: '101', asset: 'RESIDENTIAL', area: '32.50', price: '2450000.00', status: 'AVAILABLE', unitType: '1 BEDROOM' },
  { code: 'AMICA-R1-A-01-02', project: 'AMICA-R1', tower: 'Building A', floor: '1', unit: '102', asset: 'RESIDENTIAL', area: '32.50', price: '2450000.00', status: 'AVAILABLE', unitType: '1 BEDROOM', demoStatusLabel: 'EXPIRED_LOCK_RELEASED', lock: 'EXPIRED' },
  { code: 'AMICA-R1-A-01-03', project: 'AMICA-R1', tower: 'Building A', floor: '1', unit: '103', asset: 'RESIDENTIAL', area: '48.00', price: '3650000.00', status: 'RESERVED', unitType: '2 BEDROOM' },
  { code: 'AMICA-R1-A-02-01', project: 'AMICA-R1', tower: 'Building A', floor: '2', unit: '201', asset: 'RESIDENTIAL', area: '33.00', price: '2500000.00', status: 'HELD', unitType: '1 BEDROOM' },
  { code: 'AMICA-R1-A-02-02', project: 'AMICA-R1', tower: 'Building A', floor: '2', unit: '202', asset: 'RESIDENTIAL', area: '49.00', price: '3750000.00', status: 'HELD', unitType: '2 BEDROOM', demoStatusLabel: 'TEMPORARILY_LOCKED', lock: 'ACTIVE' },
  { code: 'AMICA-R1-A-02-03', project: 'AMICA-R1', tower: 'Building A', floor: '2', unit: '203', asset: 'RESIDENTIAL', area: '49.00', price: '3750000.00', status: 'CONTRACTED', unitType: '2 BEDROOM', demoStatusLabel: 'UNDER_CONTRACT' },
  { code: 'AMICA-R1-A-03-01', project: 'AMICA-R1', tower: 'Building A', floor: '3', unit: '301', asset: 'RESIDENTIAL', area: '34.00', price: '2600000.00', status: 'SOLD', unitType: '1 BEDROOM' },
  { code: 'AMICA-R1-A-03-02', project: 'AMICA-R1', tower: 'Building A', floor: '3', unit: '302', asset: 'RESIDENTIAL', area: '50.00', price: '3850000.00', status: 'BLOCKED', unitType: '2 BEDROOM' },
  { code: 'AMICA-R1-A-03-03', project: 'AMICA-R1', tower: 'Building A', floor: '3', unit: '303', asset: 'RESIDENTIAL', area: '50.00', price: '3880000.00', status: 'AVAILABLE', unitType: '2 BEDROOM' },
  { code: 'AMICA-R1-B-01-01', project: 'AMICA-R1', tower: 'Building B', floor: '1', unit: 'B101', asset: 'RESIDENTIAL', area: '28.00', price: '2180000.00', status: 'AVAILABLE', unitType: 'STUDIO' },
  { code: 'AMICA-R1-B-01-02', project: 'AMICA-R1', tower: 'Building B', floor: '1', unit: 'B102', asset: 'RESIDENTIAL', area: '35.00', price: '2750000.00', status: 'RESERVED', unitType: '1 BEDROOM' },
  { code: 'AMICA-R1-B-02-01', project: 'AMICA-R1', tower: 'Building B', floor: '2', unit: 'B201', asset: 'RESIDENTIAL', area: '36.00', price: '2820000.00', status: 'HELD', unitType: '1 BEDROOM' },
  { code: 'AMICA-R1-B-02-02', project: 'AMICA-R1', tower: 'Building B', floor: '2', unit: 'B202', asset: 'RESIDENTIAL', area: '52.00', price: '4050000.00', status: 'RESERVED', unitType: '2 BEDROOM' },
  { code: 'AMICA-R1-B-03-01', project: 'AMICA-R1', tower: 'Building B', floor: '3', unit: 'B301', asset: 'RESIDENTIAL', area: '37.00', price: '2920000.00', status: 'AVAILABLE', unitType: '1 BEDROOM' },
  { code: 'AMICA-R1-B-03-02', project: 'AMICA-R1', tower: 'Building B', floor: '3', unit: 'B302', asset: 'RESIDENTIAL', area: '54.00', price: '4250000.00', status: 'CONTRACTED', unitType: '2 BEDROOM', demoStatusLabel: 'UNDER_CONTRACT' },
  { code: 'AMICA-R2-A-01-01', project: 'AMICA-R2', tower: 'Building A', floor: '1', unit: '101', asset: 'RESIDENTIAL', area: '25.00', price: '2000000.00', status: 'AVAILABLE', unitType: 'STUDIO' },
  { code: 'AMICA-R2-A-01-02', project: 'AMICA-R2', tower: 'Building A', floor: '1', unit: '102', asset: 'RESIDENTIAL', area: '32.00', price: '2480000.00', status: 'AVAILABLE', unitType: '1 BEDROOM' },
  { code: 'AMICA-R2-A-02-01', project: 'AMICA-R2', tower: 'Building A', floor: '2', unit: '201', asset: 'RESIDENTIAL', area: '44.00', price: '3350000.00', status: 'RESERVED', unitType: '2 BEDROOM' },
  { code: 'AMICA-R2-A-02-02', project: 'AMICA-R2', tower: 'Building A', floor: '2', unit: '202', asset: 'RESIDENTIAL', area: '30.00', price: '2350000.00', status: 'HELD', unitType: '1 BEDROOM' },
  { code: 'AMICA-R2-A-03-01', project: 'AMICA-R2', tower: 'Building A', floor: '3', unit: '301', asset: 'RESIDENTIAL', area: '55.00', price: '4500000.00', status: 'CONTRACTED', unitType: '2 BEDROOM', demoStatusLabel: 'UNDER_CONTRACT' },
  { code: 'AMICA-R2-A-03-02', project: 'AMICA-R2', tower: 'Building A', floor: '3', unit: '302', asset: 'RESIDENTIAL', area: '27.00', price: '2150000.00', status: 'SOLD', unitType: 'STUDIO' },
  { code: 'AMICA-R2-A-04-01', project: 'AMICA-R2', tower: 'Building A', floor: '4', unit: '401', asset: 'RESIDENTIAL', area: '48.00', price: '3780000.00', status: 'BLOCKED', unitType: '2 BEDROOM' },
  { code: 'AMICA-R2-A-04-02', project: 'AMICA-R2', tower: 'Building A', floor: '4', unit: '402', asset: 'RESIDENTIAL', area: '35.00', price: '2700000.00', status: 'AVAILABLE', unitType: '1 BEDROOM' },
  { code: 'AMICA-R2-A-04-03', project: 'AMICA-R2', tower: 'Building A', floor: '4', unit: '403', asset: 'RESIDENTIAL', area: '29.00', price: '2250000.00', status: 'AVAILABLE', unitType: 'STUDIO' },
  { code: 'AMICA-R2-A-04-04', project: 'AMICA-R2', tower: 'Building A', floor: '4', unit: '404', asset: 'RESIDENTIAL', area: '42.00', price: '3250000.00', status: 'AVAILABLE', unitType: '1 BEDROOM' },
  { code: 'AMICA-P4PH-P1-001', project: 'AMICA-P4PH', tower: 'Phase 1', floor: 'LOT', unit: '001', asset: 'RESIDENTIAL', area: '72.00', price: '2850000.00', status: 'AVAILABLE', unitType: 'HOUSE_AND_LOT' },
  { code: 'AMICA-P4PH-P1-002', project: 'AMICA-P4PH', tower: 'Phase 1', floor: 'LOT', unit: '002', asset: 'RESIDENTIAL', area: '75.00', price: '2950000.00', status: 'AVAILABLE', unitType: 'HOUSE_AND_LOT' },
  { code: 'AMICA-P4PH-P1-003', project: 'AMICA-P4PH', tower: 'Phase 1', floor: 'LOT', unit: '003', asset: 'RESIDENTIAL', area: '80.00', price: '3150000.00', status: 'BLOCKED', unitType: 'HOUSE_AND_LOT', demoStatusLabel: 'UNAVAILABLE' },
  { code: 'AMICA-P4PH-P1-004', project: 'AMICA-P4PH', tower: 'Phase 1', floor: 'LOT', unit: '004', asset: 'RESIDENTIAL', area: '82.00', price: '3250000.00', status: 'AVAILABLE', unitType: 'HOUSE_AND_LOT' },
  { code: 'AMICA-P4PH-P1-005', project: 'AMICA-P4PH', tower: 'Phase 1', floor: 'LOT', unit: '005', asset: 'RESIDENTIAL', area: '90.00', price: '3450000.00', status: 'AVAILABLE', unitType: 'HOUSE_AND_LOT' },
];

const reservationSeeds = [
  ['RES-2026-000001', 1, 'AMICA-R1-A-01-03', 'CONFIRMED', -14, 58],
  ['RES-2026-000002', 2, 'AMICA-R1-A-02-01', 'PENDING', -1, 24],
  ['RES-2026-000003', 3, 'AMICA-R1-A-03-03', 'EXPIRED', -10, -8],
  ['RES-2026-000004', 5, 'AMICA-R1-B-03-01', 'CANCELLED', -8, 12],
  ['RES-2026-000005', 6, 'AMICA-R1-B-01-02', 'CONFIRMED', -6, 66],
  ['RES-2026-000006', 10, 'AMICA-R1-B-02-02', 'CONFIRMED', -4, 68],
  ['RES-2026-000007', 4, 'AMICA-R1-B-02-01', 'PENDING', 0, 24],
  ['RES-2026-000008', 7, 'AMICA-R2-A-02-02', 'PENDING', 0, 24],
  ['RES-2026-000009', 8, 'AMICA-R2-A-01-02', 'EXPIRED', -5, -3],
  ['RES-2026-000010', 11, 'AMICA-R2-A-04-03', 'CANCELLED', -3, 24],
] as const;

async function seedCompanies() {
  for (const [company_code, legal_name, display_name, business_type, description, status] of companies) {
    await prisma.company.upsert({
      where: { company_code },
      create: { company_code, legal_name, display_name, business_type, description, status, integration_status: company_code === 'AMICA' || company_code === 'RHC' ? 'ACTIVE' : 'PREPARED' },
      update: { legal_name, display_name, business_type, description, status, integration_status: company_code === 'AMICA' || company_code === 'RHC' ? 'ACTIVE' : 'PREPARED' },
    });
  }
}

async function seedRbac() {
  await prisma.permission.createMany({ data: [...new Set(permissionCodes)].map((code) => ({ code, description: code })), skipDuplicates: true });
  await prisma.role.createMany({
    data: Object.keys(rolePermissionMap).map((code) => ({ company_id: null, code, name: code.replaceAll('_', ' '), is_system: true })),
    skipDuplicates: true,
  });

  for (const [roleCode, codes] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findFirstOrThrow({ where: { code: roleCode, company_id: null } });
    const granted = await prisma.permission.findMany({ where: { code: { in: [...new Set(codes)] } } });
    await prisma.rolePermission.createMany({ data: granted.map((permission) => ({ role_id: role.id, permission_id: permission.id })), skipDuplicates: true });
  }
}

async function seedProjects() {
  const amica = await prisma.company.findUniqueOrThrow({ where: { company_code: 'AMICA' } });
  const projectSeeds = [
    ['AMICA-R1', 'Amica Residences 1', 'ACTIVE', 'Central Luzon, Philippines', 'Demo residential development used for RHC Digital property and reservation testing.', 'RESIDENTIAL'],
    ['AMICA-R2', 'Amica Residences 2', 'ACTIVE', 'Central Luzon, Philippines', 'Demo expansion project for multi-project architecture testing.', 'RESIDENTIAL'],
    ['AMICA-P4PH', 'Amica Residences Parang 4PH', 'PLANNED', 'Central Luzon, Philippines', 'Demo future project used to verify that the platform supports planned developments.', 'RESIDENTIAL'],
  ] as const;
  for (const [project_code, project_name, status, location, description, project_type] of projectSeeds) {
    await prisma.project.upsert({
      where: { project_code },
      create: { company_id: amica.id, project_code, project_name, status, location, description: `${description} Project type: ${project_type}.` },
      update: { company_id: amica.id, project_name, status, location, description: `${description} Project type: ${project_type}.` },
    });
  }
}

async function seedProperties() {
  const projects = await prisma.project.findMany({ where: { project_code: { in: [...new Set(properties.map((property) => property.project))] } } });
  const projectByCode = new Map(projects.map((project) => [project.project_code, project]));
  for (const property of properties) {
    const project = projectByCode.get(property.project);
    if (!project) throw new Error(`Missing project for ${property.code}`);
    await prisma.property.upsert({
      where: { property_code: property.code },
      create: {
        project_id: project.id,
        property_code: property.code,
        tower: property.tower,
        floor: property.floor,
        unit_number: property.unit,
        asset_type: property.asset,
        area: property.area,
        list_price: property.price,
        currency: 'PHP',
        status: property.status,
        metadata: propertyMetadata(property),
      },
      update: {
        project_id: project.id,
        tower: property.tower,
        floor: property.floor,
        unit_number: property.unit,
        asset_type: property.asset,
        area: property.area,
        list_price: property.price,
        currency: 'PHP',
        status: property.status,
        metadata: propertyMetadata(property),
      },
    });
  }
}

function propertyMetadata(property: DemoProperty): Prisma.JsonObject {
  const lockOwner = property.lock === 'ACTIVE' ? 'RHC-2026-000002' : property.lock === 'EXPIRED' ? 'RHC-2026-000003' : undefined;
  return {
    demo_data: true,
    demo_label: 'DEMO DATA',
    unit_type: property.unitType,
    business_status_label: property.demoStatusLabel ?? property.status,
    building_or_phase: property.tower,
    ...(property.lock ? {
      lock: {
        status: property.lock,
        owner_rhc_id: lockOwner,
        started_at: dateOffset(property.lock === 'ACTIVE' ? 0 : -2).toISOString(),
        expires_at: dateOffset(property.lock === 'ACTIVE' ? 0 : -2, 0, property.lock === 'ACTIVE' ? 15 : 15).toISOString(),
      },
    } : {}),
  };
}

async function ensureUserRole(userId: string, roleId: string, companyId: string | null = null, projectId: string | null = null) {
  const existing = await prisma.userRole.findFirst({ where: { user_id: userId, role_id: roleId, company_id: companyId, project_id: projectId } });
  if (!existing) await prisma.userRole.create({ data: { user_id: userId, role_id: roleId, company_id: companyId, project_id: projectId } });
}

async function seedUsers() {
  const customerRole = await prisma.role.findFirstOrThrow({ where: { code: 'CUSTOMER', company_id: null } });
  for (const customer of customers) {
    const accountStatus = customer.account === 'INACTIVE' ? 'DISABLED' : customer.account;
    const issuedRhcId = customer.verification === 'VERIFIED' && accountStatus === 'ACTIVE' ? customer.rhcId : null;
    await prisma.user.upsert({
      where: { email: customer.email },
      create: {
        id: stableUuid(`customer:${customer.email}`),
        supabase_user_id: `demo-customer-${String(customer.index).padStart(2, '0')}`,
        email: customer.email,
        mobile_number: customer.mobile,
        auth_email_confirmed_at: customer.verification === 'VERIFIED' || customer.verification === 'PENDING' ? dateOffset(-30) : null,
        account_status: accountStatus,
        verification_status: customer.verification,
        last_login_at: customer.index <= 5 ? dateOffset(-1, customer.index) : null,
        profile: {
          create: {
            first_name: customer.first,
            middle_name: customer.middle,
            last_name: customer.last,
            email: customer.email,
            mobile_number: customer.mobile,
            address_line: `${customer.city} demo location`,
            city: customer.city,
            province: customer.province,
            country: 'Philippines',
            rhc_id: issuedRhcId,
            rhc_id_issued_at: issuedRhcId ? dateOffset(-25 + customer.index) : null,
            account_status: accountStatus,
            verification_status: customer.verification,
          },
        },
      },
      update: {
        supabase_user_id: `demo-customer-${String(customer.index).padStart(2, '0')}`,
        mobile_number: customer.mobile,
        auth_email_confirmed_at: customer.verification === 'VERIFIED' || customer.verification === 'PENDING' ? dateOffset(-30) : null,
        account_status: accountStatus,
        verification_status: customer.verification,
        last_login_at: customer.index <= 5 ? dateOffset(-1, customer.index) : null,
        profile: {
          upsert: {
            create: {
              first_name: customer.first,
              middle_name: customer.middle,
              last_name: customer.last,
              email: customer.email,
              mobile_number: customer.mobile,
              address_line: `${customer.city} demo location`,
              city: customer.city,
              province: customer.province,
              country: 'Philippines',
              rhc_id: issuedRhcId,
              rhc_id_issued_at: issuedRhcId ? dateOffset(-25 + customer.index) : null,
              account_status: accountStatus,
              verification_status: customer.verification,
            },
            update: {
              first_name: customer.first,
              middle_name: customer.middle,
              last_name: customer.last,
              email: customer.email,
              mobile_number: customer.mobile,
              address_line: `${customer.city} demo location`,
              city: customer.city,
              province: customer.province,
              country: 'Philippines',
              rhc_id: issuedRhcId,
              rhc_id_issued_at: issuedRhcId ? dateOffset(-25 + customer.index) : null,
              account_status: accountStatus,
              verification_status: customer.verification,
            },
          },
        },
      },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: customer.email } });
    await ensureUserRole(user.id, customerRole.id);
  }

  for (const staff of staffUsers) {
    await prisma.user.upsert({
      where: { email: staff.email },
      create: {
        id: stableUuid(`staff:${staff.email}`),
        supabase_user_id: `demo-staff-${staff.email.split('@')[0]}`,
        email: staff.email,
        auth_email_confirmed_at: dateOffset(-60),
        account_status: 'ACTIVE',
        verification_status: 'VERIFIED',
        profile: { create: { first_name: staff.first, last_name: staff.last, email: staff.email, country: 'Philippines', account_status: 'ACTIVE', verification_status: 'VERIFIED' } },
      },
      update: {
        supabase_user_id: `demo-staff-${staff.email.split('@')[0]}`,
        auth_email_confirmed_at: dateOffset(-60),
        account_status: 'ACTIVE',
        verification_status: 'VERIFIED',
        profile: { upsert: { create: { first_name: staff.first, last_name: staff.last, email: staff.email, country: 'Philippines', account_status: 'ACTIVE', verification_status: 'VERIFIED' }, update: { first_name: staff.first, last_name: staff.last, email: staff.email, account_status: 'ACTIVE', verification_status: 'VERIFIED' } } },
      },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: staff.email } });
    const role = await prisma.role.findFirstOrThrow({ where: { code: staff.role, company_id: null } });
    const company = staff.company ? await prisma.company.findUniqueOrThrow({ where: { company_code: staff.company } }) : null;
    await ensureUserRole(user.id, role.id, company?.id ?? null);
  }
}

async function seedReservationsAndRelationships() {
  const reservationDb = prisma as PrismaClient & { reservation: any; reservationEvent: any; propertyStatusHistory: any };
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'superadmin@example.com' } });
  const customerByIndex = new Map((await prisma.user.findMany({ where: { email: { in: customers.map((customer) => customer.email) } }, include: { profile: true } })).map((user) => [customers.find((customer) => customer.email === user.email)?.index, user]));
  const propertyByCode = new Map((await prisma.property.findMany({ where: { property_code: { in: reservationSeeds.map((seed) => seed[2]) } }, include: { project: true } })).map((property) => [property.property_code, property]));

  for (const [reservation_number, customerIndex, propertyCode, status, createdDays, expirationHours] of reservationSeeds) {
    const customer = customerByIndex.get(customerIndex);
    const property = propertyByCode.get(propertyCode);
    if (!customer || !property) throw new Error(`Missing reservation dependency for ${reservation_number}`);
    const createdAt = dateOffset(createdDays);
    const expiresAt = dateOffset(createdDays, expirationHours);
    const confirmedAt = status === 'CONFIRMED' ? dateOffset(createdDays, 4) : null;
    const cancelledAt = status === 'CANCELLED' ? dateOffset(createdDays, 5) : null;
    const reservation = await reservationDb.reservation.upsert({
      where: { reservation_number },
      create: {
        id: stableUuid(`reservation:${reservation_number}`),
        reservation_number,
        customer_id: customer.id,
        property_id: property.id,
        status,
        expires_at: expiresAt,
        confirmed_at: confirmedAt,
        cancelled_at: cancelledAt,
        created_at: createdAt,
      },
      update: {
        customer_id: customer.id,
        property_id: property.id,
        status,
        expires_at: expiresAt,
        confirmed_at: confirmedAt,
        cancelled_at: cancelledAt,
      },
    });

    await reservationDb.reservationEvent.deleteMany({ where: { reservation_id: reservation.id } });
    const eventTypes = status === 'PENDING' ? ['CREATED'] : ['CREATED', status];
    await reservationDb.reservationEvent.createMany({
      data: eventTypes.map((eventType, index) => ({
        id: stableUuid(`reservation-event:${reservation_number}:${eventType}`),
        reservation_id: reservation.id,
        event_type: eventType,
        actor_user_id: index === 0 ? customer.id : admin.id,
        note: eventType === 'CANCELLED' ? 'Customer changed property preference.' : `Demo ${eventType.toLowerCase()} reservation event.`,
        metadata: { demo_data: true, review_reference: `DEMO-${reservation_number}-${eventType}` },
        created_at: dateOffset(createdDays, index + 1),
      })),
    });

    if (status === 'CONFIRMED') {
      await prisma.customerProperty.createMany({
        data: [{ customer_id: customer.id, property_id: property.id, relationship_type: 'BUYER', status: 'ACTIVE', effective_from: confirmedAt ?? createdAt }],
        skipDuplicates: true,
      });
    }
    if (status === 'PENDING') {
      await prisma.customerProperty.createMany({
        data: [{ customer_id: customer.id, property_id: property.id, relationship_type: 'RESERVEE', status: 'ACTIVE', effective_from: createdAt }],
        skipDuplicates: true,
      });
    }
  }

  const linkedPropertyCodes = ['AMICA-R1-A-03-01', 'AMICA-R1-A-02-03'];
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'daniel.villanueva@example.com' } });
  const linked = await prisma.property.findMany({ where: { property_code: { in: linkedPropertyCodes } } });
  await prisma.customerProperty.createMany({
    data: linked.map((property) => ({ customer_id: owner.id, property_id: property.id, relationship_type: 'OWNER', status: 'ACTIVE', effective_from: dateOffset(-90) })),
    skipDuplicates: true,
  });
}

async function seedNotifications() {
  const users = await prisma.user.findMany({ where: { email: { in: customers.slice(0, 8).map((customer) => customer.email) } } });
  await prisma.notification.deleteMany({ where: { user_id: { in: users.map((user) => user.id) }, subject: { startsWith: '[DEMO]' } } });
  const messages = [
    ['ACCOUNT', '[DEMO] Your RHC Digital ID has been verified.', 'Your demo RHC Digital ID is active for Month 1 testing.', 'UNREAD'],
    ['RESERVATION', '[DEMO] Your reservation RES-2026-000001 has been confirmed.', 'The selected Amica unit is now reserved in the demo environment.', 'READ'],
    ['RESERVATION', '[DEMO] Your property reservation will expire soon.', 'Please complete the next demo reservation step before expiry.', 'UNREAD'],
    ['PROPERTY', '[DEMO] A new document is available.', 'A demo property document is available for review.', 'READ'],
    ['SYSTEM', '[DEMO] Your profile verification is pending.', 'RHC compliance review is pending for this demo profile.', 'UNREAD'],
  ] as const;
  await prisma.notification.createMany({
    data: users.flatMap((user, userIndex) => messages.slice(0, userIndex % messages.length + 1).map(([channel, subject, body, status], messageIndex) => ({
      id: stableUuid(`notification:${user.email}:${subject}:${messageIndex}`),
      user_id: user.id,
      channel,
      subject,
      body,
      status,
      sent_at: dateOffset(-messageIndex - 1),
      created_at: dateOffset(-messageIndex - 1),
    }))),
  });
}

async function seedStatusHistoryAndAudit() {
  const reservationDb = prisma as PrismaClient & { reservation: any; propertyStatusHistory: any };
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'superadmin@example.com' } });
  const amica = await prisma.company.findUniqueOrThrow({ where: { company_code: 'AMICA' } });
  const seededProperties = await prisma.property.findMany({ where: { property_code: { in: properties.map((property) => property.code) } }, include: { project: true } });
  await reservationDb.propertyStatusHistory.deleteMany({ where: { property_id: { in: seededProperties.map((property) => property.id) }, reason: { startsWith: 'Demo seed' } } });
  await reservationDb.propertyStatusHistory.createMany({
    data: seededProperties.map((property, index) => ({
      id: stableUuid(`property-status-history:${property.property_code}`),
      property_id: property.id,
      previous_status: null,
      next_status: property.status,
      reason: 'Demo seed initial status',
      actor_user_id: admin.id,
      created_at: dateOffset(-30, index % 8),
    })),
  });

  await prisma.auditLog.deleteMany({ where: { correlation_id: demoCorrelationId } });
  const customersForAudit = await prisma.user.findMany({ where: { email: { in: customers.map((customer) => customer.email) } }, include: { profile: true } });
  const reservations = await reservationDb.reservation.findMany({ where: { reservation_number: { in: reservationSeeds.map((seed) => seed[0]) } }, include: { property: { include: { project: true } } } }) as Array<{ id: string; customer_id: string; status: string; property: { project_id: string } }>;
  const actions = [
    ...customersForAudit.slice(0, 12).map((user, index) => ({ actor: user.id, action: index % 2 ? 'LOGIN_SUCCESS' : 'USER_REGISTERED', entityType: 'user', entityId: user.id, companyId: null, projectId: null, result: 'SUCCESS' })),
    ...customersForAudit.filter((user) => user.profile?.rhc_id).slice(0, 8).map((user) => ({ actor: user.id, action: 'DIGITAL_ID_CREATED', entityType: 'rhc_digital_id', entityId: user.profile?.rhc_id ?? user.id, companyId: null, projectId: null, result: 'SUCCESS' })),
    ...seededProperties.slice(0, 10).map((property, index) => ({ actor: admin.id, action: index % 3 === 0 ? 'PROPERTY_BLOCKED' : 'PROPERTY_UPDATED', entityType: 'property', entityId: property.id, companyId: amica.id, projectId: property.project_id, result: 'SUCCESS' })),
    ...reservations.map((reservation) => ({ actor: reservation.customer_id, action: `RESERVATION_${reservation.status}`, entityType: 'reservation', entityId: reservation.id, companyId: amica.id, projectId: reservation.property.project_id, result: 'SUCCESS' })),
  ];
  while (actions.length < 32) actions.push({ actor: admin.id, action: actions.length % 2 ? 'ADMIN_LOGIN' : 'ROLE_ASSIGNED', entityType: actions.length % 2 ? 'session' : 'user_role', entityId: stableUuid(`audit-entity:${actions.length}`), companyId: null, projectId: null, result: 'SUCCESS' });

  await prisma.auditLog.createMany({
    data: actions.map((event, index) => ({
      id: stableUuid(`audit:${index}:${event.action}:${event.entityId}`),
      actor_user_id: event.actor,
      actor_role: event.actor === admin.id ? 'SUPER_ADMINISTRATOR' : 'CUSTOMER',
      company_id: event.companyId,
      project_id: event.projectId,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      after_data: { demo_data: true, result: event.result, reference_id: `DEMO-REQ-${String(index + 1).padStart(4, '0')}` },
      ip_address: '127.0.0.1',
      user_agent: 'RHC Month 1 Demo Seeder',
      request_id: `demo-request-${String(index + 1).padStart(4, '0')}`,
      correlation_id: demoCorrelationId,
      created_at: dateOffset(-20 + Math.floor(index / 2), index % 10),
    })),
  });
}

async function seedServicesAndSettings() {
  const serviceSeeds = [
    ['AMICA', 'PROPERTY_SERVICES', 'Property Services', 'PROPERTY', true, true, 'ACTIVE'],
    ['AMICA-WATER', 'WATER_ACCOUNT', 'Water Account', 'UTILITY', false, false, 'COMING_SOON'],
    ['AMICA-MART', 'RETAIL_REWARDS', 'Retail Rewards', 'RETAIL', true, false, 'COMING_SOON'],
    ['RSSC', 'RESIDENT_ACCESS', 'Resident Access', 'SECURITY', false, true, 'COMING_SOON'],
    ['RBAC', 'PROMOTIONAL_REWARDS', 'Promotional Rewards', 'MEDIA', true, false, 'PREPARED'],
    ['COASTLINE', 'LOYALTY_COMMERCE', 'Loyalty Commerce', 'COMMERCE', true, false, 'PREPARED'],
  ] as const;

  for (const [companyCode, service_code, service_name, service_type, rewards_eligible, requires_property, status] of serviceSeeds) {
    const company = await prisma.company.findUniqueOrThrow({ where: { company_code: companyCode } });
    await prisma.businessService.upsert({
      where: { company_id_service_code: { company_id: company.id, service_code } },
      create: { company_id: company.id, service_code, service_name, service_type, rewards_eligible, requires_property, status, description: `${service_name} architecture foundation` },
      update: { service_name, service_type, rewards_eligible, requires_property, status, description: `${service_name} architecture foundation` },
    });
  }

  for (const [key, enabled] of Object.entries(featureFlags)) {
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, description: `Month 1 flag ${key}`, metadata: { demo_data: true } },
      update: { enabled, description: `Month 1 flag ${key}`, metadata: { demo_data: true } },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: 'month_1_acceptance_state' },
    create: { key: 'month_1_acceptance_state', value: { status: 'demo_seeded', demo_data: true }, description: 'Month 1 acceptance marker' },
    update: { value: { status: 'demo_seeded', demo_data: true }, description: 'Month 1 acceptance marker' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'demo_environment_banner' },
    create: { key: 'demo_environment_banner', value: { enabled: true, label: 'DEMO DATA', environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'local' }, description: 'Non-production demo data indicator' },
    update: { value: { enabled: true, label: 'DEMO DATA', environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'local' }, description: 'Non-production demo data indicator' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'web3_placeholder_status' },
    create: { key: 'web3_placeholder_status', value: { network_status: 'NOT_CONFIGURED', wallet_status: 'NOT_ACTIVATED', token_status: 'MONTH_2', smart_contract_status: 'NOT_DEPLOYED', blockchain_integration_status: 'PLANNED' }, description: 'Accurate Month 1 Web3 placeholder state' },
    update: { value: { network_status: 'NOT_CONFIGURED', wallet_status: 'NOT_ACTIVATED', token_status: 'MONTH_2', smart_contract_status: 'NOT_DEPLOYED', blockchain_integration_status: 'PLANNED' }, description: 'Accurate Month 1 Web3 placeholder state' },
  });
}

async function verifyRelationships() {
  const reservationDb = prisma as PrismaClient & { reservation: any };
  const [companyCount, projectCount, propertyCount, customerCount, staffCount, reservationCount, notificationCount, auditCount] = await Promise.all([
    prisma.company.count({ where: { company_code: { in: companies.map((company) => company[0]) } } }),
    prisma.project.count({ where: { project_code: { in: ['AMICA-R1', 'AMICA-R2', 'AMICA-P4PH'] } } }),
    prisma.property.count({ where: { property_code: { in: properties.map((property) => property.code) } } }),
    prisma.user.count({ where: { email: { in: customers.map((customer) => customer.email) } } }),
    prisma.user.count({ where: { email: { in: staffUsers.map((staff) => staff.email) } } }),
    reservationDb.reservation.count({ where: { reservation_number: { in: reservationSeeds.map((seed) => seed[0]) } } }),
    prisma.notification.count({ where: { subject: { startsWith: '[DEMO]' } } }),
    prisma.auditLog.count({ where: { correlation_id: demoCorrelationId } }),
  ]);
  const digitalIds = await prisma.userProfile.count({ where: { rhc_id: { startsWith: 'RHC-2026-' } } });
  const activeLocks = await prisma.property.count({ where: { metadata: { path: ['lock', 'status'], equals: 'ACTIVE' } } });
  const expiredLocks = await prisma.property.count({ where: { metadata: { path: ['lock', 'status'], equals: 'EXPIRED' } } });
  return { companyCount, projectCount, propertyCount, customerCount, digitalIds, staffCount, reservationCount, locks: activeLocks + expiredLocks, notificationCount, auditCount };
}

async function main() {
  assertSafeSeedEnvironment();
  await seedCompanies();
  await seedRbac();
  await seedProjects();
  await seedProperties();
  await seedUsers();
  await seedReservationsAndRelationships();
  await seedNotifications();
  await seedStatusHistoryAndAudit();
  await seedServicesAndSettings();
  const summary = await verifyRelationships();
  console.log('RHC Month 1 demo seed completed safely.');
  console.log(JSON.stringify(summary, null, 2));
  console.log('Demo accounts were seeded without repository passwords. Use environment-controlled auth provisioning for passwords.');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown seed error';
    console.error(`Database seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
