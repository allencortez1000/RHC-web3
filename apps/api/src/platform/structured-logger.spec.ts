import { StructuredLogEntry, StructuredLogger } from './structured-logger';

describe('StructuredLogger', () => {
  let entries: StructuredLogEntry[];

  beforeEach(() => { entries = []; });

  it('honors LOG_LEVEL while emitting only allowlisted structured fields', () => {
    const logger = new StructuredLogger('warn', (entry) => entries.push(entry));
    logger.info({ event: 'ignored.info', service: 'api' });
    logger.warn({
      event: 'http.request.error', request_id: 'request-1', correlation_id: 'correlation-1', method: 'GET', route: '/api/v1/admin/users/:id', status: 500,
      category: 'internal_error', internal_code: 'INTERNAL_ERROR', duration_ms: 12, service: 'api',
      authorization: 'Bearer secret-token', token: 'jwt', raw_request_body: { password: 'secret' }, provider_response: { body: 'secret' },
    } as any);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ level: 'warn', event: 'http.request.error', request_id: 'request-1', correlation_id: 'correlation-1', route: '/api/v1/admin/users/:id', category: 'internal_error' });
    expect(JSON.stringify(entries[0])).not.toMatch(/authorization|Bearer|token|password|provider_response|secret/i);
  });

  it('accepts the shared maximum route-template length and omits longer routes', () => {
    const logger = new StructuredLogger('debug', (entry) => entries.push(entry));
    const maximumRoute = `/${'a'.repeat(255)}`;
    const oversizedRoute = `/${'a'.repeat(256)}`;

    logger.info({ event: 'route.max', route: maximumRoute });
    logger.info({ event: 'route.oversized', route: oversizedRoute });

    expect(entries).toHaveLength(2);
    expect(entries[0].route).toBe(maximumRoute);
    expect(entries[1].route).toBeUndefined();
  });

  it('does not serialize an arbitrary provider error or request body', () => {
    const logger = new StructuredLogger('debug', (entry) => entries.push(entry));
    logger.error({ event: 'provider.failure', provider: 'supabase', operation: 'admin_identity_lookup', error: { response: { data: 'provider-secret' } }, request_body: { email: 'private@example.test' } } as any);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(expect.objectContaining({ provider: 'supabase', operation: 'admin_identity_lookup' }));
    expect(JSON.stringify(entries[0])).not.toMatch(/provider-secret|private@example|provider_response|request_body/i);
  });

  it('swallows sink failures so logging cannot break the response path', () => {
    const logger = new StructuredLogger('debug', () => { throw new Error('sink unavailable'); });
    expect(() => logger.error({ event: 'http.request.error', category: 'internal_error', internal_code: 'INTERNAL_ERROR' })).not.toThrow();
  });

  it('rejects an invalid log level instead of accepting an unexpected mode', () => {
    expect(() => new StructuredLogger('trace')).toThrow('Invalid LOG_LEVEL');
  });
});
