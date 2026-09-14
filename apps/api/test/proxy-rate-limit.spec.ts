import 'reflect-metadata';
import { Controller, Get, Module, Req } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { loadEnv } from '@rhc/config';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import request from 'supertest';
import { configureTrustedProxy } from '../src/main';
import { RateLimit, RateLimitGuard, RateLimitStore } from '../src/modules/security/rate-limit.guard';

@Controller('probe')
@RateLimit(1)
class ProxyProbeController {
  @Get()
  probe(@Req() req: Request) { return { ip: req.ip }; }
}

@Module({
  controllers: [ProxyProbeController],
  providers: [RateLimitStore, { provide: APP_GUARD, useClass: RateLimitGuard }],
})
class ProxyProbeModule {}

// Uses real Express req.ip resolution and the global guard, with no DB or Redis connection.
// Loopback CIDRs below are test-only peers, not a deployment recommendation.
describe('trusted proxy IP rate limiting', () => {
  let app: NestExpressApplication | undefined;
  let consume: jest.Mock;

  async function start(proxies?: string) {
    const buckets = new Map<string, number>();
    consume = jest.fn(async (key: string) => {
      const count = (buckets.get(key) ?? 0) + 1;
      buckets.set(key, count);
      return { count, retryAfter: 60 };
    });
    const module = await Test.createTestingModule({ imports: [ProxyProbeModule] })
      .overrideProvider(RateLimitStore).useValue({ consume }).compile();
    app = module.createNestApplication<NestExpressApplication>({ logger: false });
    configureTrustedProxy(app, loadEnv({ NODE_ENV: 'test', TRUSTED_PROXY_CIDRS: proxies }));
    await app.init();
    return app.getHttpServer();
  }

  afterEach(async () => { await app?.close(); });

  it.each([
    ['IPv4', '198.51.100.10', '198.51.100.11'],
    ['IPv6', '2001:db8:1::10', '2001:db8:1::11'],
  ])('gives two forwarded %s clients independent buckets through an allowlisted peer', async (_family, first, second) => {
    const server = await start('127.0.0.1/32, ::1/128');
    await request(server).get('/probe').set('X-Forwarded-For', first).expect(200, { ip: first });
    await request(server).get('/probe').set('X-Forwarded-For', second).expect(200, { ip: second });
    const blocked = await request(server).get('/probe').set('X-Forwarded-For', first).expect(429);
    expect(blocked.headers['retry-after']).toBe('60');
    const keys = consume.mock.calls.map(([key]) => String(key));
    for (const ip of [first, second]) {
      expect(keys.some((key) => key.endsWith(createHash('sha256').update(ip).digest('hex')))).toBe(true);
    }
  });

  it.each([undefined, '192.0.2.0/24, 2001:db8:2::/64'])('ignores forged forwarding from an untrusted socket (%s)', async (proxies) => {
    const server = await start(proxies);
    const first = await request(server).get('/probe').set('X-Forwarded-For', '198.51.100.10').expect(200);
    expect(['127.0.0.1', '::ffff:127.0.0.1', '::1']).toContain(first.body.ip);
    await request(server).get('/probe').set('X-Forwarded-For', '198.51.100.11').expect(429);
    expect(consume.mock.calls[0][0]).toBe(consume.mock.calls[2][0]);
    expect(consume.mock.calls[1][0]).toBe(consume.mock.calls[3][0]);
    if (proxies === undefined) expect(app?.getHttpAdapter().getInstance().get('trust proxy')).toBe(false);
  });

  it('stops at the nearest untrusted hop rather than trusting a forged leftmost client', async () => {
    const server = await start('127.0.0.1/32, ::1/128');
    await request(server).get('/probe').set('X-Forwarded-For', '203.0.113.1, 198.51.100.10').expect(200, { ip: '198.51.100.10' });
    await request(server).get('/probe').set('X-Forwarded-For', '203.0.113.2, 198.51.100.10').expect(429);
  });

  it('does not derive pre-auth buckets from bearer tokens', async () => {
    const server = await start();
    await request(server).get('/probe').set('Authorization', 'Bearer unverified-one').expect(200);
    await request(server).get('/probe').set('Authorization', 'Bearer unverified-two').expect(429);
    expect(consume.mock.calls[0][0]).toBe(consume.mock.calls[2][0]);
  });
});
