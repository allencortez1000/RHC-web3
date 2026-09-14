import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { RateLimitStore } from '../src/modules/security/rate-limit.guard';

// Exercises the real @upstash/redis HTTP adapter, without live service credentials.
// The local REST peer is a transport fixture, not a substitute Redis integration test.
describe('Upstash rate store REST adapter', () => {
  let server: Server;
  let previousUrl: string | undefined;
  let previousToken: string | undefined;
  let commands: unknown[][];
  let fail: boolean;
  let count: number;
  beforeEach(async () => {
    commands = []; fail = false; count = 0;
    previousUrl = process.env.UPSTASH_REDIS_REST_URL;
    previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        if (fail) { res.statusCode = 503; res.end(JSON.stringify({ error: 'fixture outage' })); return; }
        const payload = JSON.parse(body);
        const pipeline = Array.isArray(payload[0]);
        const batch = pipeline ? payload : [payload];
        const results = batch.map((command: unknown[]) => {
          commands.push(command);
          if (String(command[0]).toLowerCase() === 'ping') return { result: Buffer.from('PONG').toString('base64') };
          count += 1;
          return { result: [count, 60000] };
        });
        res.end(JSON.stringify(pipeline ? results : results[0]));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-rest-token';
  });
  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  });

  it('uses atomic EVAL with expiry and a shared remote counter', async () => {
    const first = new RateLimitStore();
    const second = new RateLimitStore();
    expect(await first.consume('rhc:test:bucket', 60)).toEqual({ count: 1, retryAfter: 60 });
    expect(await second.consume('rhc:test:bucket', 60)).toEqual({ count: 2, retryAfter: 60 });
    expect(commands[0][0]).toBe('eval');
    expect(commands[0][1]).toEqual(expect.stringContaining("redis.call('INCR', KEYS[1])"));
    expect(commands[0][1]).toEqual(expect.stringContaining("redis.call('PEXPIRE', KEYS[1], ARGV[1])"));
    expect(commands[0].slice(2)).toEqual([1, 'rhc:test:bucket', 60000]);
    expect(await first.healthy()).toBe(true);
  });

  it('fails closed on Redis errors and missing credentials, without local counter fallback', async () => {
    const store = new RateLimitStore();
    fail = true;
    await expect(store.consume('rhc:test:bucket', 60)).rejects.toMatchObject({ status: 503 });
    expect(await store.healthy()).toBe(false);
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const missing = new RateLimitStore();
    await expect(missing.consume('rhc:test:bucket', 60)).rejects.toMatchObject({ status: 503 });
    expect(await missing.healthy()).toBe(false);
  });
});
