import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestContext = { request_id: string; correlation_id: string; ip_address?: string; user_agent?: string };
export const requestContext = new AsyncLocalStorage<RequestContext>();
const safeId = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? value : undefined;

export class RequestContextMiddleware {
  use(req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) {
    // Request IDs are server-issued; correlation IDs may be safely propagated.
    req.requestId = randomUUID();
    req.correlationId = safeId(req.headers['x-correlation-id']) ?? req.requestId;
    res.setHeader('x-request-id', req.requestId);
    res.setHeader('x-correlation-id', req.correlationId);
    requestContext.run({ request_id: req.requestId, correlation_id: req.correlationId, ip_address: req.ip ?? req.socket.remoteAddress, user_agent: req.get('user-agent')?.slice(0, 512).split('').filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127).join('') }, next);
  }
}
