import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ requestId?: string }>();
    const res = ctx.getResponse<Response>();
    let status = 500;
    let message = 'An unexpected error occurred';
    if (exception instanceof ZodError) { status = 400; message = 'Invalid request data'; }
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') { status = 404; message = 'Resource not found'; }
      else if (exception.code === 'P2002') { status = 409; message = 'Resource already exists'; }
      else if (exception.code === 'P2003') { status = 400; message = 'Invalid resource reference'; }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      // Only controlled status text is public, never driver/JWT/upstream diagnostics.
      message = ({ 400: 'Invalid request data', 401: 'Authentication required', 403: 'Access denied', 404: 'Resource not found', 409: 'Resource conflict', 413: 'Request too large', 429: 'Too many requests', 503: 'Service temporarily unavailable' } as Record<number, string>)[status] ?? (status >= 500 ? 'An unexpected error occurred' : 'Request rejected');
    }
    const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : status === 429 ? 'RATE_LIMITED' : status === 503 ? 'SERVICE_UNAVAILABLE' : status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
    res.status(status).json({ success: false, error: { code, message }, meta: { request_id: req.requestId } });
  }
}
