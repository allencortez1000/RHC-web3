import { ConflictException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

const actor = { id: 'user-1', email: 'customer@example.com', account_status: 'ACTIVE', verification_status: 'VERIFIED' } as any;

function createTx(overrides: Partial<Record<string, any>> = {}) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'property-1' }]),
    property: {
      findUnique: jest.fn().mockResolvedValue({ id: 'property-1', status: 'AVAILABLE', project_id: 'project-1', project: { company_id: 'company-1' } }),
      update: jest.fn().mockResolvedValue({}),
    },
    reservation: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'reservation-1',
        reservation_number: 'RSV-TEST-1',
        customer_id: 'user-1',
        property_id: 'property-1',
        property: { project: { company: {} } },
        customer: { id: 'user-1', email: 'customer@example.com' },
        events: [],
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', account_status: 'ACTIVE' }),
    },
    reservationEvent: { create: jest.fn().mockResolvedValue({}) },
    propertyStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
  return tx;
}

function createService(tx: any) {
  const prisma = { $transaction: jest.fn((work) => work(tx)) } as any;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
  const events = { publish: jest.fn().mockResolvedValue(undefined) } as any;
  return { service: new ReservationsService(prisma, audit, events), prisma, audit, events, tx };
}

describe('ReservationsService', () => {
  it('creates a reservation and holds the property atomically', async () => {
    const { service, tx, audit, events } = createService(createTx());

    const result = await service.create('user-1', 'property-1', actor);

    expect(result.id).toBe('reservation-1');
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.reservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customer_id: 'user-1', property_id: 'property-1' }),
    }));
    expect(tx.property.update).toHaveBeenCalledWith({ where: { id: 'property-1' }, data: { status: 'HELD' } });
    expect(tx.propertyStatusHistory.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'reservation.create' }), tx);
    expect(events.publish).toHaveBeenCalledWith('RESERVATION.CREATED', expect.any(Object), expect.any(Object), tx);
  });

  it('rejects reservation when property is not available', async () => {
    const tx = createTx({ property: { findUnique: jest.fn().mockResolvedValue({ id: 'property-1', status: 'RESERVED', project_id: 'project-1', project: { company_id: 'company-1' } }), update: jest.fn() } });
    const { service } = createService(tx);

    await expect(service.create('user-1', 'property-1', actor)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.reservation.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate active reservations for the same property', async () => {
    const tx = createTx({ reservation: { findFirst: jest.fn().mockResolvedValue({ id: 'existing-reservation' }), create: jest.fn() } });
    const { service } = createService(tx);

    await expect(service.create('user-1', 'property-1', actor)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.reservation.create).not.toHaveBeenCalled();
  });
});
