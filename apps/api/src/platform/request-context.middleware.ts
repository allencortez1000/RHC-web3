import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export class RequestContextMiddleware {
  use(req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) {
    req.requestId = String(req.headers['x-request-id'] ?? randomUUID());
    req.correlationId = String(req.headers['x-correlation-id'] ?? req.requestId);
    res.setHeader('x-request-id', req.requestId);
    res.setHeader('x-correlation-id', req.correlationId);
    next();
  }
}
