import assert from 'node:assert/strict';
import test from 'node:test';
import { FEATURE_FLAG_DEFAULTS, PILOT_COMPANIES, PERMISSION_CODES, SeedDatabase, SeedConflictError, runSeed } from './seed';

type Row = Record<string, any>;
type InitialState = Partial<Record<'companies' | 'projects' | 'properties' | 'permissions' | 'roles' | 'rolePermissions' | 'featureFlags' | 'businessServices' | 'systemSettings', Row[]>>;

function makeDelegate(rows: Row[]) {
  const matches = (row: Row, where: Row) => {
    if (where.company_id_service_code) {
      return row.company_id === where.company_id_service_code.company_id && row.service_code === where.company_id_service_code.service_code;
    }
    return Object.entries(where).every(([key, value]) => row[key] === value);
  };
  let nextId = 1;
  return {
    findUnique: async ({ where }: Row) => rows.find((row) => matches(row, where)) ?? null,
    findFirst: async ({ where }: Row) => rows.find((row) => matches(row, where)) ?? null,
    create: async ({ data }: Row) => {
      const row = { id: `generated-${nextId++}`, ...data };
      rows.push(row);
      return row;
    },
    createMany: async ({ data }: Row) => {
      rows.push(...data.map((row: Row) => ({ id: `generated-${nextId++}`, ...row })));
      return { count: data.length };
    },
  };
}

function makeDatabase(initial: InitialState = {}) {
  const state = {
    companies: [...(initial.companies ?? [])],
    projects: [...(initial.projects ?? [])],
    properties: [...(initial.properties ?? [])],
    permissions: [...(initial.permissions ?? [])],
    roles: [...(initial.roles ?? [])],
    rolePermissions: [...(initial.rolePermissions ?? [])],
    featureFlags: [...(initial.featureFlags ?? [])],
    businessServices: [...(initial.businessServices ?? [])],
    systemSettings: [...(initial.systemSettings ?? [])],
  };
  const db = {
    company: makeDelegate(state.companies),
    project: makeDelegate(state.projects),
    property: makeDelegate(state.properties),
    permission: makeDelegate(state.permissions),
    role: makeDelegate(state.roles),
    rolePermission: makeDelegate(state.rolePermissions),
    featureFlag: makeDelegate(state.featureFlags),
    businessService: makeDelegate(state.businessServices),
    systemSetting: makeDelegate(state.systemSettings),
    $transaction: async () => { throw new Error('runSeed must not create its own transaction'); },
  } as unknown as SeedDatabase & { $transaction: () => Promise<unknown> };
  return { db, state };
}

test('core mode always creates the eight-company catalog and AMICA-T1 without sample properties', async () => {
  const { db, state } = makeDatabase();

  const summary = await runSeed(db, { sampleInventory: false });

  assert.equal(summary.companyCount, PILOT_COMPANIES.length);
  assert.equal(state.companies.length, 8);
  assert.deepEqual(state.companies.map((company) => company.company_code), PILOT_COMPANIES.map((company) => company.company_code));
  assert.deepEqual(state.companies.filter((company) => company.status === 'ACTIVE').map((company) => company.company_code), ['RHC', 'AMICA_CONDO']);
  assert.equal(state.projects.length, 1);
  assert.deepEqual(state.projects[0], {
    id: state.projects[0].id,
    project_code: 'AMICA-T1',
    project_name: 'Amica Residences Tower 1',
    description: 'Initial RHC Digital pilot property project',
    location: 'Philippines',
    status: 'ACTIVE',
    company_id: state.companies.find((company) => company.company_code === 'AMICA_CONDO')?.id,
  });
  assert.equal(state.properties.length, 0);
  assert.equal(state.featureFlags.length, Object.keys(FEATURE_FLAG_DEFAULTS).length);
});

test('explicit sample mode adds only the intended synthetic properties', async () => {
  const { db, state } = makeDatabase();

  await runSeed(db, { sampleInventory: true });

  assert.equal(state.properties.length, 4);
  assert.deepEqual(state.properties.map((property) => property.property_code), [
    'AMICA-T1-RES-0501', 'AMICA-T1-RES-0502', 'AMICA-T1-COM-G01', 'AMICA-T1-PARK-B1-001',
  ]);
  assert.ok(state.properties.every((property) => property.metadata?.seeded === true && property.metadata?.provenance === 'synthetic-sample'));
});

test('reruns preserve existing company, project, property, feature, service, and setting state', async () => {
  const existingCompany = { id: 'company-amica', company_code: 'AMICA_CONDO', legal_name: 'Amica Condominium Realty Corporation', display_name: 'AMICA', business_type: 'Real Estate', description: 'Operator description', status: 'INACTIVE', api_enabled: true, rewards_enabled: true, integration_status: 'ACTIVE' };
  const existingProject = { id: 'project-amica', project_code: 'AMICA-T1', company_id: existingCompany.id, project_name: 'Operator project name', description: 'Operator project description', location: 'Operator location', status: 'ON_HOLD' };
  const existingProperty = { id: 'property-0501', property_code: 'AMICA-T1-RES-0501', project_id: existingProject.id, status: 'SOLD', metadata: { provenance: 'operator-record' } };
  const existingFlag = { id: 'flag-properties', key: 'ENABLE_PROPERTIES', enabled: false, scope: 'GLOBAL' };
  const existingService = { id: 'service-property', company_id: existingCompany.id, service_code: 'PROPERTY_SERVICES', status: 'DISABLED', integration_status: 'ERROR' };
  const existingSetting = { id: 'setting-acceptance', key: 'month_1_acceptance_state', value: { status: 'under_review' } };
  const { db, state } = makeDatabase({ companies: [existingCompany], projects: [existingProject], properties: [existingProperty], featureFlags: [existingFlag], businessServices: [existingService], systemSettings: [existingSetting] });
  const before = structuredClone({ existingCompany, existingProject, existingProperty, existingFlag, existingService, existingSetting });

  await runSeed(db, { sampleInventory: true });
  await runSeed(db, { sampleInventory: false });

  assert.deepEqual(state.companies.find((row) => row.id === existingCompany.id), before.existingCompany);
  assert.deepEqual(state.projects.find((row) => row.id === existingProject.id), before.existingProject);
  assert.deepEqual(state.properties.find((row) => row.id === existingProperty.id), before.existingProperty);
  assert.deepEqual(state.featureFlags.find((row) => row.id === existingFlag.id), before.existingFlag);
  assert.deepEqual(state.businessServices.find((row) => row.id === existingService.id), before.existingService);
  assert.deepEqual(state.systemSettings.find((row) => row.id === existingSetting.id), before.existingSetting);
  assert.equal(state.properties.length, 4);
});

test('rejects an AMICA-T1 ownership collision without reparenting the project', async () => {
  const foreignProject = { id: 'foreign-project', project_code: 'AMICA-T1', company_id: 'foreign-company', status: 'ACTIVE' };
  const { db, state } = makeDatabase({ projects: [foreignProject] });

  await assert.rejects(() => runSeed(db, { sampleInventory: true }), (error: unknown) => error instanceof SeedConflictError && /different company/.test(error.message));
  assert.deepEqual(state.projects, [foreignProject]);
});

test('rejects a synthetic property collision without attaching it to another project', async () => {
  const existingProject = { id: 'project-amica', project_code: 'AMICA-T1', company_id: 'company-amica', status: 'ACTIVE' };
  const foreignProperty = { id: 'foreign-property', property_code: 'AMICA-T1-RES-0501', project_id: 'foreign-project', status: 'AVAILABLE' };
  const { db, state } = makeDatabase({ companies: [{ id: 'company-amica', company_code: 'AMICA_CONDO' }], projects: [existingProject], properties: [foreignProperty] });

  await assert.rejects(() => runSeed(db, { sampleInventory: true }), (error: unknown) => error instanceof SeedConflictError && /different project/.test(error.message));
  assert.deepEqual(state.properties, [foreignProperty]);
});

test('does not silently restore existing role grants, including customized SUPER_ADMIN access', async () => {
  const superRole = { id: 'role-super', code: 'SUPER_ADMIN', company_id: null, is_system: true };
  const salesRole = { id: 'role-sales', code: 'SALES_AGENT', company_id: null, is_system: true };
  const customPermission = { id: 'permission-custom', code: 'custom.operator.permission' };
  const existingGrant = { id: 'grant-existing', role_id: superRole.id, permission_id: customPermission.id };
  const existingSalesGrant = { id: 'grant-sales', role_id: salesRole.id, permission_id: customPermission.id };
  const { db, state } = makeDatabase({ roles: [superRole, salesRole], permissions: [customPermission], rolePermissions: [existingGrant, existingSalesGrant] });
  const before = structuredClone(state.rolePermissions);

  await runSeed(db);

  assert.deepEqual(state.rolePermissions.filter((grant) => [superRole.id, salesRole.id].includes(grant.role_id)), before);
  assert.ok(state.rolePermissions.some((grant) => ![superRole.id, salesRole.id].includes(grant.role_id)));
  assert.ok(state.roles.some((role) => role.code === 'PROPERTY_ADMIN'));
  assert.ok(PERMISSION_CODES.every((code) => state.permissions.some((permission) => permission.code === code)));
});

test('runSeed uses only injected delegates and does not create its own database transaction', async () => {
  const { db } = makeDatabase();
  let transactionCalls = 0;
  (db as SeedDatabase & { $transaction: () => Promise<unknown> }).$transaction = async () => { transactionCalls += 1; return undefined; };

  await runSeed(db);

  assert.equal(transactionCalls, 0);
});
