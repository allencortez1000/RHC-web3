import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { Response } from 'express';
import { requestContext } from './request-context.middleware';
import { getControlledErrorLogMetadata } from './controlled-errors';
import { ROUTE_TEMPLATE_MAX_LENGTH, StructuredLogger } from './structured-logger';

const publicMessages: Record<number, string> = {
  400: 'Invalid request data',
  401: 'Authentication required',
  403: 'Access denied',
  404: 'Resource not found',
  409: 'Resource conflict',
  413: 'Request too large',
  429: 'Too many requests',
  503: 'Service temporarily unavailable',
};

type RequestForLogging = {
  requestId?: string;
  correlationId?: string;
  requestStartedAt?: number;
  method?: string;
  baseUrl?: string;
  route?: { path?: string | string[] };
};

function routeTemplate(req: RequestForLogging): string | undefined {
  const rawPath = Array.isArray(req.route?.path) ? req.route?.path[0] : req.route?.path;
  if (typeof rawPath !== 'string' || !/^\/[A-Za-z0-9_./:{}*+-]{0,255}$/.test(rawPath)) return undefined;
  const baseUrl = typeof req.baseUrl === 'string' && /^\/[A-Za-z0-9_./:{}*+-]{0,96}$/.test(req.baseUrl) ? req.baseUrl : '';
  const combined = `${baseUrl}${rawPath}`;
  return combined.length <= ROUTE_TEMPLATE_MAX_LENGTH ? combined : undefined;
}

function categoryForStatus(status: number): string {
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limit';
  if (status === 503) return 'provider_unavailable';
  if (status >= 500) return 'internal_error';
  return 'validation';
}

function internalCodeForStatus(status: number): string {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 503) return 'SERVICE_UNAVAILABLE';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'BAD_REQUEST';
}

@Injectable()
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger = new StructuredLogger('error', () => undefined)) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestForLogging>();
    const res = ctx.getResponse<Response>();
    let status = 500;
    if (exception instanceof ZodError) status = 400;
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') status = 404;
      else if (exception.code === 'P2002') status = 409;
      else if (exception.code === 'P2003') status = 400;
    } else if (exception instanceof HttpException) status = exception.getStatus();

    const metadata = getControlledErrorLogMetadata(exception);
    if (status >= 500) {
      try {
        const context = requestContext.getStore();
        const startedAt = req.requestStartedAt;
        this.logger.error({
          event: 'http.request.error',
          request_id: context?.request_id ?? req.requestId,
          correlation_id: context?.correlation_id ?? req.correlationId,
          method: req.method,
          route: routeTemplate(req),
          status,
          category: metadata?.category ?? categoryForStatus(status),
          internal_code: metadata?.internal_code ?? internalCodeForStatus(status),
          duration_ms: typeof startedAt === 'number' ? Math.max(0, Date.now() - startedAt) : undefined,
          service: 'api',
          provider: metadata?.provider,
          operation: metadata?.operation,
          provider_status: metadata?.provider_status,
        });
      } catch {
        // The response path must remain available if an injected log sink fails.
      }
    }

    const message = publicMessages[status] ?? (status >= 500 ? 'An unexpected error occurred' : 'Request rejected');
    const code = internalCodeForStatus(status);
    res.status(status).json({ success: false, error: { code, message }, meta: { request_id: req.requestId ?? requestContext.getStore()?.request_id } });
  }
}
