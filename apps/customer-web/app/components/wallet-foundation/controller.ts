import type {
  ChainEligibility, RHCSession, SyntheticBackendLink, SyntheticOfflineWalletAdapter,
  SyntheticWalletHandle, WalletChainPolicy, WalletContext,
  WalletFailure, WalletFoundationSnapshot,
} from './types';

/** No provider or runtime session is read here. The caller supplies synthetic input. */
function copyContext(input: WalletContext): WalletContext {
  const session: RHCSession = input.session.kind === 'current'
    ? { kind: 'current', rhcUserId: input.session.rhcUserId }
    : { kind: input.session.kind };
  const policy: WalletChainPolicy = {
    enabled: input.policy.enabled === true,
    policyRevision: String(input.policy.policyRevision ?? ''),
    selectedChainId: input.policy.selectedChainId,
    approvedChainIds: [...input.policy.approvedChainIds],
  };
  return { session, policy };
}

export function scopeFingerprint(input: WalletContext): string {
  const c = copyContext(input);
  return JSON.stringify([
    c.session.kind, c.session.kind === 'current' ? c.session.rhcUserId : null,
    c.policy.enabled, c.policy.policyRevision, c.policy.selectedChainId,
    [...new Set(c.policy.approvedChainIds)].sort((a, b) => a - b),
  ]);
}

function chainEligibility(p: WalletChainPolicy): ChainEligibility {
  if (p.selectedChainId === null) return 'not_selected';
  return Number.isSafeInteger(p.selectedChainId) && p.selectedChainId > 0
    && p.approvedChainIds.includes(p.selectedChainId) ? 'approved' : 'unsupported';
}

function permitted(c: WalletContext): boolean {
  return c.session.kind === 'current' && !!c.session.rhcUserId.trim()
    && c.policy.enabled === true && c.policy.policyRevision.length > 0
    && chainEligibility(c.policy) === 'approved';
}

const validAddress = (value: unknown): value is string =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
const validHandle = (value: unknown): value is SyntheticWalletHandle => {
  if (!value || typeof value !== 'object') return false;
  const handle = value as Partial<SyntheticWalletHandle>;
  return typeof handle.handleId === 'string' && /^synthetic:[a-zA-Z0-9:_-]{1,90}$/.test(handle.handleId)
    && validAddress(handle.address) && Number.isSafeInteger(handle.chainId);
};
const cleanError = (code: Exclude<WalletFailure, null>): WalletFailure => code;

/**
 * Isolated W1 controller. A real Thirdweb adapter cannot be passed accidentally:
 * kind must be synthetic-offline. No wallet proof or server-side link is created.
 *
 * releaseOwned(handleId) is a per-handle test-double contract, NOT global disconnect.
 */
export class WalletFoundationController {
  private readonly listeners = new Set<() => void>();
  private readonly seenHandles = new Set<string>();
  private readonly releasing = new Set<string>();
  private context: WalletContext;
  private fingerprint: string;
  private active: SyntheticWalletHandle | null = null;
  private connectAbort: AbortController | null = null;
  private generation = 0;
  private disposed = false;
  private snapshot: WalletFoundationSnapshot;
  private readonly timeoutMs: number;

  constructor(
    private readonly adapter: SyntheticOfflineWalletAdapter,
    context: WalletContext,
    timeoutMs = 5000,
  ) {
    if (adapter.kind !== 'synthetic-offline') throw new Error('W1 only permits synthetic offline adapters');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 10000)
      throw new Error('Invalid synthetic operation deadline');
    this.timeoutMs = timeoutMs;
    this.context = copyContext(context);
    this.fingerprint = scopeFingerprint(this.context);
    this.snapshot = this.blank(this.context, this.fingerprint, 0);
  }

  private blank(c: WalletContext, fingerprint: string, revision: number): WalletFoundationSnapshot {
    return {
      mode: 'synthetic-offline',
      scopeFingerprint: fingerprint,
      sessionStatus: c.session.kind,
      rhcUserId: c.session.kind === 'current' ? c.session.rhcUserId : null,
      chainEligibility: chainEligibility(c.policy),
      selectedChainId: c.policy.selectedChainId,
      connectionStatus: permitted(c) ? 'disconnected' : 'unavailable',
      walletAddress: null,
      syntheticLinkObservation: 'unknown',
      backendLinkVerified: false,
      tokenObservation: 'not_configured',
      failure: null,
      revision,
    };
  }

  getSnapshot = (): WalletFoundationSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) return () => undefined;
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(patch: Partial<WalletFoundationSnapshot>): void {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...patch, backendLinkVerified: false, tokenObservation: 'not_configured', revision: this.snapshot.revision + 1 };
    for (const listener of this.listeners) listener();
  }

  /** Release only a known synthetic handle; never mutate the next session. */
  private async releaseHandle(id: string): Promise<'released' | 'failed' | 'timed_out'> {
    if (this.active?.handleId === id || this.releasing.has(id)) return 'failed';
    this.releasing.add(id);
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = Promise.resolve().then(() => this.adapter.releaseOwned({ handleId: id, signal: ctl.signal }));
      const settled = work.then(() => 'released' as const, () => 'failed' as const);
      const timedOut = new Promise<'timed_out'>((resolve) => {
        timer = setTimeout(() => { ctl.abort(); resolve('timed_out'); }, this.timeoutMs);
      });
      return await Promise.race([settled, timedOut]);
    } finally {
      if (timer) clearTimeout(timer);
      // Do not retry automatically: an unresolved earlier release could still complete.
    }
  }

  private releaseOrphan(candidate: unknown): void {
    if (!candidate || typeof candidate !== 'object') return;
    const id = (candidate as Partial<SyntheticWalletHandle>).handleId;
    if (typeof id !== 'string' || !/^synthetic:[a-zA-Z0-9:_-]{1,90}$/.test(id)) return;
    if (this.active?.handleId === id || this.seenHandles.has(id)) return;
    this.seenHandles.add(id);
    void this.releaseHandle(id);
  }

  private invalidate(): void {
    this.generation += 1;
    this.connectAbort?.abort();
    this.connectAbort = null;
    const previous = this.active;
    this.active = null;
    if (previous) void this.releaseHandle(previous.handleId);
  }

  setContext(input: WalletContext): void {
    if (this.disposed) return;
    const next = copyContext(input);
    const key = scopeFingerprint(next);
    if (key === this.fingerprint) return;
    this.invalidate();
    this.context = next;
    this.fingerprint = key;
    this.snapshot = this.blank(next, key, this.snapshot.revision + 1);
    for (const listener of this.listeners) listener();
  }

  cancelConnect(): boolean {
    if (this.disposed || this.snapshot.connectionStatus !== 'connecting') return false;
    this.generation++;
    this.connectAbort?.abort();
    this.connectAbort = null;
    this.publish({ connectionStatus: permitted(this.context) ? 'disconnected' : 'unavailable', failure: null });
    return true;
  }

  async connect(): Promise<boolean> {
    if (this.disposed || !permitted(this.context) || this.active || !['disconnected', 'failed'].includes(this.snapshot.connectionStatus))
      return false;
    const expectedChain = this.context.policy.selectedChainId;
    if (expectedChain === null) return false;
    const op = ++this.generation;
    const abort = new AbortController();
    this.connectAbort = abort;
    this.publish({ connectionStatus: 'connecting', walletAddress: null, syntheticLinkObservation: 'unknown', failure: null });

    let timeoutFired = false;
    const canceled = new Promise<{ kind: 'aborted' }>((resolve) => {
      abort.signal.addEventListener('abort', () => resolve({ kind: 'aborted' }), { once: true });
    });
    const work = Promise.resolve()
      .then(() => this.adapter.connect({ chainId: expectedChain, signal: abort.signal }))
      .then((handle) => {
        if (abort.signal.aborted || this.disposed || op !== this.generation) {
          this.releaseOrphan(handle);
          return { kind: 'orphan' as const };
        }
        return { kind: 'result' as const, handle };
      }, () => ({ kind: 'error' as const }));

    const timer = setTimeout(() => { timeoutFired = true; abort.abort(); }, this.timeoutMs);
    try {
      const outcome = await Promise.race([work, canceled]);
      if (this.disposed || op !== this.generation) return false;
      if (outcome.kind === 'result') {
        const handle = outcome.handle;
        if (!validHandle(handle) || handle.chainId !== expectedChain || this.seenHandles.has(handle.handleId)) {
          this.releaseOrphan(handle);
          this.publish({ connectionStatus: 'failed', failure: cleanError('INVALID_HANDLE') });
          return false;
        }
        this.seenHandles.add(handle.handleId);
        this.active = handle;
        this.publish({ connectionStatus: 'connected', walletAddress: handle.address, failure: null });
        return true;
      }
      if (outcome.kind === 'aborted' && !timeoutFired) return false;
      this.publish({ connectionStatus: 'failed', failure: timeoutFired ? 'CONNECT_TIMEOUT' : 'CONNECT_FAILED' });
      return false;
    } finally {
      clearTimeout(timer);
      if (this.connectAbort === abort) this.connectAbort = null;
    }
  }

  async disconnect(): Promise<boolean> {
    if (this.disposed || !this.active || this.snapshot.connectionStatus !== 'connected') return false;
    const handle = this.active;
    this.active = null;
    const op = ++this.generation;
    this.publish({ connectionStatus: 'disconnecting', walletAddress: null, syntheticLinkObservation: 'unknown', failure: null });
    const release = await this.releaseHandle(handle.handleId);
    if (this.disposed || this.generation !== op) return false;
    this.publish({
      connectionStatus: release === 'released' ? 'disconnected' : 'failed',
      failure: release === 'released' ? null : release === 'timed_out' ? 'DISCONNECT_TIMEOUT' : 'DISCONNECT_FAILED',
    });
    return release === 'released';
  }

  /** An explicit synthetic test observation only; never authorizes or persists a link. */
  observeSyntheticLink(link: SyntheticBackendLink, forHandleId: string): boolean {
    if (this.disposed || !this.active || this.active.handleId !== forHandleId || this.snapshot.connectionStatus !== 'connected')
      return false;
    if (!['unknown', 'unlinked', 'pending', 'linked', 'revoked', 'conflict'].includes(link)) return false;
    this.publish({ syntheticLinkObservation: link, backendLinkVerified: false });
    return true;
  }

  /** Only exposed in offline tests. No raw wallet/address survives disposal. */
  activeSyntheticHandleId(): string | null {
    return this.active?.handleId ?? null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.invalidate();
    this.disposed = true;
    this.listeners.clear();
    this.snapshot = { ...this.blank({ session: { kind: 'absent' }, policy: { enabled: false, policyRevision: 'disposed', selectedChainId: null, approvedChainIds: [] } }, 'disposed', this.snapshot.revision + 1) };
  }
}
