import request from 'supertest';
import { createHarness, Harness, ids } from './api-harness';
import { managementFixture, managementIds as m } from './management-fixture';

describe('administrative management HTTP contract', () => {
  let h: Harness;
  let db: ReturnType<typeof managementFixture>;
  const review = { review_reference: 'CASE-2026-001' };
  const statusBody = { account_status: 'DISABLED', expected_status: 'ACTIVE', ...review };
  const assignmentBody = { user_id: ids.propertyA, role_id: m.role, ...review };
  beforeEach(async () => {
    h = await createHarness();
    db = managementFixture(h);
    // structuredClone creates cross-realm Dates in Jest; Prisma returns local Dates.
    const findProject = h.prisma.project.findUniqueOrThrow.getMockImplementation();
    h.prisma.project.findUniqueOrThrow.mockImplementation(async (args: any) => {
      const row = await findProject(args);
      return { ...row, start_date: row.start_date ? new Date(row.start_date.getTime()) : null, target_completion: row.target_completion ? new Date(row.target_completion.getTime()) : null };
    });
    // Extend only this suite's boundary double: the shared fixture rolls back its
    // tables, while status mutations also touch the harness user/profile maps.
    const transaction = h.prisma.$transaction.getMockImplementation();
    h.prisma.$transaction.mockImplementation(async (...args: any[]) => {
      const users = structuredClone([...h.users]);
      const profiles = structuredClone([...h.profiles]);
      try { return await transaction(...args); }
      catch (error) {
        h.users.clear(); users.forEach(([id, value]) => h.users.set(id, value));
        h.profiles.clear(); profiles.forEach(([id, value]) => h.profiles.set(id, value));
        throw error;
      }
    });
  });
  afterEach(async () => { await h?.close(); });

  function send(method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, body?: object) {
    const call = request(h.app.getHttpServer())[method](`/api/v1/admin/${path}`).set('Authorization', `Bearer ${h.token}`);
    return body === undefined ? call : call.send(body);
  }
  function governance() { h.grant('role.manage'); h.grant('user.manage'); h.grant('permission.manage'); h.grant('property.view'); }
  function audit(action: string) { return h.prisma.auditLog.create.mock.calls.filter(([arg]: any) => arg.data.action === action); }
  function expectRecorded(action: string, event: string, scope: object = {}) {
    expect(h.prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action, actor_user_id: ids.user, ...scope }) });
    expect(h.prisma.activityEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ event_type: event, actor_user_id: ids.user, ...scope }) });
  }

  it('requires authentication and does not interpret customer roles as admin grants', async () => {
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/projects/${ids.projectA}`).send({ status: 'ACTIVE' }).expect(401);
    h.grant('project.edit');
    Object.assign(h.grants.get('project.edit')![0].role, { code: 'CUSTOMER' });
    await send('patch', `projects/${ids.projectA}`, { status: 'ACTIVE' }).expect(403);
    expect(h.prisma.project.update).not.toHaveBeenCalled();
  });

  it('updates a project with existing-resource scope, dates, audit and correlation metadata', async () => {
    h.grant('project.edit', ids.companyA, ids.projectA);
    const response = await send('patch', `projects/${ids.projectA}`, { project_name: ' Updated project ', status: 'ON_HOLD', target_completion: null }).set('X-Correlation-ID', 'management-project').expect(200);
    expect(response.body.data).toMatchObject({ id: ids.projectA, project_name: 'Updated project', status: 'ON_HOLD', target_completion: null });
    expectRecorded('project.update', 'PROJECT.UPDATED', { company_id: ids.companyA, project_id: ids.projectA });
    expect(audit('project.update')[0][0].data).toMatchObject({ request_id: response.body.meta.request_id, correlation_id: 'management-project', before_data: { target_completion: '2027-01-01T00:00:00.000Z' } });
    expect(h.prisma.$queryRaw.mock.calls.some(([sql]: any) => sql.join('').includes('FOR UPDATE'))).toBe(true);
  });

  it('rejects foreign/missing projects, immutable fields, nested writes and invalid merged dates', async () => {
    h.grant('project.edit', ids.companyA);
    await send('patch', `projects/${ids.projectB}?company_id=${ids.companyA}`, { status: 'ACTIVE' }).expect(403);
    await send('patch', `projects/${ids.flag}`, { status: 'ACTIVE' }).expect(404);
    await send('patch', 'projects/not-a-uuid', { status: 'ACTIVE' }).expect(400);
    for (const body of [{}, { company_id: ids.companyB }, { project_code: 'NEW' }, { company: { connect: { id: ids.companyB } } }, { status: 'INVALID' }, { project_name: '' }, { start_date: '2028-01-01T00:00:00Z' }, { target_completion: '2025-01-01T00:00:00Z' }]) {
      await send('patch', `projects/${ids.projectA}`, body).expect(400);
    }
    expect(h.prisma.project.update).not.toHaveBeenCalled();
  });

  it('updates relationships without allowing customer/property reparenting or cross-tenant access', async () => {
    h.grant('customer_property.manage', ids.companyA, ids.projectA);
    await send('patch', `customer-properties/${m.foreignRelationship}?company_id=${ids.companyA}`, { status: 'REVOKED' }).expect(403);
    for (const body of [{}, { customer_id: ids.user }, { property_id: ids.propertyB }, { property: { connect: { id: ids.propertyB } } }, { effective_to: '2025-01-01T00:00:00Z' }, { effective_from: null }]) await send('patch', `customer-properties/${m.relationship}`, body).expect(400);
    const response = await send('patch', `customer-properties/${m.relationship}`, { relationship_type: 'OWNER', status: 'INACTIVE', effective_to: '2026-06-01T00:00:00Z' }).expect(200);
    expect(response.body.data).toMatchObject({ property_id: ids.propertyA, customer_id: ids.propertyA, relationship_type: 'OWNER', status: 'INACTIVE' });
    await send('patch', `customer-properties/${m.relationship}`, { effective_from: '2026-07-01T00:00:00Z' }).expect(400);
    await send('patch', `customer-properties/${m.relationship}`, { effective_to: null }).expect(200);
    expectRecorded('customer_property.update', 'CUSTOMER_PROPERTY.UPDATED', { company_id: ids.companyA, project_id: ids.projectA });
  });

  it.each([
    ['patch', `users/${ids.propertyA}/status`, 'user.manage', statusBody],
    ['post', 'roles', 'role.manage', { code: 'NEW_ROLE', name: 'New role' }],
    ['patch', `roles/${m.role}`, 'role.manage', { name: 'Updated' }],
    ['delete', `roles/${m.role}`, 'role.manage', review],
    ['post', 'user-roles', 'role.manage', assignmentBody],
    ['delete', `user-roles/${ids.flag}`, 'role.manage', review],
    ['put', `roles/${m.role}/permissions`, 'role.manage', { permission_ids: [], ...review }],
    ['put', 'system-settings/maintenance_notice', 'system_settings.manage', { value: { enabled: false, message: '' }, ...review }],
  ] as const)('requires global grants for %s %s', async (method, path, permission, body) => {
    await send(method, path, body).expect(403);
    h.grant(permission, ids.companyA);
    await send(method, `${path}?company_id=${ids.companyA}`, body).expect(403);
    h.grant(permission, ids.companyA, ids.projectA);
    await send(method, path, body).expect(403);
    expect(h.prisma.$executeRaw.mock.calls.some(([sql]: any) => /734821906|734821907/.test(sql.join('')))).toBe(false);
    expect(h.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('changes account/profile status only, with optimistic state checking and idempotent retry', async () => {
    h.grant('user.manage');
    await send('patch', `users/${db.target.id}/status`, { ...statusBody, expected_status: 'PENDING' }).expect(409);
    const response = await send('patch', `users/${db.target.id}/status`, statusBody).expect(200);
    expect(response.body.data).toEqual({ id: db.target.id, account_status: 'DISABLED' });
    expect(h.users.get(db.target.id)).toMatchObject({ account_status: 'DISABLED', verification_status: 'PENDING', supabase_user_id: ids.propertyB });
    expect(h.profiles.get(db.target.id).account_status).toBe('DISABLED');
    expectRecorded('user.status.update', 'USER.STATUS_CHANGED');
    await send('patch', `users/${db.target.id}/status`, statusBody).expect(200);
    expect(audit('user.status.update')).toHaveLength(1);
    expect(h.issuance.issueForUser).not.toHaveBeenCalled();
  });

  it('protects self/bootstrap administrators and refuses arbitrary status/auth writes', async () => {
    h.grant('user.manage');
    await send('patch', `users/${ids.user}/status`, statusBody).expect(403);
    for (const body of [{}, { ...statusBody, verification_status: 'VERIFIED' }, { ...statusBody, profile: { update: {} } }, { ...statusBody, auth_email_confirmed_at: '2026-01-01' }, { ...statusBody, company_id: ids.companyA }, { ...statusBody, review_reference: 'private@example.test' }]) await send('patch', `users/${db.target.id}/status`, body).expect(400);
    db.assignments.rows.push({ id: ids.flag, user_id: db.target.id, role_id: m.superRole, company_id: null, project_id: null, expires_at: null });
    await send('patch', `users/${db.target.id}/status`, statusBody).expect(403);
    expect(audit('user.status.update')).toHaveLength(0);
  });

  it.each([{ auth_email_confirmed_at: null }, { auth_email_confirmed_at: new Date('2999-01-01') }, { supabase_user_id: null }])('requires confirmed linked identity to reactivate %j', async (fields) => {
    h.grant('user.manage'); Object.assign(db.target, fields, { account_status: 'DISABLED' });
    await send('patch', `users/${db.target.id}/status`, { account_status: 'ACTIVE', expected_status: 'DISABLED', ...review }).expect(409);
  });

  it('creates, updates and deletes custom roles, protecting codes, scope and system metadata', async () => {
    h.grant('role.manage');
    for (const body of [{ code: 'CUSTOMER', name: 'Customer' }, { code: 'SUPER_ADMIN', name: 'Super' }]) await send('post', 'roles', body).expect(403);
    await send('post', 'roles', { code: 'NEW_ROLE', name: 'Role', is_system: true }).expect(400);
    await send('post', 'roles', { code: 'REVIEWER', name: 'Duplicate' }).expect(409);
    const created = await send('post', 'roles', { code: 'CUSTOM_REVIEWER', name: 'Custom reviewer', company_id: ids.companyA }).expect(201);
    expect(created.body.data).toMatchObject({ company_id: ids.companyA, is_system: false });
    const path = `roles/${created.body.data.id}`;
    await send('patch', path, { description: 'Reviewed role', name: 'Renamed' }).expect(200);
    for (const body of [{}, { code: 'SUPER_ADMIN' }, { company_id: ids.companyB }, { is_system: true }, { role_permissions: { create: {} } }]) await send('patch', path, body).expect(400);
    await send('patch', `roles/${m.customerRole}`, { name: 'Renamed' }).expect(403);
    await send('delete', `roles/${m.superRole}`, review).expect(403);
    await send('delete', path, review).expect(200);
    expectRecorded('role.create', 'ROLE.CREATED', { company_id: ids.companyA });
    expectRecorded('role.update', 'ROLE.UPDATED', { company_id: ids.companyA });
    expectRecorded('role.delete', 'ROLE.DELETED', { company_id: ids.companyA });
  });

  it('requires both global permission governance grants and delegation authority', async () => {
    h.grant('role.manage');
    const body = { permission_ids: [m.privilegedPermission], ...review };
    await send('put', `roles/${m.role}/permissions`, body).expect(403);
    h.grant('permission.manage', ids.companyA);
    await send('put', `roles/${m.role}/permissions`, body).expect(403);
    h.grant('permission.manage'); h.grant('system_settings.manage', ids.companyA);
    await send('put', `roles/${m.role}/permissions`, body).expect(403);
    expect(h.prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    h.grant('system_settings.manage');
    const response = await send('put', `roles/${m.role}/permissions`, body).expect(200);
    expect(response.body.data).toEqual({ id: m.role, permission_ids: [m.privilegedPermission] });
    await send('put', `roles/${m.role}/permissions`, body).expect(200);
    expect(audit('role.permissions.replace')).toHaveLength(1);
    expectRecorded('role.permissions.replace', 'ROLE.PERMISSIONS_UPDATED');
    await send('put', `roles/${m.role}/permissions`, { permission_ids: [], ...review }).expect(200);
    expect(db.rolePermissions.rows).toHaveLength(0);
  });

  it('refuses unknown/duplicate permissions and customer or bootstrap privilege changes', async () => {
    governance();
    for (const body of [{ permission_ids: [ids.flag], ...review }, { permission_ids: [m.permission, m.permission], ...review }, { permission_ids: [], ...review, permissions: { create: {} } }]) await send('put', `roles/${m.role}/permissions`, body).expect(400);
    await send('put', `roles/${m.customerRole}/permissions`, { permission_ids: [m.permission], ...review }).expect(403);
    await send('put', `roles/${m.superRole}/permissions`, { permission_ids: [], ...review }).expect(403);
    expect(h.prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    // Removing legacy CUSTOMER permissions is allowed; adding admin rights is not.
    db.rolePermissions.rows.push({ role_id: m.customerRole, permission_id: m.permission });
    await send('put', `roles/${m.customerRole}/permissions`, { permission_ids: [], ...review }).expect(200);
    expect(db.rolePermissions.rows.filter((row) => row.role_id === m.customerRole)).toHaveLength(0);
  });

  it('derives assignment company from tenant role or project, never broadening a tenant role', async () => {
    governance();
    db.roles.rows[0].company_id = ids.companyA;
    const response = await send('post', 'user-roles', { ...assignmentBody, project_id: ids.projectA }).expect(201);
    expect(response.body.data).toMatchObject({ company_id: ids.companyA, project_id: ids.projectA, expires_at: null });
    await send('post', 'user-roles', { ...assignmentBody, project_id: ids.projectA }).expect(201);
    expect(db.assignments.rows).toHaveLength(1);
    expect(audit('user_role.assign')).toHaveLength(1);
    await send('post', 'user-roles', { ...assignmentBody, company_id: ids.companyB }).expect(400);
    await send('post', 'user-roles', { ...assignmentBody, project_id: ids.projectB }).expect(400);
    await send('post', 'user-roles', { ...assignmentBody, project_id: ids.projectA, expires_at: '2999-01-01T00:00:00Z' }).expect(409);
    await send('delete', `roles/${m.role}`, review).expect(409);
    expectRecorded('user_role.assign', 'USER_ROLE.ASSIGNED', { company_id: ids.companyA, project_id: ids.projectA });
    await send('delete', `user-roles/${response.body.data.id}`, review).expect(200);
    expect(db.assignments.rows).toHaveLength(0);
    expectRecorded('user_role.remove', 'USER_ROLE.REMOVED', { company_id: ids.companyA, project_id: ids.projectA });
  });

  it('requires global user management and globally held delegated permissions for assignment', async () => {
    h.grant('role.manage');
    await send('post', 'user-roles', assignmentBody).expect(403);
    h.grant('user.manage', ids.companyA);
    await send('post', 'user-roles', assignmentBody).expect(403);
    h.grant('user.manage'); h.grant('property.view', ids.companyA);
    await send('post', 'user-roles', { ...assignmentBody, company_id: ids.companyA }).expect(403);
    expect(h.prisma.userRole.create).not.toHaveBeenCalled();
  });

  it('protects self/super assignments and rejects malformed or expired grants', async () => {
    governance();
    await send('post', 'user-roles', { ...assignmentBody, user_id: ids.user }).expect(403);
    await send('post', 'user-roles', { ...assignmentBody, role_id: m.superRole }).expect(403);
    for (const body of [{ ...assignmentBody, expires_at: '2020-01-01T00:00:00Z' }, { ...assignmentBody, company_id: null }, { ...assignmentBody, role: { connect: { id: m.superRole } } }]) await send('post', 'user-roles', body).expect(400);
    db.assignments.rows.push({ id: ids.flag, user_id: ids.user, role_id: m.role }, { id: ids.projectB, user_id: db.target.id, role_id: m.superRole });
    await send('delete', `user-roles/${ids.flag}`, review).expect(403);
    await send('delete', `user-roles/${ids.projectB}`, review).expect(403);
    expect(h.prisma.userRole.delete).not.toHaveBeenCalled();
  });

  it.each([{ account_status: 'DISABLED' }, { account_status: 'PENDING' }, { auth_email_confirmed_at: null }, { supabase_user_id: null }])('refuses assignments to ineligible identities %j', async (fields) => {
    governance(); Object.assign(db.target, fields);
    await send('post', 'user-roles', assignmentBody).expect(409);
    expect(h.prisma.userRole.create).not.toHaveBeenCalled();
  });

  it('lists user-role assignments only for global role viewers with strict filters', async () => {
    await send('get', 'user-roles').expect(403);
    h.grant('role.view', ids.companyA);
    await send('get', 'user-roles').expect(403);
    h.grant('role.view'); governance();
    const assigned = await send('post', 'user-roles', assignmentBody).expect(201);
    const response = await send('get', `user-roles?user_id=${ids.propertyA}&role_id=${m.role}&take=10&skip=0`).expect(200);
    expect(response.body.data).toEqual([expect.objectContaining({ id: assigned.body.data.id, user_id: ids.propertyA, role: { code: 'REVIEWER', name: 'Reviewer' } })]);
    await send('get', 'user-roles?include=credentials').expect(400);
  });

  it.each([
    ['integrations', m.integration, m.foreignIntegration, { company_id: ids.companyA, integration_key: 'new.partner', name: 'Partner' }, { name: 'Updated', status: 'ACTIVE' }, 'integration', 'INTEGRATION'],
    ['business-services', m.service, m.foreignService, { company_id: ids.companyA, service_code: 'NEW_SERVICE', service_name: 'New service', service_type: 'PROPERTY' }, { service_name: 'Updated', requires_property: true, status: 'ACTIVE' }, 'business_service', 'BUSINESS_SERVICE'],
  ] as const)('creates and updates company-scoped %s metadata without reparenting', async (path, id, foreignId, createBody, patchBody, action, event) => {
    h.grant('integration.manage', ids.companyA, ids.projectA);
    await send('post', path, createBody).expect(403);
    h.grant('integration.manage', ids.companyA);
    await send('post', path, { ...createBody, company_id: ids.companyB }).expect(403);
    await send('patch', `${path}/${foreignId}?company_id=${ids.companyA}`, patchBody).expect(403);
    const created = await send('post', path, createBody).expect(201);
    expect(created.body.data.company_id).toBe(ids.companyA);
    const updated = await send('patch', `${path}/${id}`, patchBody).expect(200);
    expect(updated.body.data).toMatchObject(patchBody);
    for (const body of [{}, { company_id: ids.companyB }, { config: { api_key: 'forbidden' } }, { company: { connect: { id: ids.companyB } } }]) await send('patch', `${path}/${id}`, body).expect(400);
    await send('patch', `${path}/${ids.flag}`, patchBody).expect(404);
    expectRecorded(`${action}.create`, `${event}.CREATED`, { company_id: ids.companyA });
    expectRecorded(`${action}.update`, `${event}.UPDATED`, { company_id: ids.companyA });
    expect(JSON.stringify(updated.body)).not.toContain('config');
    expect(JSON.stringify(h.prisma.auditLog.create.mock.calls)).not.toContain('never-return-this');
  });

  it('refuses integration configs/credentials and future wallet/rewards service switches', async () => {
    h.grant('integration.manage');
    for (const field of ['config', 'credential_ref', 'api_key']) await send('post', 'integrations', { company_id: ids.companyA, integration_key: 'partner', name: 'Partner', [field]: 'forbidden' }).expect(400);
    for (const field of ['wallet_eligible', 'rewards_eligible']) {
      await send('post', 'business-services', { company_id: ids.companyA, service_code: 'NEW_SERVICE', service_name: 'New', service_type: 'PROPERTY', [field]: true }).expect(400);
      await send('patch', `business-services/${m.service}`, { [field]: true }).expect(400);
    }
    expect(h.prisma.companyIntegration.create).not.toHaveBeenCalled();
    expect(h.prisma.businessService.create).not.toHaveBeenCalled();
  });

  it.each([
    ['support_contact', { email: 'support@example.test' }],
    ['maintenance_notice', { enabled: true, message: 'Scheduled maintenance' }],
    ['month_1_acceptance_state', { status: 'under_review' }],
  ] as const)('upserts allowlisted setting %s with reviewed audit and no legacy value leakage', async (key, value) => {
    h.grant('system_settings.manage');
    db.settings.rows.push({ id: ids.projectA, key, value: { arbitrary: 'never-return-this' } });
    const response = await send('put', `system-settings/${key}`, { value, ...review }).expect(200);
    expect(response.body.data).toMatchObject({ key, value });
    expectRecorded('system_setting.update', 'SYSTEM_SETTING.UPDATED');
    expect(audit('system_setting.update')[0][0].data.before_data).toEqual({ key });
    expect(JSON.stringify(h.prisma.auditLog.create.mock.calls)).not.toContain('never-return-this');
    expect(h.prisma.$executeRaw.mock.calls.some(([sql]: any) => sql.join('').includes('pg_advisory_xact_lock'))).toBe(true);
  });

  it('creates absent allowlisted settings and validates keys and nested value shapes strictly', async () => {
    h.grant('system_settings.manage');
    await send('put', 'system-settings/maintenance_notice', { value: { enabled: false, message: '' }, ...review }).expect(200);
    for (const [key, value] of [['SUPABASE_SECRET_KEY', { secret: 'no' }], ['ENABLE_REGISTRATION', true], ['support_contact', { email: 'not-email' }], ['maintenance_notice', { enabled: true, message: 'Notice', secret: 'no' }], ['maintenance_notice', { enabled: 'true', message: '' }], ['month_1_acceptance_state', { status: 'deployed' }]]) await send('put', `system-settings/${key}`, { value, ...review }).expect(400);
    await send('put', 'system-settings/maintenance_notice', { value: { enabled: false, message: '' }, ...review, description: 'Unrestricted write' }).expect(400);
    h.grant('system_settings.view');
    const listed = await send('get', 'system-settings').expect(200);
    expect(listed.body.data.find((row: any) => row.key === 'SUPABASE_SECRET_KEY')).not.toHaveProperty('value');
  });

  it('honors feature gates before management mutations', async () => {
    governance(); h.grant('project.edit'); h.grant('customer_property.manage'); h.grant('integration.manage');
    h.flags.get('ENABLE_PROPERTIES')!.enabled = false;
    h.flags.get('ENABLE_INTEGRATION_FRAMEWORK')!.enabled = false;
    await send('patch', `projects/${ids.projectA}`, { status: 'ACTIVE' }).expect(403);
    await send('patch', `customer-properties/${m.relationship}`, { status: 'REVOKED' }).expect(403);
    await send('post', 'integrations', { company_id: ids.companyA, integration_key: 'partner', name: 'Partner' }).expect(403);
    await send('patch', `business-services/${m.service}`, { status: 'ACTIVE' }).expect(403);
    expect(h.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(['auditLog', 'activityEvent'] as const)('rolls back mutations when %s persistence fails', async (boundary) => {
    governance(); h.grant('project.edit'); h.grant('integration.manage'); h.grant('system_settings.manage');
    const cases = [
      ['patch', `projects/${ids.projectA}`, { status: 'ACTIVE' }, () => db.projects.rows],
      ['post', 'roles', { code: 'ROLLBACK_ROLE', name: 'Rollback' }, () => db.roles.rows],
      ['put', `roles/${m.role}/permissions`, { permission_ids: [], ...review }, () => db.rolePermissions.rows],
      ['post', 'user-roles', assignmentBody, () => db.assignments.rows],
      ['patch', `integrations/${m.integration}`, { status: 'ACTIVE' }, () => db.integrations.rows],
      ['put', 'system-settings/maintenance_notice', { value: { enabled: true, message: 'Test' }, ...review }, () => db.settings.rows],
      ['patch', `users/${db.target.id}/status`, statusBody, () => [h.users.get(db.target.id), h.profiles.get(db.target.id)]],
    ] as const;
    for (const [method, path, body, state] of cases) {
      const before = structuredClone(state());
      h.prisma[boundary].create.mockRejectedValueOnce(new Error('Database persistence failure'));
      await send(method, path, body).expect(500);
      expect(state()).toEqual(before);
    }
  });
});

describe('management review: data minimization, approved identity and machine delegation', () => {
  let h: Harness;
  beforeEach(async () => { h = await createHarness(); });
  afterEach(async () => { await h?.close(); });
  const denied = { code: 'FORBIDDEN', message: 'Access denied' };
  const invalid = { code: 'BAD_REQUEST', message: 'Invalid request data' };
  function patchMe(body: object) { return request(h.app.getHttpServer()).patch('/api/v1/me').set('Authorization', `Bearer ${h.token}`).send(body); }
  function issue(scopes: string[]) { return request(h.app.getHttpServer()).post('/api/v1/admin/api-clients').set('Authorization', `Bearer ${h.token}`).send({ company_id: ids.companyA, client_name: 'Reviewed partner', scopes }); }
  function rotate(body: object = {}) { return request(h.app.getHttpServer()).post(`/api/v1/admin/api-clients/${ids.propertyA}/rotate`).set('Authorization', `Bearer ${h.token}`).send(body); }
  function clientFixture(scopes: string[]) {
    const client = { id: ids.propertyA, company_id: ids.companyA, client_id: ids.subject, client_name: 'Reviewed partner', status: 'ACTIVE', scopes, credential_ref: 'never-return-credential', company: { status: 'ACTIVE', api_enabled: true } };
    const project = (select: any) => Object.fromEntries(Object.entries(client).filter(([key]) => select?.[key] === true));
    h.prisma.companyApiClient.findUnique.mockResolvedValue(client);
    h.prisma.companyApiClient.findUniqueOrThrow.mockResolvedValue(client);
    h.prisma.companyApiClient.update.mockImplementation(async ({ data, select }: any) => { Object.assign(client, data); return project(select); });
    h.prisma.companyApiClient.findMany.mockImplementation(async ({ select }: any) => [project(select)]);
    return client;
  }

  it('returns relationship scalars without customer/property expansion for relationship-only viewers', async () => {
    const db = managementFixture(h);
    Object.assign(db.relationships.rows[0], { customer: { email: 'private@example.test', profile: { first_name: 'Private', rhc_id: 'RHC-2026-99999999' } } });
    h.grant('customer_property.view', ids.companyA);
    const response = await request(h.app.getHttpServer()).get('/api/v1/admin/customer-properties').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(response.body.data).toEqual([expect.objectContaining({ id: m.relationship, customer_id: ids.propertyA, property_id: ids.propertyA, relationship_type: 'BUYER', status: 'ACTIVE' })]);
    expect(response.body.data[0]).not.toHaveProperty('customer');
    expect(response.body.data[0]).not.toHaveProperty('property');
    expect(JSON.stringify(response.body)).not.toMatch(/private@example|RHC-2026|Private/);
    const args = h.prisma.customerProperty.findMany.mock.calls[0][0];
    expect(args).not.toHaveProperty('include');
    expect(Object.keys(args.select).sort()).toEqual(['id', 'customer_id', 'property_id', 'relationship_type', 'status', 'effective_from', 'effective_to', 'created_at', 'updated_at'].sort());
    expect(h.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it.each(['user', 'profile', 'rhc_id', 'rhc_id_issued_at'])('locks all approved identity/address fields when %s establishes protected state', async (state) => {
    const profile = h.profiles.get(ids.user);
    if (state === 'user') h.user.verification_status = 'VERIFIED';
    else if (state === 'profile') profile.verification_status = 'VERIFIED';
    else if (state === 'rhc_id') profile.rhc_id = 'RHC-2026-00000001';
    else profile.rhc_id_issued_at = new Date('2026-01-01');
    const before = { ...profile };
    const fields = { first_name: 'Changed', middle_name: null, last_name: 'Changed', suffix: null, birth_date: '2000-01-01', nationality: 'Changed', address_line: 'Changed', barangay: 'Changed', city: 'Changed', province: 'Changed', postal_code: '1234', country: 'Changed' };
    for (const [field, value] of Object.entries(fields)) {
      const response = await patchMe({ [field]: value }).expect(403);
      expect(response.body.error).toEqual(denied);
    }
    expect(h.profiles.get(ids.user)).toEqual(before);
    expect(h.prisma.userProfile.update).not.toHaveBeenCalled();
    expect(h.prisma.auditLog.create).not.toHaveBeenCalled();
    expect(h.issuance.issueForUser).not.toHaveBeenCalled();
  });

  it('allows only validated contact mobile updates after approval, without altering approval or ID', async () => {
    h.user.verification_status = 'VERIFIED';
    const profile = h.profiles.get(ids.user);
    Object.assign(profile, { verification_status: 'VERIFIED', rhc_id: 'RHC-2026-00000001', rhc_id_issued_at: new Date('2026-01-01'), first_name: 'Approved' });
    const response = await patchMe({ mobile_number: '+639171234567' }).expect(200);
    expect(response.body.data).toMatchObject({ mobile_number: '+639171234567', verification_status: 'VERIFIED', rhc_id: 'RHC-2026-00000001', first_name: 'Approved' });
    expect((await patchMe({ mobile_number: null }).expect(200)).body.data.mobile_number).toBeNull();
    expect((await patchMe({ mobile_number: '+639171234567', city: 'Changed' }).expect(403)).body.error).toEqual(denied);
    expect(profile.mobile_number).toBeNull();
    for (const body of [{ mobile_number: '09171234567' }, { mobile_number: { set: '+639171234567' } }, { mobile_number: '+012345678' }, { email: 'changed@example.test' }, { rhc_id: null }, {}]) expect((await patchMe(body).expect(400)).body.error).toEqual(invalid);
    expect(h.prisma.auditLog.create.mock.calls.filter(([arg]: any) => arg.data.action === 'profile.update')).toHaveLength(2);
    expect(h.prisma.auditLog.create.mock.calls[0][0].data.after_data).toEqual({ changed_fields: ['mobile_number'] });
    expect(h.user.verification_status).toBe('VERIFIED');
    expect(h.issuance.issueForUser).not.toHaveBeenCalled();
  });

  it('permits pre-approval identity edits without changing verification or issuing an ID', async () => {
    await patchMe({ first_name: 'Reviewed later', city: 'Manila', birth_date: '2000-02-29' }).expect(200);
    expect(h.user.verification_status).toBe('PENDING');
    expect(h.profiles.get(ids.user)).toMatchObject({ first_name: 'Reviewed later', city: 'Manila', verification_status: 'PENDING', rhc_id: null });
    expect(h.issuance.issueForUser).not.toHaveBeenCalled();
  });

  it.each([['properties.read', 'property.view'], ['identity.verify', 'customer.view'], ['projects.read', 'project.view']])('requires whole-company delegation of %s on issuance and rotation', async (scope, permission) => {
    h.grant('integration.manage', ids.companyA);
    const client = clientFixture([scope]);
    for (const grant of ['absent', 'foreign', 'project', 'customer']) {
      if (grant === 'foreign') h.grant(permission, ids.companyB);
      if (grant === 'project') h.grant(permission, ids.companyA, ids.projectA);
      if (grant === 'customer') { h.grant(permission, ids.companyA); Object.assign(h.grants.get(permission)![0].role, { code: 'CUSTOMER' }); }
      expect((await issue([scope]).expect(403)).body.error).toEqual(denied);
      expect((await rotate().expect(403)).body.error).toEqual(denied);
    }
    expect(client.credential_ref).toBe('never-return-credential');
    expect(h.prisma.companyApiClient.create).not.toHaveBeenCalled();
    expect(h.prisma.companyApiClient.update).not.toHaveBeenCalled();
    expect(h.prisma.auditLog.create).not.toHaveBeenCalled();
    h.grant(permission, ids.companyA);
    await issue([scope]).expect(201);
    const rotation = await rotate().expect(201);
    expect(rotation.headers['cache-control']).toBe('no-store');
    expect(rotation.body.data.api_key).toMatch(/^rhc_[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/);
    expect(rotation.body.data.client.scopes).toEqual([scope]);
    expect(rotation.body.data.client).not.toHaveProperty('credential_ref');
    expect(JSON.stringify(h.prisma.auditLog.create.mock.calls)).not.toContain(rotation.body.data.api_key);
  });

  it('allows globally held read delegation only within the integration manager company', async () => {
    h.grant('integration.manage', ids.companyA); h.grant('property.view'); h.grant('customer.view');
    await issue(['properties.read', 'identity.verify']).expect(201);
    clientFixture(['properties.read', 'identity.verify']).company_id = ids.companyB;
    expect((await rotate().expect(403)).body.error).toEqual(denied);
    expect(h.prisma.companyApiClient.update).not.toHaveBeenCalled();
  });

  it('rechecks every stored scope during rotation, refuses scope replacement and unknown legacy scopes', async () => {
    h.grant('integration.manage', ids.companyA); h.grant('property.view', ids.companyA);
    const client = clientFixture(['properties.read', 'identity.verify']);
    expect((await rotate().expect(403)).body.error).toEqual(denied);
    expect((await rotate({ scopes: ['company.read'] }).expect(400)).body.error).toEqual(invalid);
    h.grant('customer.view', ids.companyA);
    await rotate().expect(201);
    h.grants.delete('customer.view');
    expect((await rotate().expect(403)).body.error).toEqual(denied);
    client.scopes = ['admin.write'];
    expect((await rotate().expect(403)).body.error).toEqual(denied);
    expect(h.prisma.companyApiClient.update).toHaveBeenCalledTimes(1);
  });

  it('keeps company metadata/event delegation explicit and rejects CUSTOMER integration grants', async () => {
    h.grant('integration.manage', ids.companyA);
    await issue(['company.read', 'events.write']).expect(201);
    clientFixture(['company.read', 'events.write']);
    await rotate().expect(201);
    Object.assign(h.grants.get('integration.manage')![0].role, { code: 'CUSTOMER' });
    expect((await issue(['events.write']).expect(403)).body.error).toEqual(denied);
    expect((await rotate().expect(403)).body.error).toEqual(denied);
  });

  it('preserves secret-free read-only lists and emergency revocation without delegated read grants', async () => {
    const client = clientFixture(['properties.read', 'identity.verify']);
    h.grant('integration.view', ids.companyA);
    const response = await request(h.app.getHttpServer()).get('/api/v1/admin/api-clients').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(response.body.data[0]).toMatchObject({ id: client.id, scopes: client.scopes });
    expect(response.body.data[0]).not.toHaveProperty('credential_ref');
    expect(JSON.stringify(response.body)).not.toContain('never-return-credential');
    expect(h.prisma.companyApiClient.create).not.toHaveBeenCalled();
    expect(h.prisma.companyApiClient.update).not.toHaveBeenCalled();
    h.grant('integration.manage', ids.companyA); h.flags.get('ENABLE_INTEGRATION_FRAMEWORK')!.enabled = false;
    await request(h.app.getHttpServer()).post(`/api/v1/admin/api-clients/${client.id}/revoke`).set('Authorization', `Bearer ${h.token}`).send({}).expect(201);
    expect(client.status).toBe('INACTIVE'); expect(client.credential_ref).toBeNull();
  });
});
