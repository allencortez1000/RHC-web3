import { Body, Controller, Header, Headers, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CompanyApiGuard, RequireApiScope } from './company-api.controller';
import type { CompanyPrincipal } from './company-api-key.service';
import { RequireFeature } from './feature.guard';
import { RateLimit } from './rate-limit.guard';
import { emptyBody } from '../../platform/dto';
import { identityVerificationBody, integrationEventBody, integrationIdempotencyKey, InternalIntegrationService } from './internal-integration.service';

@Controller('internal')
@UseGuards(CompanyApiGuard)
@RequireFeature('ENABLE_INTEGRATION_FRAMEWORK')
@RateLimit(20)
export class InternalIntegrationController {
  constructor(private readonly integrations: InternalIntegrationService) {}

  @Post('identity/verify') @HttpCode(200) @RequireApiScope('identity.verify') @RequireFeature('ENABLE_RHC_ID') @Header('Cache-Control', 'no-store')
  verify(@Req() req: { companyPrincipal: CompanyPrincipal }, @Headers('idempotency-key') key: unknown, @Body() body: unknown, @Query() query: unknown) {
    emptyBody.parse(query);
    return this.integrations.verifyIdentity(req.companyPrincipal, integrationIdempotencyKey.parse(key), identityVerificationBody.parse(body));
  }

  @Post('events') @HttpCode(202) @RequireApiScope('events.write') @Header('Cache-Control', 'no-store')
  events(@Req() req: { companyPrincipal: CompanyPrincipal }, @Headers('idempotency-key') key: unknown, @Body() body: unknown, @Query() query: unknown) {
    emptyBody.parse(query);
    return this.integrations.receiveEvent(req.companyPrincipal, integrationIdempotencyKey.parse(key), integrationEventBody.parse(body));
  }
}
