import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ requestId?: string }>();
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) return data;
        return { success: true, data, meta: { request_id: req.requestId } };
      }),
    );
  }
}
