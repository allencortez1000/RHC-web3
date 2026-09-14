import { CanActivate, ExecutionContext, HttpException, Injectable, ServiceUnavailableException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';

type RatePolicy = { limit: number; windowSeconds: number };
export type AuthenticatedRateSubject = { kind: 'user' | 'client'; id: string };

const RATE_POLICY = 'rate_policy';
function ratePolicy(context: ExecutionContext): RatePolicy {
  return new Reflector().getAllAndOverride<RatePolicy>(RATE_POLICY, [context.getHandler(), context.getClass()]) ?? { limit: 120, windowSeconds: 60 };
}
const LIVENESS_PROBE = 'liveness_probe';
export const LivenessProbe = () => SetMetadata(LIVENESS_PROBE, true);
export const RateLimit = (limit: number, windowSeconds = 60) => SetMetadata(RATE_POLICY, { limit, windowSeconds });
const incrementWindow = `local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {count, ttl}`;

@Injectable()
export class RateLimitStore {
  private readonly redis: Redis | undefined;
  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) this.redis = new Redis({ url, token, retry: false, signal: () => AbortSignal.timeout(3000) });
  }
  async consume(key: string, windowSeconds: number): Promise<{ count: number; retryAfter: number }> {
    if (!this.redis) throw new ServiceUnavailableException('Rate limiting is unavailable');
    try {
      const result = await this.redis.eval<[number], [number, number]>(incrementWindow, [key], [windowSeconds * 1000]);
      if (!Array.isArray(result) || result.length !== 2 || !result.every(Number.isFinite) || result[0] < 1 || result[1] < 0) throw new Error('Invalid rate result');
      return { count: result[0], retryAfter: Math.max(1, Math.ceil(result[1] / 1000)) };
    } catch {
      throw new ServiceUnavailableException('Rate limiting is unavailable');
    }
  }
  // Call only after JWT verification + application-user resolution, or API-key authentication.
  // Never pass a decoded/unverified token subject, raw bearer token, or request parameter.
  async consumeAuthenticated(context: ExecutionContext, subject: AuthenticatedRateSubject): Promise<void> {
    if (!subject.id || !['user', 'client'].includes(subject.kind)) throw new ServiceUnavailableException('Rate limiting identity is unavailable');
    const res = context.switchToHttp().getResponse<Response>();
    const policy = ratePolicy(context);
    const digest = createHash('sha256').update(subject.id).digest('hex');
    const prefix = `rhc:rate:${process.env.NODE_ENV ?? 'development'}:subject:${subject.kind}`;
    const total = await this.consume(`${prefix}:all:${digest}`, 60);
    if (total.count > 300) {
      res.setHeader('Retry-After', total.retryAfter);
      throw new HttpException('Too many requests', 429);
    }
    const route = `${context.getClass().name}:${context.getHandler().name}`;
    const result = await this.consume(`${prefix}:${route}:${digest}`, policy.windowSeconds);
    // Keep the pre-auth IP headers intact; these describe the additional subject bucket.
    res.setHeader('X-RateLimit-Subject-Limit', policy.limit);
    res.setHeader('X-RateLimit-Subject-Remaining', Math.max(0, policy.limit - result.count));
    if (result.count > policy.limit) {
      res.setHeader('Retry-After', result.retryAfter);
      throw new HttpException('Too many requests', 429);
    }
  }
  async healthy(): Promise<boolean> {
    if (!this.redis) return false;
    try { return await this.redis.ping() === 'PONG'; } catch { return false; }
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly store: RateLimitStore) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.get<boolean>(LIVENESS_PROBE, context.getHandler())) return true;
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const policy = ratePolicy(context);
    // Express resolves forwarding only through the validated TRUSTED_PROXY_CIDRS allowlist.
    // Never read forwarding headers directly, caller-supplied tokens, or route parameters.
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const digest = createHash('sha256').update(ip).digest('hex');
    const prefix = `rhc:rate:${process.env.NODE_ENV ?? 'development'}`;
    const total = await this.store.consume(`${prefix}:all:${digest}`, 60);
    if (total.count > 300) {
      res.setHeader('Retry-After', total.retryAfter);
      throw new HttpException('Too many requests', 429);
    }
    const route = `${context.getClass().name}:${context.getHandler().name}`;
    const result = await this.store.consume(`${prefix}:${route}:${digest}`, policy.windowSeconds);
    res.setHeader('X-RateLimit-Limit', policy.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, policy.limit - result.count));
    if (result.count > policy.limit) {
      res.setHeader('Retry-After', result.retryAfter);
      throw new HttpException('Too many requests', 429);
    }
    return true;
  }
}
