import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { LivenessProbe, RateLimitStore } from '../modules/security/rate-limit.guard';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly rates: RateLimitStore) {}
  @Get() @LivenessProbe() live() { return { status: 'ok' }; }
  @Get('ready')
  async ready() {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Probe timeout')), 3500); });
      const [database, redis] = await Promise.race([Promise.all([this.prisma.$queryRaw`SELECT 1`.then(() => true), this.rates.healthy()]), deadline]);
      if (!database || !redis) throw new Error('Dependency unavailable');
      return { status: 'ok' };
    } catch { throw new ServiceUnavailableException('Service temporarily unavailable'); }
    finally { if (timeout) clearTimeout(timeout); }
  }
}
