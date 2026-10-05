import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../security/auth.guard';
import { PermissionGuard } from '../security/permission.guard';
import { RequirePermission } from '../security/permission.decorator';
import { RateLimit } from '../security/rate-limit.guard';
import { Web3Service } from './web3.service';

@Controller('web3')
@UseGuards(AuthGuard)
@RateLimit(60)
export class Web3Controller {
  constructor(private readonly web3: Web3Service) {}

  @Get('token')
  @Header('Cache-Control', 'no-store')
  token() { return this.web3.getTokenSnapshot(); }
}

@Controller('admin/integrations/thirdweb')
@UseGuards(AuthGuard, PermissionGuard)
@RateLimit(60)
export class ThirdwebIntegrationController {
  constructor(private readonly web3: Web3Service) {}

  @Get()
  // Server-wide configuration has no tenant resource to scope/filter.
  @RequirePermission('integration.view', { target: 'global' })
  @Header('Cache-Control', 'no-store')
  status() { return this.web3.getReadStatus(); }
}
