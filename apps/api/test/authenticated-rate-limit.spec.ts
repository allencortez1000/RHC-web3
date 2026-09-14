import 'reflect-metadata';
import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { RateLimit, RateLimitStore } from '../src/modules/security/rate-limit.guard';

@RateLimit(2, 30)
class SubjectProbe {
  route() {}
  @RateLimit(1, 15)
  strict() {}
}

function context(handler = SubjectProbe.prototype.route) {
  const setHeader = jest.fn();
  const ctx = {
    getClass: () => SubjectProbe,
    getHandler: () => handler,
    switchToHttp: () => ({ getResponse: () => ({ setHeader } as unknown as Response) }),
  } as unknown as ExecutionContext;
  return { ctx, setHeader };
}

// Tests the post-auth integration seam only; production auth guards must call it after verification.
describe('verified application subject rate limiting', () => {
  let store: RateLimitStore;
  let consume: jest.SpyInstance;
  beforeEach(() => {
    // No constructor: this unit test must never inspect real Redis credentials.
    store = Object.create(RateLimitStore.prototype) as RateLimitStore;
    const buckets = new Map<string, number>();
    consume = jest.spyOn(store, 'consume').mockImplementation(async (key) => {
      const count = (buckets.get(key) ?? 0) + 1;
      buckets.set(key, count);
      return { count, retryAfter: 12 };
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('limits the same verified user independently of source IP or bearer rotation', async () => {
    const { ctx, setHeader } = context();
    // The API intentionally accepts no IP or bearer: only the verified stable application ID.
    await store.consumeAuthenticated(ctx, { kind: 'user', id: 'application-user-1' });
    await store.consumeAuthenticated(ctx, { kind: 'user', id: 'application-user-1' });
    await expect(store.consumeAuthenticated(ctx, { kind: 'user', id: 'application-user-1' })).rejects.toMatchObject({ status: 429 });
    expect(setHeader).toHaveBeenCalledWith('Retry-After', 12);
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Subject-Remaining', 0);
    expect(setHeader).not.toHaveBeenCalledWith('X-RateLimit-Remaining', expect.anything());
    const digest = createHash('sha256').update('application-user-1').digest('hex');
    expect(consume.mock.calls[0][0]).toContain(`:subject:user:all:${digest}`);
    expect(consume.mock.calls[1]).toEqual([expect.stringContaining(`:SubjectProbe:route:${digest}`), 30]);
    expect(consume.mock.calls.every(([key]) => !String(key).includes('application-user-1'))).toBe(true);
  });

  it('keeps users and authenticated clients in separate namespaces and honors method policy', async () => {
    const { ctx } = context(SubjectProbe.prototype.strict);
    await store.consumeAuthenticated(ctx, { kind: 'user', id: 'same-id' });
    await store.consumeAuthenticated(ctx, { kind: 'client', id: 'same-id' });
    await store.consumeAuthenticated(ctx, { kind: 'user', id: 'another-id' });
    await expect(store.consumeAuthenticated(ctx, { kind: 'user', id: 'same-id' })).rejects.toMatchObject({ status: 429 });
    expect(consume.mock.calls[0][0]).not.toBe(consume.mock.calls[2][0]);
    expect(consume.mock.calls[1][1]).toBe(15);
  });

  it('enforces the cross-route subject ceiling before consuming a route bucket', async () => {
    consume.mockResolvedValueOnce({ count: 301, retryAfter: 42 });
    const { ctx, setHeader } = context();
    await expect(store.consumeAuthenticated(ctx, { kind: 'client', id: 'verified-client' })).rejects.toMatchObject({ status: 429 });
    expect(consume).toHaveBeenCalledTimes(1);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', 42);
  });

  it('fails closed for store outages or a missing identity', async () => {
    const { ctx } = context();
    await expect(store.consumeAuthenticated(ctx, { kind: 'user', id: '' })).rejects.toMatchObject({ status: 503 });
    expect(consume).not.toHaveBeenCalled();
    consume.mockRejectedValueOnce(new ServiceUnavailableException('Rate limiting is unavailable'));
    await expect(store.consumeAuthenticated(ctx, { kind: 'user', id: 'verified-user' })).rejects.toMatchObject({ status: 503 });
  });
});
