import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../platform/prisma.service';

const REQUIRED_FEATURE = 'required_feature';
export const RequireFeature = (key: string | null) => SetMetadata(REQUIRED_FEATURE, key);

@Injectable()
export class FeatureService {
  constructor(private readonly prisma: PrismaService) {}
  async isEnabled(key: string): Promise<boolean> {
    // Read-preview is deployment configuration, not a DB grant or token activation.
    if (key === 'ENABLE_WEB3_READ_PREVIEW') return process.env.ENABLE_WEB3_READ_PREVIEW === 'true';
    const flag = await this.prisma.featureFlag.findUnique({ where: { key }, select: { enabled: true, scope: true } });
    return flag?.enabled === true && flag.scope === 'GLOBAL';
  }

  async require(key: string) {
    if (!await this.isEnabled(key)) throw new ForbiddenException('Feature is disabled');
  }
}

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly features: FeatureService) {}
  async canActivate(context: ExecutionContext) {
    const key = this.reflector.getAllAndOverride<string | null>(REQUIRED_FEATURE, [context.getHandler(), context.getClass()]);
    if (key) await this.features.require(key);
    return true;
  }
}
