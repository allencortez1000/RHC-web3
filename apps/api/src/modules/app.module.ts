import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../platform/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { RbacService } from './security/rbac.service';
import { AuditService } from './security/audit.service';
import { EventsService } from './events/events.service';
import { MeController } from './customers/me.controller';
import { DirectoryController } from './directory/directory.controller';
import { AdminController } from './admin/admin.controller';
import { RhcIdService } from './identity/rhc-id.service';
import { SupabaseJwtService } from './security/supabase-jwt.service';
import { ApplicationUserService } from './security/application-user.service';
import { AuthGuard } from './security/auth.guard';
import { PermissionGuard } from './security/permission.guard';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
  controllers: [AuthController, MeController, DirectoryController, AdminController],
  providers: [PrismaService, AuthService, RbacService, AuditService, EventsService, RhcIdService, SupabaseJwtService, ApplicationUserService, AuthGuard, PermissionGuard],
})
export class AppModule {}
