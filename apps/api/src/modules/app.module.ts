import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiExceptionFilter } from '../platform/api-exception.filter';
import { RequestContextMiddleware } from '../platform/request-context.middleware';
import { ResponseEnvelopeInterceptor } from '../platform/response-envelope.interceptor';
import { HealthController } from '../platform/health.controller';
import { FeatureGuard, FeatureService } from './security/feature.guard';
import { RateLimitGuard, RateLimitStore } from './security/rate-limit.guard';
import { CompanyApiKeyService } from './security/company-api-key.service';
import { InternalIntegrationController } from './security/internal-integration.controller';
import { InternalIntegrationService } from './security/internal-integration.service';
import { ApiClientsController, CompanyApiController, CompanyApiGuard } from './security/company-api.controller';
import { PrismaService } from '../platform/prisma.service';
import { AuthController } from './auth/auth.controller';

import { RbacService } from './security/rbac.service';
import { AuditService } from './security/audit.service';
import { EventsService } from './events/events.service';
import { MeController } from './customers/me.controller';
import { ConsentController } from './customers/consent.controller';
import { DirectoryController } from './directory/directory.controller';
import { AdminController } from './admin/admin.controller';
import { ManagementController } from './admin/management.controller';
import { CustomerReservationsController, AdminReservationsController } from './reservations/reservations.controller';
import { ReservationsService } from './reservations/reservations.service';
import { RhcIdService } from './identity/rhc-id.service';
import { SupabaseJwtService } from './security/supabase-jwt.service';
import { ApplicationUserService } from './security/application-user.service';
import { AuthGuard } from './security/auth.guard';
import { PermissionGuard } from './security/permission.guard';

@Module({
  controllers: [AuthController, MeController, CustomerReservationsController, ConsentController, DirectoryController, AdminController, AdminReservationsController, HealthController, ApiClientsController, CompanyApiController, InternalIntegrationController, ManagementController],
  providers: [PrismaService, RbacService, AuditService, EventsService, RhcIdService, ReservationsService, SupabaseJwtService, ApplicationUserService, AuthGuard, PermissionGuard, FeatureService, RateLimitStore, CompanyApiKeyService, CompanyApiGuard, InternalIntegrationService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(RequestContextMiddleware).forRoutes('*'); }
}
