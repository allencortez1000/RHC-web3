import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

const actor = {
  id: 'user-1',
  email: 'customer@example.com',
  account_status: 'ACTIVE',
  verification_status: 'VERIFIED',
} as any;

const finalCustomerReservation = {
  id: 'reservation-1',
  reservation_number: 'RSV-TEST-1',
  status: 'PENDING',
  expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
  created_at: new Date(),
  updated_at: new Date(),
  property: {
    id: 'property-1',
    property_code: 'A-101',
    tower: 'A',
    floor: '1',
    unit_number: '101',
    asset_type: 'RESIDENTIAL',
    area: 52.5,
    list_price: 4200000,
    currency: 'PHP',
    status: 'HELD',
    project: {
      id: 'project-1',
      project_code: 'AMICA-T1',
      project_name: 'Amica Tower 1',
      company: { id: 'company-1', company_code: 'AMICA', display_name: 'Amica' },
    },
  },
};

function createTx(overrides: Record<string, unknown> = {}) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'property-1' }]),
    property: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'property-1',
        status: 'AVAILABLE',
        project_id: 'project-1',
        project: {
          id: 'project-1',
          status: 'ACTIVE',
          company_id: 'company-1',
          company: { id: 'company-1', status: 'ACTIVE' },
        },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    reservation: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(finalCustomerReservation),
      update: jest.fn().mockResolvedValue({ id: 'reservation-1' }),
      create: jest.fn().mockResolvedValue({
        id: 'reservation-1',
        reservation_number: 'RSV-TEST-1',
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', account_status: 'ACTIVE' }),
    },
    reservationEvent: { create: jest.fn().mockResolvedValue({}) },
    propertyStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    customerProperty: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    ...overrides,
  };
  return tx;
}

function createService(tx: any) {
  const prisma = {
    $transaction: jest.fn((work: (client: typeof tx) => unknown) => work(tx)),
    reservation: tx.reservation,
  } as any;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
  const events = { publish: jest.fn().mockResolvedValue(undefined) } as any;
  return { service: new ReservationsService(prisma, audit, events), prisma, audit, events, tx };
}

describe('ReservationsService', () => {
  it('creates a reservation and returns the final HELD property projection', async () => {
    const { service, tx, audit, events } = createService(createTx());

    const result = await service.create('user-1', 'property-1', actor, {}, 'customer');

    expect(result).toMatchObject({ id: 'reservation-1', property: { status: 'HELD' } });
    expect(result).not.toHaveProperty('events');
    expect(tx.reservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customer_id: 'user-1', property_id: 'property-1' }),
    }));
    expect(tx.reservation.findUnique).toHaveBeenCalled();
    expect(tx.property.update).toHaveBeenCalledWith({ where: { id: 'property-1' }, data: { status: 'HELD' } });
    expect(tx.propertyStatusHistory.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'reservation.create' }), tx);
    expect(events.publish).toHaveBeenCalledWith('RESERVATION.CREATED', expect.any(Object), expect.any(Object), tx);
  });

  it.each([
    ['inactive project', { status: 'INACTIVE' }, { status: 'ACTIVE' }],
    ['archived project', { status: 'ARCHIVED' }, { status: 'ACTIVE' }],
    ['suspended company', { status: 'ACTIVE' }, { status: 'SUSPENDED' }],
    ['inactive company', { status: 'ACTIVE' }, { status: 'INACTIVE' }],
  ])('rejects new reservations for an %s', async (_label, project, company) => {
    const tx = createTx({
      property: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'property-1',
          status: 'AVAILABLE',
          project_id: 'project-1',
          project: { id: 'project-1', status: project.status, company_id: 'company-1', company: { id: 'company-1', status: company.status } },
        }),
        update: jest.fn(),
      },
    });
    const { service } = createService(tx);

    await expect(service.create('user-1', 'property-1', actor)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.reservation.create).not.toHaveBeenCalled();
    expect(tx.property.update).not.toHaveBeenCalled();
  });

  it('rejects reservation when property is not available', async () => {
    const tx = createTx({
      property: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'property-1',
          status: 'RESERVED',
          project_id: 'project-1',
          project: { id: 'project-1', status: 'ACTIVE', company_id: 'company-1', company: { id: 'company-1', status: 'ACTIVE' } },
        }),
        update: jest.fn(),
      },
    });
    const { service } = createService(tx);

    await expect(service.create('user-1', 'property-1', actor)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.reservation.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate active reservations for the same property', async () => {
    const tx = createTx({ reservation: { findFirst: jest.fn().mockResolvedValue({ id: 'existing-reservation' }), create: jest.fn(), findUnique: jest.fn() } });
    const { service } = createService(tx);

    await expect(service.create('user-1', 'property-1', actor)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.reservation.create).not.toHaveBeenCalled();
  });

  it('confirms an unexpired reservation and returns the final RESERVED property projection with history', async () => {
    const before = {
      id: 'reservation-1',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 60_000),
      property_id: 'property-1',
      customer_id: 'user-1',
      property: {
        id: 'property-1',
        status: 'HELD',
        project_id: 'project-1',
        project: { id: 'project-1', status: 'ACTIVE', company_id: 'company-1', company: { id: 'company-1', status: 'ACTIVE' } },
      },
    };
    const after = { ...finalCustomerReservation, status: 'CONFIRMED', property: { ...finalCustomerReservation.property, status: 'RESERVED' }, events: [{ event_type: 'CONFIRMED' }] };
    const tx = createTx();
    tx.reservation.findUnique.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    const { service, events } = createService(tx);

    const result = await service.transition('reservation-1', 'CONFIRMED', actor, { review_reference: 'REVIEW-1' }, {}, 'admin');

    expect(result).toMatchObject({ status: 'CONFIRMED', property: { status: 'RESERVED' }, events: [{ event_type: 'CONFIRMED' }] });
    expect(tx.reservation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED' }) }));
    expect(tx.property.update).toHaveBeenCalledWith({ where: { id: 'property-1' }, data: { status: 'RESERVED' } });
    expect(events.publish).toHaveBeenCalledWith('RESERVATION.CONFIRMED', expect.any(Object), expect.any(Object), tx);
  });

  it('does not confirm an expired pending reservation', async () => {
    const tx = createTx();
    tx.reservation.findUnique.mockResolvedValue({
      id: 'reservation-1',
      status: 'PENDING',
      expires_at: new Date(0),
      property_id: 'property-1',
      customer_id: 'user-1',
      property: { id: 'property-1', status: 'HELD', project_id: 'project-1', project: { id: 'project-1', company_id: 'company-1' } },
    });
    const { service } = createService(tx);

    await expect(service.transition('reservation-1', 'CONFIRMED', actor, { review_reference: 'REVIEW-1' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.reservation.update).not.toHaveBeenCalled();
    expect(tx.property.update).not.toHaveBeenCalled();
  });

  it('does not overwrite a property changed by another workflow', async () => {
    const tx = createTx();
    tx.reservation.findUnique.mockResolvedValue({
      id: 'reservation-1',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 60_000),
      property_id: 'property-1',
      customer_id: 'user-1',
      property: { id: 'property-1', status: 'RESERVED', project_id: 'project-1', project: { id: 'project-1', company_id: 'company-1' } },
    });
    const { service } = createService(tx);

    await expect(service.transition('reservation-1', 'CONFIRMED', actor, { review_reference: 'REVIEW-2' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.reservation.update).not.toHaveBeenCalled();
    expect(tx.property.update).not.toHaveBeenCalled();
  });

  it('keeps cancellation ownership fail-closed for a foreign customer', async () => {
    const reservation = { customer_id: 'other-user' };
    const prisma = { reservation: { findUnique: jest.fn().mockResolvedValue(reservation) } } as any;
    const service = new ReservationsService(prisma, {} as any, {} as any);

    await expect(service.assertOwner('reservation-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.reservation.findUnique).toHaveBeenCalledWith({ where: { id: 'reservation-1' }, select: { customer_id: true } });
  });

  it('allows cancellation/remediation after the company becomes inactive', async () => {
    const before = {
      id: 'reservation-1',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 60_000),
      property_id: 'property-1',
      customer_id: 'user-1',
      property: {
        id: 'property-1',
        status: 'HELD',
        project_id: 'project-1',
        project: { id: 'project-1', status: 'ARCHIVED', company_id: 'company-1', company: { id: 'company-1', status: 'SUSPENDED' } },
      },
    };
    const after = { ...finalCustomerReservation, status: 'CANCELLED', property: { ...finalCustomerReservation.property, status: 'AVAILABLE' } };
    const tx = createTx();
    tx.reservation.findUnique.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    const { service } = createService(tx);

    await expect(service.transition('reservation-1', 'CANCELLED', actor, { review_reference: 'REVIEW-CANCEL' }, {}, 'customer')).resolves.toMatchObject({ status: 'CANCELLED', property: { status: 'AVAILABLE' } });
  });
});
