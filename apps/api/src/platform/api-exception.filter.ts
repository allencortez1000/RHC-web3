import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ requestId?: string }>();
    const res = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = typeof response === 'object' && response && 'message' in response ? String((response as { message: unknown }).message) : exception instanceof Error ? exception.message : 'Unexpected error';
    const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
    res.status(status).json({ success: false, error: { code, message }, meta: { request_id: req.requestId } });
  }
}
