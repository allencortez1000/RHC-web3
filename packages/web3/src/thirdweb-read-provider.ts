import type { Web3ReadResult } from '@rhc/types';
import type { ReadConfig } from './config';
import type { ReadProvider } from './read-provider';
import { ReadError, safeError } from './errors';
import { emptyResult } from './snapshot';
export type SnapshotReader = (config: ReadConfig, signal: AbortSignal) => Promise<Web3ReadResult>;
export class ThirdwebReadProvider implements ReadProvider {
  private last?: Web3ReadResult;
  private inflight?: Promise<Web3ReadResult>;
  private controller?: AbortController;
  private nextAttemptAt = 0;
  private disposed = false;
  constructor(private readonly config: ReadConfig, private readonly read: SnapshotReader, private readonly now = Date.now) {}

  dispose() { this.disposed = true; this.controller?.abort(); this.last = undefined; }
  private status(): Web3ReadResult {
    const result = this.last ?? { ...emptyResult(this.config), connection: 'unavailable' as const, diagnosticCode: 'NOT_READ' };
    if (!result.lastSuccessAt || !result.data) return structuredClone(result);
    const age = this.now() - Date.parse(result.lastSuccessAt);
    if (age > this.config.maxStaleMs) return { ...result, data: null, block: null, observedAt: null, snapshot: 'absent', connection: 'unavailable', diagnosticCode: result.diagnosticCode ?? 'SNAPSHOT_EXPIRED' };
    if (age >= this.config.ttlMs || result.snapshot === 'stale') return { ...structuredClone(result), snapshot: 'stale', connection: 'degraded', diagnosticCode: result.diagnosticCode ?? 'REFRESH_REQUIRED' };
    return structuredClone(result);
  }
  async getReadStatus() { return this.status(); }
  async getTokenSnapshot(): Promise<Web3ReadResult> {
    if (this.disposed) return { ...emptyResult(this.config), connection: 'unavailable', diagnosticCode: 'CONFIG_CHANGED' };
    if (this.inflight) return structuredClone(await this.inflight);
    if (this.now() < this.nextAttemptAt) return this.status();
    const current = this.status();
    if (current.data && (current.snapshot === 'fresh' || current.snapshot === 'partial')) return current;
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    this.inflight = (async () => {
      const attemptedAt = new Date(this.now()).toISOString();
      try {
        let result: Web3ReadResult;
        try { result = await this.read(this.config, controller.signal); }
        catch (error) {
          // Exactly one immediate retry only for transport/5xx transient errors, in the SAME deadline.
          if (safeError(error).code !== 'TRANSIENT' || controller.signal.aborted) throw error;
          result = await this.read(this.config, controller.signal);
        }
        if (controller.signal.aborted) throw new ReadError('TIMEOUT');
        const success = new Date(this.now()).toISOString();
        this.last = { ...result, observedAt: success, lastSuccessAt: success, lastAttemptAt: attemptedAt };
        this.nextAttemptAt = this.now() + this.config.ttlMs;
      } catch (error) {
        const failure = controller.signal.aborted ? new ReadError('TIMEOUT') : safeError(error);
        this.nextAttemptAt = this.now() + Math.max(this.config.ttlMs, failure.retryAfterMs);
        const prior = this.status();
        // Network identity/contract failures invalidate previous data rather than suggesting continuity.
        const retain = prior.data && !['WRONG_CHAIN', 'NO_CONTRACT', 'REORG', 'PROVIDER_AUTH'].includes(failure.code);
        this.last = { ...(retain ? prior : emptyResult(this.config)),
          connection: retain ? 'degraded' : 'unavailable', snapshot: retain ? 'stale' : 'absent',
          lastSuccessAt: prior.lastSuccessAt, lastAttemptAt: attemptedAt, diagnosticCode: failure.code };
      } finally { clearTimeout(timer); this.controller = undefined; }
      return this.status();
    })();
    try { return structuredClone(await this.inflight); } finally { this.inflight = undefined; }
  }
}
