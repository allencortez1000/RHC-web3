import { ReadError } from './errors';
export type ReadMethod = 'eth_chainId' | 'eth_getBlockByNumber' | 'eth_getCode' | 'eth_call';
const METHODS: readonly string[] = ['eth_chainId', 'eth_getBlockByNumber', 'eth_getCode', 'eth_call'];
const MAX_RESPONSE_BYTES = 262144;
export interface RpcReadRequest { method: ReadMethod; params?: readonly unknown[] }

// Owned fetch is intentional: SDK 5.121.6 clears its abort timer before body consumption.
// This signal covers headers AND the bounded body, with redirects forbidden to protect credentials.
export function createTransport(chainId: number, clientId: string, secretKey: string, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  let requestId = 0;
  return async ({ method, params }: RpcReadRequest): Promise<unknown> => {
    if (!METHODS.includes(method)) throw new ReadError('BAD_RESPONSE');
    signal.throwIfAborted();
    const id = ++requestId;
    try {
      const response = await fetcher(`https://${chainId}.rpc.thirdweb.com/${encodeURIComponent(clientId)}`, {
        method: 'POST', redirect: 'error', signal,
        headers: { 'content-type': 'application/json', 'x-secret-key': secretKey, 'x-client-id': clientId },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? [] }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401 || response.status === 403) throw new ReadError('PROVIDER_AUTH');
        if (response.status === 429) {
          const header = response.headers.get('retry-after') || '';
          const wait = /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now();
          throw new ReadError('RATE_LIMITED', Number.isFinite(wait) ? Math.max(30000, wait) : 30000);
        }
        throw new ReadError(response.status >= 500 ? 'TRANSIENT' : 'PROVIDER_UNAVAILABLE');
      }
      if (!response.body) throw new ReadError('BAD_RESPONSE');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          signal.throwIfAborted();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_RESPONSE_BYTES) throw new ReadError('BAD_RESPONSE');
          chunks.push(value);
        }
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
      const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!json || json.jsonrpc !== '2.0' || json.id !== id) throw new ReadError('BAD_RESPONSE');
      if (json.error) {
        if (json.error.code === 429 || json.error.code === -32005) throw new ReadError('RATE_LIMITED', 30000);
        if (json.error.code === 401 || json.error.code === 403) throw new ReadError('PROVIDER_AUTH');
        // A revert/missing method does not establish false, zero, or contract-wide restrictions.
        throw new ReadError('METHOD_UNAVAILABLE');
      }
      if (!Object.prototype.hasOwnProperty.call(json, 'result')) throw new ReadError('BAD_RESPONSE');
      return json.result;
    } catch (error) {
      if (signal.aborted) throw new ReadError('TIMEOUT');
      if (error instanceof ReadError) throw error;
      // Never propagate native fetch error strings or URLs.
      throw new ReadError(error instanceof TypeError ? 'TRANSIENT' : 'BAD_RESPONSE');
    }
  };
}
