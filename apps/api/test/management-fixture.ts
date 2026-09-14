import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Harness, ids } from './api-harness';

export const managementIds = { relationship: '60000000-0000-4000-8000-000000000001', foreignRelationship: '60000000-0000-4000-8000-000000000002', role: '70000000-0000-4000-8000-000000000001', customerRole: '70000000-0000-4000-8000-000000000002', superRole: '70000000-0000-4000-8000-000000000003', permission: '80000000-0000-4000-8000-000000000001', privilegedPermission: '80000000-0000-4000-8000-000000000002', integration: '90000000-0000-4000-8000-000000000001', foreignIntegration: '90000000-0000-4000-8000-000000000002', service: 'a0000000-0000-4000-8000-000000000001', foreignService: 'a0000000-0000-4000-8000-000000000002' };

function matches(row: any, where: any): boolean {
  return !where || Object.entries(where).every(([key, filter]: [string, any]) => {
    if (filter === undefined) return true;
    if (key === 'AND') return (Array.isArray(filter) ? filter : [filter]).every((entry: any) => matches(row, entry));
    if (key === 'OR') return filter.some((entry: any) => matches(row, entry));
    const value = row[key];
    if (filter && typeof filter === 'object' && !(filter instanceof Date)) {
      if ('in' in filter) return filter.in.includes(value);
      if ('gt' in filter) return value != null && value > filter.gt;
      return matches(value ?? {}, filter);
    }
    return value === filter;
  });
}
function projected(row: any, select: any): any {
  if (!select) return structuredClone(row);
  return Object.fromEntries(Object.entries(select).filter(([, choice]) => choice).map(([key, choice]: [string, any]) => [key, choice === true ? structuredClone(row[key]) : Array.isArray(row[key]) ? row[key].map((value: any) => projected(value, choice.select)) : row[key] ? projected(row[key], choice.select) : null]));
}
function table(initial: any[], defaults: any = {}, decorate = (row: any): any => row) {
  const rows: any[] = initial;
  const output = (row: any, args: any) => projected(decorate(row), args.select);
  const find = (where: any) => rows.find((row) => matches(decorate(row), where));
  const required = (where: any) => { const row = find(where); if (!row) throw new Prisma.PrismaClientKnownRequestError('Fixture not found', { code: 'P2025', clientVersion: 'test' }); return row; };
  const api: any = {
    findUnique: jest.fn(async (args) => { const row = find(args.where); return row ? output(row, args) : null; }),
    findUniqueOrThrow: jest.fn(async (args) => output(required(args.where), args)),
    findFirst: jest.fn(async (args) => { const row = find(args.where); return row ? output(row, args) : null; }),
    findMany: jest.fn(async (args: any = {}) => rows.filter((row) => matches(decorate(row), args.where)).slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length)).map((row) => output(row, args))),
    count: jest.fn(async (args: any = {}) => rows.filter((row) => matches(decorate(row), args.where)).length),
    create: jest.fn(async (args) => { const row = { id: randomUUID(), created_at: new Date(), updated_at: new Date(), ...defaults, ...args.data }; rows.push(row); return output(row, args); }),
    update: jest.fn(async (args) => { const row = required(args.where); Object.assign(row, args.data); return output(row, args); }),
    delete: jest.fn(async (args) => { const row = required(args.where); rows.splice(rows.indexOf(row), 1); return output(row, args); }),
    deleteMany: jest.fn(async (args) => { let count = 0; for (let i = rows.length - 1; i >= 0; i -= 1) if (matches(rows[i], args.where)) { rows.splice(i, 1); count += 1; } return { count }; }),
    createMany: jest.fn(async (args) => { rows.push(...args.data.map((row: any) => ({ id: randomUUID(), ...row }))); return { count: args.data.length }; }),
  };
  api.upsert = jest.fn(async (args) => find(args.where) ? api.update({ where: args.where, data: args.update }) : api.create({ data: args.create }));
  return { rows, api };
}

export function managementFixture(h: Harness) {
  const m = managementIds;
  const target = { id: ids.propertyA, supabase_user_id: ids.propertyB, email: 'managed@example.test', account_status: 'ACTIVE', verification_status: 'PENDING', auth_email_confirmed_at: new Date('2026-01-01') };
  h.users.set(target.id, target); h.profiles.set(target.id, { id: target.id, user_id: target.id, account_status: 'ACTIVE', verification_status: 'PENDING' });
  const projects = table([{ id: ids.projectA, company_id: ids.companyA, start_date: new Date('2026-01-01'), target_completion: new Date('2027-01-01') }, { id: ids.projectB, company_id: ids.companyB }]);
  const relationships = table([{ id: m.relationship, property_id: ids.propertyA, customer_id: target.id, relationship_type: 'BUYER', status: 'ACTIVE', effective_from: new Date('2026-01-01'), effective_to: null }, { id: m.foreignRelationship, property_id: ids.propertyB, effective_from: new Date('2026-01-01') }], {}, (row) => ({ ...row, property: { project_id: row.property_id === ids.propertyA ? ids.projectA : ids.projectB, project: { company_id: row.property_id === ids.propertyA ? ids.companyA : ids.companyB } } }));
  const permissions = table([{ id: m.permission, code: 'property.view' }, { id: m.privilegedPermission, code: 'system_settings.manage' }]);
  const rolePermissions = table([{ role_id: m.role, permission_id: m.permission }]);
  const roles = table([{ id: m.role, company_id: null, code: 'REVIEWER', name: 'Reviewer', is_system: false }, { id: m.customerRole, company_id: null, code: 'CUSTOMER', name: 'Customer', is_system: true }, { id: m.superRole, company_id: null, code: 'SUPER_ADMIN', is_system: true }], { company_id: null, is_system: false }, (row) => ({ ...row, role_permissions: rolePermissions.rows.filter((grant) => grant.role_id === row.id).map((grant) => ({ ...grant, permission: permissions.rows.find((permission) => permission.id === grant.permission_id) })) }));
  const assignments = table([], { expires_at: null }, (row) => ({ ...row, role: roles.rows.find((role) => role.id === row.role_id) }));
  const integrations = table([{ id: m.integration, company_id: ids.companyA, integration_key: 'partner', name: 'Partner', status: 'PREPARED', config: { secret: 'never-return-this' } }, { id: m.foreignIntegration, company_id: ids.companyB }], { status: 'PREPARED', config: {} });
  const services = table([{ id: m.service, company_id: ids.companyA, service_code: 'SERVICE_A', status: 'PREPARED' }, { id: m.foreignService, company_id: ids.companyB }]);
  const settings = table([{ id: ids.flag, key: 'SUPABASE_SECRET_KEY', value: { secret: 'never-return-this' } }]);
  const rbacLookup = h.prisma.userRole.findMany;
  assignments.api.findMany.mockImplementation(async (args: any) => args.where?.role?.role_permissions ? rbacLookup(args) : assignments.rows.filter((row) => matches(row, args.where)).map((row) => projected({ ...row, role: roles.rows.find((role) => role.id === row.role_id) }, args.select)));
  Object.assign(h.prisma, { project: projects.api, customerProperty: relationships.api, role: roles.api, permission: permissions.api, rolePermission: rolePermissions.api, userRole: assignments.api, companyIntegration: integrations.api, businessService: services.api, systemSetting: settings.api });
  const tables = [projects, relationships, permissions, rolePermissions, roles, assignments, integrations, services, settings];
  // A transactional boundary double lets HTTP tests assert rollback paths; live
  // PostgreSQL lock/constraint behavior still requires separate integration testing.
  h.prisma.$transaction.mockImplementation(async (work: any) => {
    const snapshots = tables.map((entry) => structuredClone(entry.rows));
    try { return await work(h.prisma); }
    catch (error) { tables.forEach((entry, index) => entry.rows.splice(0, entry.rows.length, ...snapshots[index])); throw error; }
  });
  return { target, projects, relationships, roles, permissions, rolePermissions, assignments, integrations, services, settings };
}
