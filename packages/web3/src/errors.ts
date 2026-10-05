export type ReadErrorCode = 'TIMEOUT' | 'TRANSIENT' | 'RATE_LIMITED' | 'PROVIDER_AUTH' | 'WRONG_CHAIN' | 'NO_CONTRACT' | 'REORG' | 'BAD_RESPONSE' | 'METHOD_UNAVAILABLE' | 'PROVIDER_UNAVAILABLE';
export class ReadError extends Error {
  constructor(public readonly code: ReadErrorCode, public readonly retryAfterMs = 0) { super(code); }
}
export function safeError(error: unknown): ReadError {
  return error instanceof ReadError ? error : new ReadError('PROVIDER_UNAVAILABLE');
}
