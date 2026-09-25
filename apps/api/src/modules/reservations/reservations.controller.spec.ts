import request from 'supertest';
import { ConflictException, ForbiddenException, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../security/auth.guard';
import { PermissionGuard } from '../security/permission.guard';
import { PrismaService } from '../../platform/prisma.service';
import { RbacService } from '../security/rbac.service';
import { AdminReservationsController, CustomerReservationsController } from './reservations.controller';
import { ReservationsService, adminReservationSelect, customerReservationSelect } from './reservations.service';

const user = {
  id: 'user-1',
  email: 'customer@example.com',
  account_status: 'ACTIVE',
  verification_status: 'PENDING',
};

const customerResponse = {
  id: '66666666-6666-4666-8666-666666666666',
  reservation_number: 'RSV-TEST-1',
  status: 'PENDING',
  expires_at: '2026-09-21T00:00:00.000Z',
  created_at: '2026-09-18T00:00:00.000Z',
  updated_at: '2026-09-18T00:00:00.000Z',
  property: {
    id: '55555555-5555-4555-8555-555555555555',
    property_code: 'A-101',
    status: 'HELD',
    project: {
      id: 'project-1',
      project_code: 'AMICA-T1',
      project_name: 'Amica Tower 1',
      company: { id: 'company-1', company_code: 'AMICA', display_name: 'Amica' },
    },
  },
};

describe('CustomerReservationsController HTTP projection', () => {
  let moduleRef: TestingModule;
  let nest: INestApplication;
  const prisma = {
    reservation: { findMany: jest.fn().mockResolvedValue([customerResponse]) },
    user: { findFirstOrThrow: jest.fn() },
  };
  const rbac = {
    grants: jest.fn().mockResolvedValue([]),
    userWhere: jest.fn().mockReturnValue({}),
    propertyWhere: jest.fn().mockReturnValue({ project: { OR: [] } }),
  };
  const reservations = {
    create: jest.fn().mockResolvedValue(customerResponse),
    assertOwner: jest.fn().mockResolvedValue(undefined),
    transition: jest.fn().mockResolvedValue({ ...customerResponse, status: 'CANCELLED', property: { ...customerResponse.property, status: 'AVAILABLE' } }),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [CustomerReservationsController, AdminReservationsController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: ReservationsService, useValue: reservations },
        { provide: RbacService, useValue: rbac },
      ],
    });
    moduleRef = await builder
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { user: typeof user } } }) => {
          context.switchToHttp().getRequest().user = user;
          return true;
        },
      })
      .overrideGuard(PermissionGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { authorization: unknown } } }) => {
          context.switchToHttp().getRequest().authorization = { grants: [], scope: {} };
          return true;
        },
      })
      .compile();
    nest = moduleRef.createNestApplication();
    nest.setGlobalPrefix('api/v1');
    await nest.init();
  });

  afterEach(async () => {
    if (nest) await nest.close();
    jest.clearAllMocks();
    rbac.propertyWhere.mockReturnValue({ project: { OR: [] } });
  });

  it('lists only the explicit customer projection and omits internal event fields', async () => {
    const response = await request(nest.getHttpServer()).get('/api/v1/me/reservations').expect(200);

    expect(response.body).toEqual([customerResponse]);
    expect(prisma.reservation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { customer_id: 'user-1' },
          { property: { project: {} } },
          { status: undefined },
        ],
      },
      select: customerReservationSelect,
    }));
    expect(customerReservationSelect).not.toHaveProperty('events');
  });

  it('honors customer tenant filters as additional narrowing predicates', async () => {
    await request(nest.getHttpServer())
      .get('/api/v1/me/reservations?company_id=11111111-1111-4111-8111-111111111111&project_id=22222222-2222-4222-8222-222222222222')
      .expect(200);

    expect(prisma.reservation.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: {
        AND: [
          { customer_id: 'user-1' },
          { property: { project: { company_id: '11111111-1111-4111-8111-111111111111', id: '22222222-2222-4222-8222-222222222222' } } },
          { status: undefined },
        ],
      },
    }));
  });

  it('honors Admin tenant filters without replacing permission-derived scope', async () => {
    rbac.propertyWhere.mockReturnValue({ project: { OR: [{ company_id: 'company-scope' }] } });
    await request(nest.getHttpServer())
      .get('/api/v1/admin/reservations?company_id=11111111-1111-4111-8111-111111111111&project_id=22222222-2222-4222-8222-222222222222')
      .expect(200);

    expect(prisma.reservation.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: {
        AND: [
          { property: { project: { OR: [{ company_id: 'company-scope' }] } } },
          { property: { project: { company_id: '11111111-1111-4111-8111-111111111111', id: '22222222-2222-4222-8222-222222222222' } } },
          { status: undefined },
        ],
      },
    }));
  });

  it.each([
    ['company only', 'company_id=11111111-1111-4111-8111-111111111111', { company_id: '11111111-1111-4111-8111-111111111111' }],
    ['project only', 'project_id=22222222-2222-4222-8222-222222222222', { id: '22222222-2222-4222-8222-222222222222' }],
    ['company and project', 'company_id=11111111-1111-4111-8111-111111111111&project_id=22222222-2222-4222-8222-222222222222', { company_id: '11111111-1111-4111-8111-111111111111', id: '22222222-2222-4222-8222-222222222222' }],
    ['inconsistent company and project', 'company_id=99999999-9999-4999-8999-999999999999&project_id=22222222-2222-4222-8222-222222222222', { company_id: '99999999-9999-4999-8999-999999999999', id: '22222222-2222-4222-8222-222222222222' }],
    ['foreign company', 'company_id=99999999-9999-4999-8999-999999999998', { company_id: '99999999-9999-4999-8999-999999999998' }],
    ['foreign project', 'project_id=99999999-9999-4999-8999-999999999997', { id: '99999999-9999-4999-8999-999999999997' }],
  ] as const)('keeps customer ownership, status, tenant, pagination and ordering predicates for %s', async (_label, query, projectFilter) => {
    prisma.reservation.findMany.mockClear();
    await request(nest.getHttpServer())
      .get(`/api/v1/me/reservations?${query}&status=CONFIRMED&take=25&skip=5`)
      .expect(200);

    expect(prisma.reservation.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { customer_id: 'user-1' },
          { property: { project: projectFilter } },
          { status: 'CONFIRMED' },
        ],
      },
      select: customerReservationSelect,
      take: 25,
      skip: 5,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('keeps Admin RBAC and query tenant predicates combined and bounds event history', async () => {
    rbac.propertyWhere.mockReturnValue({ project: { OR: [{ company_id: 'company-scope' }] } });
    prisma.reservation.findMany.mockClear();
    await request(nest.getHttpServer())
      .get('/api/v1/admin/reservations?company_id=99999999-9999-4999-8999-999999999999&project_id=22222222-2222-4222-8222-222222222222&status=PENDING&take=10&skip=20')
      .expect(200);

    expect(prisma.reservation.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { property: { project: { OR: [{ company_id: 'company-scope' }] } } },
          { property: { project: { company_id: '99999999-9999-4999-8999-999999999999', id: '22222222-2222-4222-8222-222222222222' } } },
          { status: 'PENDING' },
        ],
      },
      select: adminReservationSelect,
      take: 10,
      skip: 20,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    expect(adminReservationSelect.events).toMatchObject({ orderBy: { created_at: 'desc' }, take: 20 });
    expect(customerReservationSelect).not.toHaveProperty('events');
    expect(JSON.stringify(customerReservationSelect)).not.toMatch(/note|actor_user_id|metadata|event/i);
  });

  it('surfaces an ineligible-inventory conflict as HTTP 409 without reporting success', async () => {
    reservations.create.mockRejectedValueOnce(new ConflictException('This property is not eligible for reservation'));

    const response = await request(nest.getHttpServer())
      .post('/api/v1/me/reservations')
      .send({ property_id: '55555555-5555-4555-8555-555555555555' })
      .expect(409);

    expect(response.body).not.toHaveProperty('data');
    expect(response.body.statusCode).toBe(409);
  });

  it('returns HTTP 403 for a foreign-customer cancellation and does not transition it', async () => {
    reservations.assertOwner.mockRejectedValueOnce(new ForbiddenException('Reservation is not linked to your account'));

    await request(nest.getHttpServer())
      .post('/api/v1/me/reservations/66666666-6666-4666-8666-666666666666/cancel')
      .expect(403);

    expect(reservations.transition).not.toHaveBeenCalled();
  });

  it('denies Admin reservation creation when customer visibility is absent', async () => {
    prisma.user.findFirstOrThrow.mockRejectedValueOnce(new ForbiddenException('Customer is not visible'));

    await request(nest.getHttpServer())
      .post('/api/v1/admin/reservations')
      .send({ customer_id: '77777777-7777-4777-8777-777777777777', property_id: '55555555-5555-4555-8555-555555555555' })
      .expect(403);

    expect(reservations.create).not.toHaveBeenCalled();
  });

  it('returns final create/cancel projections and keeps customer scope on the service calls', async () => {
    const created = await request(nest.getHttpServer()).post('/api/v1/me/reservations').send({ property_id: '55555555-5555-4555-8555-555555555555' }).expect(201);
    expect(created.body).toMatchObject({ status: 'PENDING', property: { status: 'HELD' } });
    expect(reservations.create).toHaveBeenCalledWith('user-1', '55555555-5555-4555-8555-555555555555', user, {}, 'customer');

    const cancelled = await request(nest.getHttpServer()).post('/api/v1/me/reservations/66666666-6666-4666-8666-666666666666/cancel').expect(201);
    expect(cancelled.body).toMatchObject({ status: 'CANCELLED', property: { status: 'AVAILABLE' } });
    expect(reservations.assertOwner).toHaveBeenCalledWith('66666666-6666-4666-8666-666666666666', 'user-1');
    expect(reservations.transition).toHaveBeenCalledWith(
      '66666666-6666-4666-8666-666666666666',
      'CANCELLED',
      user,
      { review_reference: 'CUSTOMER-CANCELLED', note: 'Customer cancelled reservation' },
      {},
      'customer',
    );
  });
});
