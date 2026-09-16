import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { adminReservationCreate, reservationAction, reservationCreate, reservationQuery, uuid } from '../../platform/dto';
import { AuthGuard } from '../security/auth.guard';
import { PermissionGuard } from '../security/permission.guard';
import { Authorization, Authorized, RequirePermission } from '../security/permission.decorator';
import { CurrentUser, AuthUser } from '../security/auth-user.decorator';
import { RequireFeature } from '../security/feature.guard';
import { RateLimit } from '../security/rate-limit.guard';
import { RbacService } from '../security/rbac.service';
import { ReservationsService } from './reservations.service';

type ReservationDelegates = { reservation: any };
const reservationDb = <T extends object>(client: T) => client as T & ReservationDelegates;

const reservationInclude = {
  property: { include: { project: { include: { company: { select: { id: true, company_code: true, display_name: true } } } } } },
  customer: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true, rhc_id: true } } } },
  events: { orderBy: { created_at: 'desc' as const }, take: 20 },
};

@Controller('me/reservations')
@UseGuards(AuthGuard)
@RequireFeature('ENABLE_PROPERTIES')
export class CustomerReservationsController {
  constructor(private readonly prisma: PrismaService, private readonly reservations: ReservationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const q = reservationQuery.parse(query);
    return reservationDb(this.prisma).reservation.findMany({
      where: { customer_id: user.id, status: q.status },
      include: reservationInclude,
      take: q.take,
      skip: q.skip,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  @Post() @RateLimit(5)
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const data = reservationCreate.parse(body);
    return this.reservations.create(user.id, data.property_id, user);
  }

  @Post(':id/cancel') @RateLimit(10)
  async cancel(@Param('id') rawId: string, @CurrentUser() user: AuthUser) {
    const id = uuid.parse(rawId);
    await this.reservations.assertOwner(id, user.id);
    return this.reservations.transition(id, 'CANCELLED', user, { review_reference: 'CUSTOMER-CANCELLED', note: 'Customer cancelled reservation' });
  }
}

@Controller('admin/reservations')
@UseGuards(AuthGuard, PermissionGuard)
@RequireFeature('ENABLE_PROPERTIES')
@RateLimit(60)
export class AdminReservationsController {
  constructor(private readonly prisma: PrismaService, private readonly rbac: RbacService, private readonly reservations: ReservationsService) {}

  @Get() @RequirePermission('reservation.view', { list: 'property' })
  list(@Authorized() access: Authorization, @Query() query: unknown) {
    const q = reservationQuery.parse(query);
    return reservationDb(this.prisma).reservation.findMany({
      where: { AND: [{ property: this.rbac.propertyWhere(access.grants) }, { status: q.status }] },
      include: reservationInclude,
      take: q.take,
      skip: q.skip,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  @Post() @RequirePermission('reservation.create', { target: 'body-property' })
  create(@Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    const data = adminReservationCreate.parse(body);
    return this.reservations.create(data.customer_id, data.property_id, actor, access.scope);
  }

  @Post(':id/confirm') @RequirePermission('reservation.manage', { target: 'reservation' })
  confirm(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    return this.reservations.transition(uuid.parse(rawId), 'CONFIRMED', actor, reservationAction.parse(body), access.scope);
  }

  @Post(':id/expire') @RequirePermission('reservation.manage', { target: 'reservation' })
  expire(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    return this.reservations.transition(uuid.parse(rawId), 'EXPIRED', actor, reservationAction.parse(body), access.scope);
  }

  @Post(':id/cancel') @RequirePermission('reservation.cancel', { target: 'reservation' })
  cancel(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    return this.reservations.transition(uuid.parse(rawId), 'CANCELLED', actor, reservationAction.parse(body), access.scope);
  }

  @Post(':id/convert') @RequirePermission('reservation.manage', { target: 'reservation' })
  convert(@Param('id') rawId: string, @Body() body: unknown, @CurrentUser() actor: AuthUser, @Authorized() access: Authorization) {
    return this.reservations.transition(uuid.parse(rawId), 'CONVERTED', actor, reservationAction.parse(body), access.scope);
  }
}
