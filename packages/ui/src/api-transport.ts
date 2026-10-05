import { RequestScope } from './request-scope';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiRequestUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) throw new Error('The API URL is not configured.');
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new Error('Invalid API path.');
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('Invalid API URL.');
  return (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) + path;
}

export async function fetchApiResponse<T>(url: string, init: RequestInit, pending: ReturnType<RequestScope['open']>): Promise<{ data: T; meta?: Record<string, unknown> }> {
  pending.assertCurrent();
  const response = await pending.wait(fetch(url, { ...init, signal: pending.signal, cache: 'no-store', credentials: 'omit', redirect: 'error' }));
  const body = response.status === 204 || init.method?.toUpperCase() === 'HEAD'
    ? undefined : await pending.wait(response.json().catch(() => null));
  pending.assertCurrent();
  const requestId = typeof body?.meta?.request_id === 'string' ? body.meta.request_id : response.headers.get('x-request-id') ?? undefined;
  const code = typeof body?.error?.code === 'string' ? body.error.code : undefined;
  if (!response.ok || body?.success === false) {
    const detail = typeof body?.error?.message === 'string' ? body.error.message
      : Array.isArray(body?.message) ? body.message.filter((value: unknown) => typeof value === 'string').join(', ')
        : typeof body?.message === 'string' ? body.message : '';
    const message = response.status === 401 ? 'Your session or account is unavailable. Please sign in again.'
      : response.status === 403 && !detail.toLowerCase().startsWith('you do not have permission')
        ? 'You do not have permission to complete this action.' + (detail ? ' ' + detail : '')
        : detail || 'The request failed. Please try again.';
    throw new ApiError(response.status, message, code, requestId);
  }
  if (body === null || (body?.success === true && !Object.prototype.hasOwnProperty.call(body, 'data'))) {
    throw new ApiError(response.status, 'The API returned an invalid response. Please try again.', 'INVALID_RESPONSE', requestId);
  }
  return { data: (body?.success === true ? body.data : body) as T, meta: body?.meta };
}

/** Anonymous transport: no session lookup, Authorization header, or ambient cookies. */
export async function publicApiRequest<T>(apiUrl: string | undefined, path: string, init: RequestInit = {}): Promise<T> {
  const url = apiRequestUrl(apiUrl, path);
  const pending = new RequestScope().open(init.signal);
  const headers = new Headers(init.headers);
  headers.delete('Authorization');
  if (init.body) headers.set('Content-Type', 'application/json');
  try {
    return (await fetchApiResponse<T>(url, { ...init, headers }, pending)).data;
  } finally {
    pending.close();
  }
}
