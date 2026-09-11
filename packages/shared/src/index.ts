import { randomUUID } from 'crypto';

export function newRequestId(): string {
  return randomUUID();
}

export function apiSuccess<T>(data: T, requestId: string) {
  return { success: true as const, data, meta: { request_id: requestId } };
}

export function apiError(code: string, message: string, requestId: string) {
  return { success: false as const, error: { code, message }, meta: { request_id: requestId } };
}

const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'otp', 'privateKey'];

export function redactSensitive(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactSensitive);
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, value]) => [
        key,
        sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))
          ? '[REDACTED]'
          : redactSensitive(value),
      ]),
    );
  }
  return input;
}

export function generateCorrelationId(existing?: string): string {
  return existing && existing.length <= 128 ? existing : randomUUID();
}
