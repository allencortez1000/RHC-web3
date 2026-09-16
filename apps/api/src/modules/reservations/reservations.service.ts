import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../platform/prisma.service';
import { AuditService } from '../security/audit.service';
import { EventsService } from '../events/events.service';
import type { AuthUser } from '../security/auth-user.decorator';
import type { ResourceScope } from '../security/rbac.service';

type ReservationAction = 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED';
type ReservationDelegates = {
  reservation: any;
  reservationEvent: any;
  propertyStatusHistory: any;
};
const activeReservationStatuses = ['PENDING', 'CONFIRMED'] as const;
const reservationDb = <T extends object>(client: T) => client as T & ReservationDelegates;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
  ) {}

  private reservationNumber() {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `RSV-${stamp}-${random}`;
  }

  async create(customerId: string, propertyId: string, actor: AuthUser, scope: ResourceScope = {}) {
    return this.prisma.$transaction(async (tx) => {
      const db = reservationDb(tx);
      await tx.$queryRaw`SELECT id FROM properties WHERE id = ${propertyId}::uuid FOR UPDATE`;
      const property = await tx.property.findUnique({ where: { id: propertyId }, select: { id: true, status: true, project_id: true, project: { select: { company_id: true } } } });
      if (!property) throw new NotFoundException('Property not found');
      if (property.status !== 'AVAILABLE') throw new ConflictException('This property is not available for reservation');
      const active = await db.reservation.findFirst({ where: { property_id: propertyId, status: { in: [...activeReservationStatuses] } }, select: { id: true } });
      if (active) throw new ConflictException('This property already has an active reservation');
      const customer = await tx.user.findUnique({ where: { id: customerId }, select: { id: true, account_status: true } });
      if (!customer || customer.account_status !== 'ACTIVE') throw new ConflictException('An active customer account is required');
      const before = property.status;
      const reservation = await db.reservation.create({
        data: {
          reservation_number: this.reservationNumber(),
          customer_id: customerId,
          property_id: propertyId,
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
        include: { property: { include: { project: { include: { company: true } } } }, customer: { select: { id: true, email: true } }, events: true },
      });
      await tx.property.update({ where: { id: propertyId }, data: { status: 'HELD' } });
      await db.reservationEvent.create({ data: { reservation_id: reservation.id, event_type: 'CREATED', actor_user_id: actor.id, metadata: { property_id: propertyId } } });
      await db.propertyStatusHistory.create({ data: { property_id: propertyId, previous_status: before, next_status: 'HELD', reason: 'Reservation created', actor_user_id: actor.id, reservation_id: reservation.id } });
      const context = { actor_user_id: actor.id, company_id: scope.company_id ?? property.project.company_id, project_id: scope.project_id ?? property.project_id, entity_type: 'reservation', entity_id: reservation.id };
      await this.audit.record({ ...context, action: 'reservation.create', after_data: { reservation_number: reservation.reservation_number, property_id: propertyId, customer_id: customerId } }, tx);
      await this.events.publish('RESERVATION.CREATED', { reservation_id: reservation.id, property_id: propertyId }, context, tx);
      return reservation;
    }, { isolationLevel: 'Serializable' });
  }

  async transition(id: string, action: ReservationAction, actor: AuthUser, review: { review_reference: string; note?: string }, scope: ResourceScope = {}) {
    return this.prisma.$transaction(async (tx) => {
      const db = reservationDb(tx);
      await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await db.reservation.findUnique({ where: { id }, include: { property: { select: { id: true, status: true, project_id: true, project: { select: { company_id: true } } } } } });
      if (!before) throw new NotFoundException('Reservation not found');
      const next = this.nextState(before.status, action);
      if (!next) throw new ConflictException('Reservation cannot transition to the requested status');
      await tx.$queryRaw`SELECT id FROM properties WHERE id = ${before.property_id}::uuid FOR UPDATE`;
      const now = new Date();
      const propertyStatus = action === 'CONFIRMED' ? 'RESERVED' : action === 'CONVERTED' ? 'CONTRACTED' : 'AVAILABLE';
      const after = await db.reservation.update({
        where: { id },
        data: {
          status: action,
          ...(action === 'CONFIRMED' ? { confirmed_at: now } : {}),
          ...(action === 'CANCELLED' ? { cancelled_at: now } : {}),
          ...(action === 'CONVERTED' ? { converted_at: now } : {}),
        },
        include: { property: { include: { project: { include: { company: true } } } }, customer: { select: { id: true, email: true } }, events: true },
      });
      await tx.property.update({ where: { id: before.property_id }, data: { status: propertyStatus } });
      await db.reservationEvent.create({ data: { reservation_id: id, event_type: action, actor_user_id: actor.id, note: review.note, metadata: { review_reference: review.review_reference } } });
      await db.propertyStatusHistory.create({ data: { property_id: before.property_id, previous_status: before.property.status, next_status: propertyStatus, reason: `Reservation ${action.toLowerCase()}`, actor_user_id: actor.id, reservation_id: id } });
      if (action === 'CONVERTED') {
        await tx.customerProperty.createMany({
          data: [{ customer_id: before.customer_id, property_id: before.property_id, relationship_type: 'BUYER', status: 'ACTIVE' }],
          skipDuplicates: true,
        });
      }
      const context = { actor_user_id: actor.id, company_id: scope.company_id ?? before.property.project.company_id, project_id: scope.project_id ?? before.property.project_id, entity_type: 'reservation', entity_id: id };
      await this.audit.record({ ...context, action: `reservation.${action.toLowerCase()}`, before_data: { status: before.status }, after_data: { status: action, review_reference: review.review_reference } }, tx);
      await this.events.publish(`RESERVATION.${action}`, { reservation_id: id }, context, tx);
      return after;
    }, { isolationLevel: 'Serializable' });
  }

  private nextState(current: string, action: ReservationAction) {
    if (action === 'CONFIRMED' && current === 'PENDING') return 'CONFIRMED';
    if (action === 'EXPIRED' && current === 'PENDING') return 'EXPIRED';
    if (action === 'CANCELLED' && (current === 'PENDING' || current === 'CONFIRMED')) return 'CANCELLED';
    if (action === 'CONVERTED' && current === 'CONFIRMED') return 'CONVERTED';
    return null;
  }

  async assertOwner(id: string, userId: string) {
    const reservation = await reservationDb(this.prisma).reservation.findUnique({ where: { id }, select: { customer_id: true } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.customer_id !== userId) throw new ForbiddenException('Reservation is not linked to your account');
  }
}
