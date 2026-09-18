import { ArgumentsHost, ForbiddenException } from '@nestjs/common';
import { ZodError } from 'zod';
import { SupabaseAdminCredentialRejectedException, SupabaseJwksUnavailableException, SupabaseProviderUnavailableException } from '../modules/security/supabase-jwt.service';
import { requestContext } from './request-context.middleware';
import { ApiExceptionFilter } from './api-exception.filter';
import type { StructuredLogFields } from './structured-logger';

function fixture() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const request = {
    requestId: 'request-1', correlationId: 'correlation-1', requestStartedAt: Date.now() - 12,
    method: 'GET', baseUrl: '/api/v1', route: { path: '/admin/users/:id' },
    headers: { authorization: 'Bearer never-log-this', cookie: 'session=never-log-this' },
    body: { password: 'never-log-this' },
  };
  const host = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) } as unknown as ArgumentsHost;
  const error = jest.fn<void, [StructuredLogFields]>();
  return { response, request, host, error, filter: new ApiExceptionFilter({ error } as any) };
}

describe('ApiExceptionFilter', () => {
  it('returns a generic 500 and emits safe request context for an unexpected error', () => {
    const f = fixture();
    requestContext.run({ request_id: 'request-1', correlation_id: 'correlation-1' }, () => f.filter.catch(new Error('postgres://user:password@db/private'), f.host));

    expect(f.response.status).toHaveBeenCalledWith(500);
    expect(f.response.json).toHaveBeenCalledWith({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, meta: { request_id: 'request-1' } });
    expect(f.error).toHaveBeenCalledWith(expect.objectContaining({ event: 'http.request.error', request_id: 'request-1', correlation_id: 'correlation-1', method: 'GET', route: '/api/v1/admin/users/:id', status: 500, category: 'internal_error', internal_code: 'INTERNAL_ERROR', service: 'api', duration_ms: expect.any(Number) }));
    const logged = JSON.stringify(f.error.mock.calls[0][0]);
    expect(logged).not.toMatch(/Authorization|Bearer|cookie|password|postgres|private|request.body/i);
  });

  it('classifies provider unavailability without exposing the provider error', () => {
    const f = fixture();
    requestContext.run({ request_id: 'request-1', correlation_id: 'correlation-1' }, () => f.filter.catch(new SupabaseProviderUnavailableException({ category: 'provider_unavailable', internal_code: 'SUPABASE_AUTH_PROVIDER_UNAVAILABLE', provider: 'supabase', operation: 'admin_identity_lookup', provider_status: 503 }), f.host));

    expect(f.response.status).toHaveBeenCalledWith(503);
    expect(f.response.json).toHaveBeenCalledWith({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' }, meta: { request_id: 'request-1' } });
    expect(f.error).toHaveBeenCalledWith(expect.objectContaining({ category: 'provider_unavailable', internal_code: 'SUPABASE_AUTH_PROVIDER_UNAVAILABLE', provider: 'supabase', operation: 'admin_identity_lookup', provider_status: 503 }));
  });

  it('logs Admin credential rejection with its controlled operation and code while keeping the client response generic', () => {
    const f = fixture();
    requestContext.run({ request_id: 'request-1', correlation_id: 'correlation-1' }, () => f.filter.catch(new SupabaseAdminCredentialRejectedException(403), f.host));

    expect(f.response.status).toHaveBeenCalledWith(503);
    expect(f.response.json).toHaveBeenCalledWith({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' }, meta: { request_id: 'request-1' } });
    expect(f.error).toHaveBeenCalledWith(expect.objectContaining({ category: 'provider_unavailable', internal_code: 'SUPABASE_ADMIN_CREDENTIAL_REJECTED', provider: 'supabase', operation: 'admin_identity_lookup', provider_status: 403 }));
  });

  it('logs JWKS verification failure with the jwks_fetch operation', () => {
    const f = fixture();
    requestContext.run({ request_id: 'request-1', correlation_id: 'correlation-1' }, () => f.filter.catch(new SupabaseJwksUnavailableException(), f.host));

    expect(f.response.status).toHaveBeenCalledWith(503);
    expect(f.error).toHaveBeenCalledWith(expect.objectContaining({ category: 'provider_unavailable', internal_code: 'SUPABASE_JWKS_UNAVAILABLE', provider: 'supabase', operation: 'jwks_fetch' }));
  });

  it('keeps validation and authorization failures classified as controlled 4xx responses without noisy error logs', () => {
    const f = fixture();
    f.filter.catch(new ZodError([]), f.host);
    f.filter.catch(new ForbiddenException('sensitive internal detail'), f.host);

    expect(f.response.status).toHaveBeenNthCalledWith(1, 400);
    expect(f.response.status).toHaveBeenNthCalledWith(2, 403);
    expect(f.error).not.toHaveBeenCalled();
  });

  it('uses the shared route-template maximum when logging a long route template', () => {
    const f = fixture();
    f.request.baseUrl = '';
    f.request.route = { path: `/${'a'.repeat(255)}` };

    f.filter.catch(new Error('internal failure'), f.host);

    expect(f.error).toHaveBeenCalledWith(expect.objectContaining({ route: `/${'a'.repeat(255)}` }));
  });

  it('still returns the response when the injected logger throws', () => {
    const f = fixture();
    f.error.mockImplementation(() => { throw new Error('sink failed'); });

    expect(() => f.filter.catch(new Error('internal failure'), f.host)).not.toThrow();
    expect(f.response.status).toHaveBeenCalledWith(500);
    expect(f.response.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }));
  });
});
