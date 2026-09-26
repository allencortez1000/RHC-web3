import request from 'supertest';
import { Prisma, PropertyStatus, type CustomerProperty } from '@prisma/client';
import { createHarness, Harness, ids } from './api-harness';

describe('backend security through Nest HTTP', () => {
  let h: Harness;
  beforeEach(async () => { h = await createHarness(); });
  afterEach(async () => { await h?.close(); });
  const property = { project_id: ids.projectA, property_code: 'A-102', asset_type: 'RESIDENTIAL', status: PropertyStatus.AVAILABLE };
  const evidenceDelegates = ['propertyStatusHistory', 'auditLog', 'activityEvent'] as const;

  function propertyState() {
    return structuredClone({ properties: h.properties, propertyHistory: h.propertyHistory, auditLogs: h.auditLogs, activityEvents: h.activityEvents });
  }

  function expectPropertyTransaction(evidence: ReadonlyArray<(typeof evidenceDelegates)[number]> = evidenceDelegates) {
    // Auth also takes a row lock; check the parameterized property lock specifically.
    const lockIndices: number[] = h.prisma.$queryRaw.mock.calls.flatMap(([sql, id]: [TemplateStringsArray, unknown], index: number) => sql.join('').includes('FROM properties') && id === ids.propertyA ? [index] : []);
    expect(lockIndices.length).toBeGreaterThan(0);
    const lockIndex = lockIndices.at(-1)!;
    const [sql, ...parameters] = h.prisma.$queryRaw.mock.calls[lockIndex];
    expect([...sql]).toEqual(['SELECT id FROM properties WHERE id = ', '::uuid FOR UPDATE']);
    expect(parameters).toEqual([ids.propertyA]);
    const tx = h.prisma.$queryRaw.mock.contexts[lockIndex];
    expect(tx).not.toBe(h.prisma);
    let previousCall = h.prisma.$queryRaw.mock.invocationCallOrder[lockIndex];
    for (const [delegate, method] of [['property', 'findUniqueOrThrow'], ['property', 'update'], ...evidence.map((delegate) => [delegate, 'create'])]) {
      const mock = h.prisma[delegate][method];
      expect(tx[delegate]).not.toBe(h.prisma[delegate]);
      expect(mock.mock.contexts.at(-1)).toBe(tx[delegate]);
      expect(previousCall).toBeLessThan(mock.mock.invocationCallOrder.at(-1));
      previousCall = mock.mock.invocationCallOrder.at(-1);
    }
  }

  it('rejects anonymous, mock, and forged bearer tokens without bypassing auth', async () => {
    for (const token of [undefined, 'mock-token', 'not.a.jwt']) {
      const call = request(h.app.getHttpServer()).get('/api/v1/admin/users');
      if (token) call.set('Authorization', `Bearer ${token}`);
      await call.expect(401);
    }
    expect(h.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('redacts legacy audit payloads when reading them', async () => {
    h.grant('audit.view', ids.companyA);
    h.prisma.auditLog.findMany.mockResolvedValue([{ id: 'legacy', before_data: { credential_ref: 'legacy-hash', password: 'old-secret' }, after_data: { nested: { apiKey: 'live-key' } } }]);
    const result = await request(h.app.getHttpServer()).get('/api/v1/admin/audit-logs').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(result.body.data[0].before_data).toEqual({ credential_ref: '[REDACTED]', password: '[REDACTED]' });
    expect(result.body.data[0].after_data.nested.apiKey).toBe('[REDACTED]');
  });

  it('accepts a genuinely signed JWT but denies absent permissions', async () => {
    await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(200);
    await request(h.app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${h.token}`).expect(403);
  });

  it('constrains project-scoped property lists even without caller scope', async () => {
    h.grant('property.view', ids.companyA, ids.projectA);
    await request(h.app.getHttpServer()).get('/api/v1/admin/properties').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(h.prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ project: { OR: [{ company_id: ids.companyA, id: ids.projectA }] } }, expect.any(Object)] }, take: 100, skip: 0 }));
  });

  it.each([
    ['companies', 'company.view', 'company'],
    ['projects', 'project.view', 'project'],
    ['customers', 'customer.view', 'user'],
    ['customer-properties', 'customer_property.view', 'customerProperty'],
    ['integrations', 'integration.view', 'companyIntegration'],
    ['business-services', 'integration.view', 'businessService'],
    ['audit-logs', 'audit.view', 'auditLog'],
    ['roles', 'role.view', 'role'],
  ])('applies tenant filters to the %s list without query hints', async (route, permission, model) => {
    h.grant(permission, ids.companyA);
    await request(h.app.getHttpServer()).get(`/api/v1/admin/${route}`).set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(JSON.stringify(h.prisma[model].findMany.mock.calls[0][0].where)).toContain(ids.companyA);
    expect(h.prisma[model].findMany.mock.calls[0][0].take).toBeLessThanOrEqual(200);
  });

  it('keeps dashboard property counts configurable and permission-scoped', async () => {
    h.grant('company.view', ids.companyA);
    h.prisma.property.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const deniedMetrics = await request(h.app.getHttpServer()).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(deniedMetrics.body.data).toMatchObject({ totalAmicaProperties: 0, availableProperties: 0, reservedProperties: 0 });
    expect(h.prisma.property.count.mock.calls).toEqual([
      [{ where: { project: { OR: [] } } }],
      [{ where: { AND: [{ project: { OR: [] } }, { status: PropertyStatus.AVAILABLE }] } }],
      [{ where: { AND: [{ project: { OR: [] } }, { status: PropertyStatus.RESERVED }] } }],
    ]);

    h.grant('property.view', ids.companyA, ids.projectA);
    h.prisma.property.count.mockClear();
    h.prisma.property.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    const result = await request(h.app.getHttpServer()).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(result.body.data).toMatchObject({ totalAmicaProperties: 2, availableProperties: 1, reservedProperties: 1 });
    const scope = { project: { OR: [{ company_id: ids.companyA, id: ids.projectA }] } };
    expect(h.prisma.property.count.mock.calls).toEqual([
      [{ where: scope }],
      [{ where: { AND: [scope, { status: PropertyStatus.AVAILABLE }] } }],
      [{ where: { AND: [scope, { status: PropertyStatus.RESERVED }] } }],
    ]);
  });

  it('returns customer-property scalar labels and scope without expanding sensitive relations', async () => {
    h.grant('customer_property.view', ids.companyA, ids.projectA);
    const date = new Date('2026-01-01T00:00:00.000Z');
    const relationship: CustomerProperty = { id: ids.subject, customer_id: ids.user, property_id: ids.propertyA, relationship_type: 'BUYER', status: 'ACTIVE', effective_from: date, effective_to: null, created_at: date, updated_at: date };
    const propertySelect = { id: true, property_code: true, project_id: true, project: { select: { company_id: true } } } as const satisfies Prisma.PropertySelect;
    const selectedProperty: Prisma.PropertyGetPayload<{ select: typeof propertySelect }> = { id: ids.propertyA, property_code: 'A-101', project_id: ids.projectA, project: { company_id: ids.companyA } };
    // These are Prisma-selected rows, not pre-enriched HTTP responses or unselected relations.
    h.prisma.customerProperty.findMany.mockResolvedValueOnce([relationship]);
    h.prisma.property.findMany.mockResolvedValueOnce([selectedProperty]);

    const result = await request(h.app.getHttpServer()).get(`/api/v1/admin/customer-properties?company_id=${ids.companyA}&project_id=${ids.projectA}&take=10&skip=0`).set('Authorization', `Bearer ${h.token}`).expect(200);

    expect(result.body.data).toEqual([{ ...relationship, effective_from: date.toISOString(), created_at: date.toISOString(), updated_at: date.toISOString(), property_code: 'A-101', property_project_id: ids.projectA, property_company_id: ids.companyA }]);
    expect(h.prisma.customerProperty.findMany).toHaveBeenCalledWith({
      where: { AND: [{ property: { project: { OR: [{ company_id: ids.companyA, id: ids.projectA }] } } }, { property: { project: { company_id: ids.companyA, id: ids.projectA } } }] },
      select: { id: true, customer_id: true, property_id: true, relationship_type: true, status: true, effective_from: true, effective_to: true, created_at: true, updated_at: true },
      take: 10, skip: 0, orderBy: { id: 'asc' },
    });
    expect(h.prisma.property.findMany).toHaveBeenCalledWith({ where: { id: { in: [ids.propertyA] } }, select: propertySelect });
    for (const field of ['customer', 'profile', 'property', 'project', 'company', 'metadata', 'reservations', 'status_history']) expect(result.body.data[0]).not.toHaveProperty(field);
    expect(h.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('does not fetch property enrichment for an empty customer-property page', async () => {
    h.grant('customer_property.view', ids.companyA);
    const result = await request(h.app.getHttpServer()).get('/api/v1/admin/customer-properties').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(result.body.data).toEqual([]);
    expect(h.prisma.property.findMany).not.toHaveBeenCalled();
  });

  it('ANDs foreign list filters with permission-derived filters rather than replacing them', async () => {
    h.grant('property.view', ids.companyA);
    await request(h.app.getHttpServer()).get(`/api/v1/admin/properties?company_id=${ids.companyB}`).set('Authorization', `Bearer ${h.token}`).expect(200);
    const where = h.prisma.property.findMany.mock.calls[0][0].where;
    expect(where.AND[0]).toEqual({ project: { OR: [{ company_id: ids.companyA }] } });
    expect(where.AND[1].project).toEqual({ company_id: ids.companyB });
  });

  it('uses the stored property scope, ignoring forged query scope on mutations', async () => {
    h.grant('property.edit', ids.companyA, ids.projectA);
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyB}?company_id=${ids.companyA}&project_id=${ids.projectA}`).set('Authorization', `Bearer ${h.token}`).send({ floor: '2' }).expect(403);
    expect(h.prisma.property.update).not.toHaveBeenCalled();
  });

  it('authorizes company updates from the URL resource, not query scope', async () => {
    h.grant('company.manage', ids.companyA);
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/companies/${ids.companyB}?company_id=${ids.companyA}`).set('Authorization', `Bearer ${h.token}`).send({ display_name: 'Changed' }).expect(403);
    expect(h.prisma.company.update).not.toHaveBeenCalled();
  });

  it('derives creation scope from the body project and its stored company', async () => {
    h.grant('property.create', ids.companyA, ids.projectA);
    await request(h.app.getHttpServer()).post(`/api/v1/admin/properties?project_id=${ids.projectA}`).set('Authorization', `Bearer ${h.token}`).send({ ...property, project_id: ids.projectB }).expect(403);
    await request(h.app.getHttpServer()).post('/api/v1/admin/properties').set('Authorization', `Bearer ${h.token}`).send(property).expect(201);
    expect(h.prisma.property.create).toHaveBeenCalledTimes(1);
  });

  it('does not let a project grant create sibling projects or access global controls', async () => {
    h.grant('project.create', ids.companyA, ids.projectA);
    h.grant('feature_flag.manage', ids.companyA);
    await request(h.app.getHttpServer()).post('/api/v1/admin/projects').set('Authorization', `Bearer ${h.token}`).send({ company_id: ids.companyA, project_code: 'NEW', project_name: 'New' }).expect(403);
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/feature-flags/${ids.flag}?company_id=${ids.companyA}`).set('Authorization', `Bearer ${h.token}`).send({ enabled: true }).expect(403);
  });

  it('rejects nested Prisma operations, unknown fields and tenant reassignment', async () => {
    h.grant('property.edit', ids.companyA);
    for (const body of [{ project_id: ids.projectB }, { project: { connect: { id: ids.projectB } } }, { list_price: { increment: 1 } }, { id: ids.propertyB }, { previous_status: PropertyStatus.AVAILABLE }, { actor_user_id: ids.propertyB }, { reservation_id: ids.propertyB }, { status: 'NOT_A_STATUS' }, {}]) {
      await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send(body).expect(400);
    }
    expect(h.prisma.property.update).not.toHaveBeenCalled();
  });

  it('requires both edit and status-change permission in the stored property scope', async () => {
    const before = propertyState();
    const patch = () => request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}?company_id=${ids.companyB}&project_id=${ids.projectB}`).set('Authorization', `Bearer ${h.token}`).send({ status: PropertyStatus.SOLD });
    h.grant('property.change_status', ids.companyA, ids.projectA);
    await patch().expect(403);
    h.grant('property.edit', ids.companyA, ids.projectA);
    h.grants.delete('property.change_status');
    await patch().expect(403);
    h.grant('property.change_status', ids.companyB, ids.projectB);
    await patch().expect(403);
    expect(propertyState()).toEqual(before);
    expect(h.prisma.property.update).not.toHaveBeenCalled();
    for (const delegate of evidenceDelegates) expect(h.prisma[delegate].create).not.toHaveBeenCalled();
    expect(h.prisma.$queryRaw.mock.calls.some(([, id]: [unknown, unknown]) => id === ids.propertyA)).toBe(false);
  });

  it.each([
    [PropertyStatus.AVAILABLE, PropertyStatus.HELD, 'PROPERTY.HELD'],
    [PropertyStatus.HELD, PropertyStatus.RESERVED, 'PROPERTY.RESERVED'],
    [PropertyStatus.RESERVED, PropertyStatus.SOLD, 'PROPERTY.UPDATED'],
  ] as const)('locks the stored %s row before changing to %s and recording %s', async (from, to, eventType) => {
    h.grant('property.edit', ids.companyA, ids.projectA);
    h.grant('property.change_status', ids.companyA, ids.projectA);
    h.properties[0].status = from;
    const result = await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).set('X-Correlation-ID', 'manual-property-status').send({ status: to }).expect(200);

    expect(result.body.data).toMatchObject({ id: ids.propertyA, status: to });
    expect(h.properties[0].status).toBe(to);
    const history = { property_id: ids.propertyA, previous_status: from, next_status: to, reason: 'Admin property status update', actor_user_id: ids.user };
    expect(h.prisma.propertyStatusHistory.create).toHaveBeenCalledTimes(1);
    expect(h.prisma.propertyStatusHistory.create).toHaveBeenCalledWith({ data: history });
    expect(h.propertyHistory).toEqual([{ ...history, id: expect.any(String), reservation_id: null, created_at: expect.any(Date) }]);
    const context = { actor_user_id: ids.user, company_id: ids.companyA, project_id: ids.projectA, entity_type: 'property', entity_id: ids.propertyA, request_id: result.body.meta.request_id, correlation_id: 'manual-property-status' };
    expect(h.auditLogs).toEqual([expect.objectContaining({ ...context, action: 'property.change_status', before_data: expect.objectContaining({ status: from }), after_data: expect.objectContaining({ status: to }) })]);
    expect(h.activityEvents).toEqual([expect.objectContaining({ ...context, event_type: eventType, payload: expect.objectContaining({ id: ids.propertyA, status: to }) })]);
    expectPropertyTransaction();
  });

  it('uses the status read after the property lock as the history source', async () => {
    h.grant('property.edit', ids.companyA);
    h.grant('property.change_status', ids.companyA);
    const queryRaw = h.prisma.$queryRaw.getMockImplementation();
    h.prisma.$queryRaw.mockImplementation(async (sql: TemplateStringsArray, ...values: unknown[]) => {
      // Simulate a newer stored value becoming visible at lock acquisition, not real contention.
      if (sql.join('').includes('FROM properties') && values[0] === ids.propertyA) {
        await Promise.resolve();
        h.properties[0].status = PropertyStatus.HELD;
      }
      return queryRaw(sql, ...values);
    });
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send({ status: PropertyStatus.SOLD }).expect(200);
    expect(h.propertyHistory[0]).toMatchObject({ previous_status: PropertyStatus.HELD, next_status: PropertyStatus.SOLD, actor_user_id: ids.user });
    expect(h.auditLogs[0].before_data).toMatchObject({ status: PropertyStatus.HELD });
    expectPropertyTransaction();
  });

  it.each([PropertyStatus.AVAILABLE, PropertyStatus.HELD, PropertyStatus.RESERVED])('edits %s property metadata without status permission, history, or a status event', async (status) => {
    h.grant('property.edit', ids.companyA);
    h.properties[0].status = status;
    const before = propertyState();
    const result = await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send({ floor: '2' }).expect(200);

    expect(result.body.data).toMatchObject({ id: ids.propertyA, status, floor: '2' });
    expect(h.properties).toEqual([{ ...before.properties[0], floor: '2' }, before.properties[1]]);
    expect(h.prisma.property.update).toHaveBeenCalledWith({ where: { id: ids.propertyA }, data: { floor: '2' } });
    expect(h.propertyHistory).toEqual([]);
    expect(h.prisma.propertyStatusHistory.create).not.toHaveBeenCalled();
    expect(h.auditLogs).toEqual([expect.objectContaining({ action: 'property.update', before_data: expect.objectContaining({ status, floor: null }), after_data: expect.objectContaining({ status, floor: '2' }) })]);
    expect(h.activityEvents).toEqual([expect.objectContaining({ event_type: 'PROPERTY.UPDATED', payload: expect.objectContaining({ status, floor: '2' }) })]);
    expectPropertyTransaction(['auditLog', 'activityEvent']);
  });

  it.each([PropertyStatus.HELD, PropertyStatus.RESERVED])('requires status permission even for unchanged %s without inventing a transition', async (status) => {
    h.grant('property.edit', ids.companyA);
    h.properties[0].status = status;
    const patch = () => request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send({ status, floor: '2' });
    await patch().expect(403);
    expect(h.prisma.property.update).not.toHaveBeenCalled();
    h.grant('property.change_status', ids.companyA);
    await patch().expect(200);
    expect(h.properties[0]).toMatchObject({ status, floor: '2' });
    expect(h.propertyHistory).toEqual([]);
    expect(h.prisma.propertyStatusHistory.create).not.toHaveBeenCalled();
    expect(h.auditLogs).toEqual([expect.objectContaining({ action: 'property.update' })]);
    expect(h.activityEvents).toEqual([expect.objectContaining({ event_type: 'PROPERTY.UPDATED' })]);
    expectPropertyTransaction(['auditLog', 'activityEvent']);
  });

  it.each(evidenceDelegates)('restores all property/evidence state when %s fails and permits a clean retry', async (failurePoint) => {
    h.grant('property.edit', ids.companyA);
    h.grant('property.change_status', ids.companyA);
    const patch = (data: object) => request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send(data);
    await patch({ status: PropertyStatus.HELD, floor: '1' }).expect(200);
    const before = propertyState();
    const failureIndex = evidenceDelegates.indexOf(failurePoint);
    const writes = evidenceDelegates.map((delegate) => h.prisma[delegate].create.mock.calls.length);
    let atFailure: ReturnType<typeof propertyState> | undefined;
    h.prisma[failurePoint].create.mockImplementationOnce(async () => {
      atFailure = propertyState();
      throw new Error(`synthetic ${failurePoint} failure`);
    });
    const data = { status: PropertyStatus.SOLD, floor: '2', property_code: 'A-103' };
    const result = await patch(data).expect(500);

    expect(result.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
    expect(atFailure).toBeDefined();
    expect(atFailure!.properties[0]).toMatchObject(data);
    expect(atFailure!.propertyHistory).toHaveLength(before.propertyHistory.length + (failureIndex > 0 ? 1 : 0));
    expect(atFailure!.auditLogs).toHaveLength(before.auditLogs.length + (failureIndex > 1 ? 1 : 0));
    expect(atFailure!.activityEvents).toEqual(before.activityEvents);
    expect(propertyState()).toEqual(before);
    evidenceDelegates.forEach((delegate, index) => expect(h.prisma[delegate].create).toHaveBeenCalledTimes(writes[index] + (index <= failureIndex ? 1 : 0)));
    expectPropertyTransaction(evidenceDelegates.slice(0, failureIndex + 1));

    await patch(data).expect(200);
    expect(h.properties[0]).toMatchObject(data);
    expect(h.properties[1]).toEqual(before.properties[1]);
    expect(h.propertyHistory).toHaveLength(before.propertyHistory.length + 1);
    expect(h.propertyHistory.at(-1)).toMatchObject({ previous_status: PropertyStatus.HELD, next_status: PropertyStatus.SOLD, actor_user_id: ids.user });
    expect(h.auditLogs).toHaveLength(before.auditLogs.length + 1);
    expect(h.activityEvents).toHaveLength(before.activityEvents.length + 1);
    expectPropertyTransaction();
  });

  it.each(['auditLog', 'activityEvent'] as const)('rolls back metadata-only edits when %s fails without writing status history', async (failurePoint) => {
    h.grant('property.edit', ids.companyA);
    h.properties[0].status = PropertyStatus.RESERVED;
    const before = propertyState();
    h.prisma[failurePoint].create.mockRejectedValueOnce(new Error('synthetic metadata evidence failure'));
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send({ floor: '2' }).expect(500);
    expect(propertyState()).toEqual(before);
    expect(h.prisma.propertyStatusHistory.create).not.toHaveBeenCalled();
    expectPropertyTransaction(failurePoint === 'auditLog' ? ['auditLog'] : ['auditLog', 'activityEvent']);
  });

  it('fails closed on missing and disabled features', async () => {
    h.grant('property.view', ids.companyA);
    h.flags.delete('ENABLE_PROPERTIES');
    await request(h.app.getHttpServer()).get('/api/v1/admin/properties').set('Authorization', `Bearer ${h.token}`).expect(403);
    h.flags.get('ENABLE_COMPANY_DIRECTORY')!.enabled = false;
    await request(h.app.getHttpServer()).get('/api/v1/companies').expect(403);
    expect(h.prisma.property.findMany).not.toHaveBeenCalled();
    expect(h.prisma.company.findMany).not.toHaveBeenCalled();
  });

  it('returns canonical 404 for missing resources and 400 for malformed UUIDs', async () => {
    h.grant('property.edit');
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.user}`).set('Authorization', `Bearer ${h.token}`).send({ floor: '1' }).expect(404);
    await request(h.app.getHttpServer()).patch('/api/v1/admin/properties/not-a-uuid').set('Authorization', `Bearer ${h.token}`).send({ floor: '1' }).expect(400);
  });

  it.each(['findUniqueOrThrow', 'update'])('maps a Prisma P2025 from property.%s after authorization to 404, not 403', async (method) => {
    h.grant('property.edit', ids.companyA);
    const before = propertyState();
    h.prisma.property[method].mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Fixture property disappeared', { code: 'P2025', clientVersion: 'test' }));
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send({ floor: '2' }).expect(404);
    expect(h.prisma.property[method]).toHaveBeenCalled();
    expect(propertyState()).toEqual(before);
    for (const delegate of evidenceDelegates) expect(h.prisma[delegate].create).not.toHaveBeenCalled();
  });

  it.each([
    ['customer-properties', 'customer_property.manage', { customer_id: ids.user, property_id: ids.propertyA, relationship_type: 'BUYER' }],
    ['reservations', 'reservation.create', { customer_id: ids.user, property_id: ids.propertyA }],
  ] as const)('returns 404 for a Prisma customer-visibility miss on %s rather than a mock-only 403', async (route, permission, body) => {
    h.grant(permission, ids.companyA, ids.projectA);
    h.prisma.user.findFirstOrThrow.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Fixture customer not visible', { code: 'P2025', clientVersion: 'test' }));
    await request(h.app.getHttpServer()).post(`/api/v1/admin/${route}`).set('Authorization', `Bearer ${h.token}`).send(body).expect(404);
    expect(h.prisma.user.findFirstOrThrow).toHaveBeenCalledWith({ where: { AND: [{ id: ids.user, account_status: 'ACTIVE' }, expect.objectContaining({ customer_properties: expect.any(Object) })] }, select: { id: true } });
    expect(h.prisma.user.findFirstOrThrow.mock.calls[0][0].where.AND[1].customer_properties.some.property.project).toEqual({ OR: [] });
    expect(h.prisma.customerProperty.create).not.toHaveBeenCalled();
    expect(h.prisma.property.update).not.toHaveBeenCalled();
    for (const delegate of evidenceDelegates) expect(h.prisma[delegate].create).not.toHaveBeenCalled();
    expect(h.prisma.$queryRaw.mock.calls.some(([, id]: [unknown, unknown]) => id === ids.propertyA)).toBe(false);
  });

  it('rejects invalid list filters and pagination', async () => {
    h.grant('property.view');
    for (const query of ['status=NOT_A_STATUS', 'take=10000', 'skip=-1', 'company_id=not-uuid', 'include=customer', 'status=AVAILABLE&status=SOLD']) {
      await request(h.app.getHttpServer()).get(`/api/v1/admin/properties?${query}`).set('Authorization', `Bearer ${h.token}`).expect(400);
    }
    expect(h.prisma.property.findMany).not.toHaveBeenCalled();
  });

  it('does not treat expired, mismatched or tenant-owned roles as global grants', async () => {
    h.grant('feature_flag.view');
    const grant = h.grants.get('feature_flag.view')![0];
    grant.expires_at = new Date(0);
    await request(h.app.getHttpServer()).get('/api/v1/admin/feature-flags').set('Authorization', `Bearer ${h.token}`).expect(403);
    grant.expires_at = null; grant.role.company_id = ids.companyA;
    await request(h.app.getHttpServer()).get('/api/v1/admin/feature-flags').set('Authorization', `Bearer ${h.token}`).expect(403);
    grant.company_id = ids.companyB;
    await request(h.app.getHttpServer()).get('/api/v1/admin/feature-flags').set('Authorization', `Bearer ${h.token}`).expect(403);
  });

  it('persists server request/correlation IDs and resource scope with audits and events', async () => {
    h.grant('property.create', ids.companyA, ids.projectA);
    const result = await request(h.app.getHttpServer()).post('/api/v1/admin/properties').set('Authorization', `Bearer ${h.token}`).set('X-Request-ID', 'caller-forged-id').set('X-Correlation-ID', 'safe-correlation').send(property).expect(201);
    expect(result.headers['x-request-id']).not.toBe('caller-forged-id');
    expect(result.body.meta.request_id).toBe(result.headers['x-request-id']);
    expect(h.prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actor_user_id: ids.user, company_id: ids.companyA, project_id: ids.projectA, request_id: result.headers['x-request-id'], correlation_id: 'safe-correlation', ip_address: expect.any(String) }) });
    expect(h.prisma.activityEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ company_id: ids.companyA, project_id: ids.projectA, request_id: result.headers['x-request-id'] }) });
    expect(h.prisma.$transaction).toHaveBeenCalled();
  });

  it('never exposes internal errors or database connection details', async () => {
    h.grant('user.view');
    h.prisma.user.findMany.mockRejectedValueOnce(new Error('postgres://admin:password@private-db token=secret'));
    const result = await request(h.app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${h.token}`).expect(500);
    expect(result.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
    expect(JSON.stringify(result.body)).not.toMatch(/postgres|password|private-db|secret/);
  });

  it('does not select credentials or unrestricted user relation records', async () => {
    h.grant('user.view', ids.companyA);
    await request(h.app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${h.token}`).expect(200);
    const args = h.prisma.user.findMany.mock.calls[0][0];
    expect(args.where.AND[0]).toHaveProperty('OR');
    expect(args.select).not.toHaveProperty('password_hash');
    expect(args.select).not.toHaveProperty('roles');
    h.grant('integration.view', ids.companyA);
    await request(h.app.getHttpServer()).get('/api/v1/admin/integrations').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(h.prisma.companyIntegration.findMany.mock.calls[0][0].select).not.toHaveProperty('config');
  });
});
