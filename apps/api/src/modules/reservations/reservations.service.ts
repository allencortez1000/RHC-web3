import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyStatus, ReservationStatus } from '@prisma/client';

import { PrismaService } from '../../platform/prisma.service';
import { AuditService } from '../security/audit.service';
import { EventsService } from '../events/events.service';
import type { AuthUser } from '../security/auth-user.decorator';
import type { ResourceScope } from '../security/rbac.service';

export type ReservationAction = 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED';
export type ReservationProjection = 'customer' | 'admin';

const activeReservationStatuses: ReservationStatus[] = [ReservationStatus.PENDING, ReservationStatus.CONFIRMED];

const companySelect = {
  id: true,
  company_code: true,
  display_name: true,
} satisfies Prisma.CompanySelect;

const projectReservationSelect = {
  id: true,
  project_code: true,
  project_name: true,
  company: { select: companySelect },
} satisfies Prisma.ProjectSelect;

export const customerReservationSelect = {
  id: true,
  reservation_number: true,
  status: true,
  expires_at: true,
  created_at: true,
  updated_at: true,
  property: {
    select: {
      id: true,
      property_code: true,
      status: true,
      project: { select: projectReservationSelect },
    },
  },
} satisfies Prisma.ReservationSelect;

export const adminReservationSelect = {
  ...customerReservationSelect,
  customer: {
    select: {
      id: true,
      email: true,
      profile: { select: { first_name: true, last_name: true, rhc_id: true } },
    },
  },
  events: {
    select: {
      id: true,
      event_type: true,
      actor_user_id: true,
      note: true,
      metadata: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  },
} satisfies Prisma.ReservationSelect;

const reservationPropertySelect = {
  id: true,
  status: true,
  project_id: true,
  project: {
    select: {
      id: true,
      status: true,
      company_id: true,
      company: { select: { id: true, status: true } },
    },
  },
} satisfies Prisma.PropertySelect;

const transitionReservationSelect = {
  id: true,
  status: true,
  expires_at: true,
  property_id: true,
  customer_id: true,
  property: { select: reservationPropertySelect },
} satisfies Prisma.ReservationSelect;

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

  private selectFor(projection: ReservationProjection) {
    return projection === 'customer' ? customerReservationSelect : adminReservationSelect;
  }

  async create(
    customerId: string,
    propertyId: string,
    actor: AuthUser,
    scope: ResourceScope = {},
    projection: ReservationProjection = 'admin',
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM properties WHERE id = ${propertyId}::uuid FOR UPDATE`;
      const property = await tx.property.findUnique({
        where: { id: propertyId },
        select: reservationPropertySelect,
      });
      if (!property) throw new NotFoundException('Property not found');
      if (
        property.status !== PropertyStatus.AVAILABLE ||
        property.project.status !== 'ACTIVE' ||
        property.project.company.status !== 'ACTIVE'
      ) {
        throw new ConflictException('This property is not eligible for reservation');
      }

      const active = await tx.reservation.findFirst({
        where: { property_id: propertyId, status: { in: activeReservationStatuses } },
        select: { id: true },
      });
      if (active) throw new ConflictException('This property already has an active reservation');

      const customer = await tx.user.findUnique({
        where: { id: customerId },
        select: { id: true, account_status: true },
      });
      if (!customer || customer.account_status !== 'ACTIVE') {
        throw new ConflictException('An active customer account is required');
      }

      const before = property.status;
      const reservation = await tx.reservation.create({
        data: {
          reservation_number: this.reservationNumber(),
          customer_id: customerId,
          property_id: propertyId,
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
        select: { id: true, reservation_number: true },
      });
      await tx.property.update({ where: { id: propertyId }, data: { status: PropertyStatus.HELD } });
      await tx.reservationEvent.create({
        data: {
          reservation_id: reservation.id,
          event_type: 'CREATED',
          actor_user_id: actor.id,
          metadata: { property_id: propertyId },
        },
      });
      await tx.propertyStatusHistory.create({
        data: {
          property_id: propertyId,
          previous_status: before,
          next_status: PropertyStatus.HELD,
          reason: 'Reservation created',
          actor_user_id: actor.id,
          reservation_id: reservation.id,
        },
      });
      const context = {
        actor_user_id: actor.id,
        company_id: scope.company_id ?? property.project.company_id,
        project_id: scope.project_id ?? property.project_id,
        entity_type: 'reservation',
        entity_id: reservation.id,
      };
      await this.audit.record({
        ...context,
        action: 'reservation.create',
        after_data: {
          reservation_number: reservation.reservation_number,
          property_id: propertyId,
          customer_id: customerId,
        },
      }, tx);
      await this.events.publish(
        'RESERVATION.CREATED',
        { reservation_id: reservation.id, property_id: propertyId },
        context,
        tx,
      );

      const final = await tx.reservation.findUnique({
        where: { id: reservation.id },
        select: this.selectFor(projection),
      });
      if (!final) throw new NotFoundException('Reservation not found after creation');
      return final;
    }, { isolationLevel: 'Serializable' });
  }

  async transition(
    id: string,
    action: ReservationAction,
    actor: AuthUser,
    review: { review_reference: string; note?: string },
    scope: ResourceScope = {},
    projection: ReservationProjection = 'admin',
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.reservation.findUnique({
        where: { id },
        select: transitionReservationSelect,
      });
      if (!before) throw new NotFoundException('Reservation not found');
      const now = new Date();
      const next = this.nextState(before.status, action);
      if (!next) throw new ConflictException('Reservation cannot transition to the requested status');
      if (action === 'CONFIRMED' && before.expires_at <= now) {
        throw new ConflictException('This reservation has expired and cannot be confirmed');
      }

      await tx.$queryRaw`SELECT id FROM properties WHERE id = ${before.property_id}::uuid FOR UPDATE`;
      const expectedPropertyStatus = action === 'CONVERTED'
        ? PropertyStatus.RESERVED
        : before.status === ReservationStatus.CONFIRMED
          ? PropertyStatus.RESERVED
          : PropertyStatus.HELD;
      if (before.property.status !== expectedPropertyStatus) {
        throw new ConflictException('The property status changed; refresh before changing this reservation');
      }

      const propertyStatus: PropertyStatus = action === 'CONFIRMED'
        ? PropertyStatus.RESERVED
        : action === 'CONVERTED'
          ? PropertyStatus.CONTRACTED
          : PropertyStatus.AVAILABLE;
      await tx.reservation.update({
        where: { id },
        data: {
          status: next,
          ...(action === 'CONFIRMED' ? { confirmed_at: now } : {}),
          ...(action === 'CANCELLED' ? { cancelled_at: now } : {}),
          ...(action === 'CONVERTED' ? { converted_at: now } : {}),
        },
        select: { id: true },
      });
      await tx.property.update({ where: { id: before.property_id }, data: { status: propertyStatus } });
      await tx.reservationEvent.create({
        data: {
          reservation_id: id,
          event_type: action,
          actor_user_id: actor.id,
          note: review.note,
          metadata: { review_reference: review.review_reference },
        },
      });
      await tx.propertyStatusHistory.create({
        data: {
          property_id: before.property_id,
          previous_status: before.property.status,
          next_status: propertyStatus,
          reason: `Reservation ${action.toLowerCase()}`,
          actor_user_id: actor.id,
          reservation_id: id,
        },
      });
      if (action === 'CONVERTED') {
        await tx.customerProperty.createMany({
          data: [{ customer_id: before.customer_id, property_id: before.property_id, relationship_type: 'BUYER', status: 'ACTIVE' }],
          skipDuplicates: true,
        });
      }
      const context = {
        actor_user_id: actor.id,
        company_id: scope.company_id ?? before.property.project.company_id,
        project_id: scope.project_id ?? before.property.project_id,
        entity_type: 'reservation',
        entity_id: id,
      };
      await this.audit.record({
        ...context,
        action: `reservation.${action.toLowerCase()}`,
        before_data: { status: before.status },
        after_data: { status: next, review_reference: review.review_reference },
      }, tx);
      await this.events.publish(`RESERVATION.${action}`, { reservation_id: id }, context, tx);

      const final = await tx.reservation.findUnique({
        where: { id },
        select: this.selectFor(projection),
      });
      if (!final) throw new NotFoundException('Reservation not found after transition');
      return final;
    }, { isolationLevel: 'Serializable' });
  }

  private nextState(current: ReservationStatus, action: ReservationAction): ReservationStatus | null {
    if (action === 'CONFIRMED' && current === ReservationStatus.PENDING) return ReservationStatus.CONFIRMED;
    if (action === 'EXPIRED' && current === ReservationStatus.PENDING) return ReservationStatus.EXPIRED;
    if (action === 'CANCELLED' && (current === ReservationStatus.PENDING || current === ReservationStatus.CONFIRMED)) return ReservationStatus.CANCELLED;
    if (action === 'CONVERTED' && current === ReservationStatus.CONFIRMED) return ReservationStatus.CONVERTED;
    return null;
  }

  async assertOwner(id: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id }, select: { customer_id: true } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.customer_id !== userId) throw new ForbiddenException('Reservation is not linked to your account');
  }
}
