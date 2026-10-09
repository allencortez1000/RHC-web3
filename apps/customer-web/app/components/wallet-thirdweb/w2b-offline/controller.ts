import { copySyntheticContext, evaluateSyntheticReadiness, mockScope } from './mock-policy';
import type {
  MockHandle, MockOnlyWalletDriver, MockWalletFailure, OfflineWalletSnapshot,
  SimulatedMode, SyntheticLinkObservation, SyntheticWalletContext,
} from './types';

const addressIsFixture = (x: unknown): x is string =>
  typeof x === 'string' && /^0x[0-9a-fA-F]{40}$/.test(x);

function validHandle(x: unknown): x is MockHandle {
  if (!x || typeof x !== 'object') return false;
  const h = x as Partial<MockHandle>;
  return typeof h.handleId === 'string' &&
    /^fixture:[a-zA-Z0-9:_-]{1,96}$/.test(h.handleId) &&
    addressIsFixture(h.address) && Number.isSafeInteger(h.chainId) &&
    (h.mode === 'synthetic-embedded' || h.mode === 'synthetic-external');
}

/**
 * Safe mock-only lifecycle controller. No Thirdweb SDK, API or auth adapter
 * exists here, and this file is deliberately NOT imported by an app route.
 *
 * The injected driver MUST be a local fake. It uses per-handle fixture
 * cleanup; production global wallet.disconnect must never substitute here.
 */
export class W2BOfflineController {
  private readonly listeners = new Set<() => void>();
  private readonly usedHandles = new Set<string>();
  private readonly releaseStarted = new Set<string>();
  private context: SyntheticWalletContext;
  private fingerprint: string;
  private current: MockHandle | null = null;
  private abortConnect: AbortController | null = null;
  private generation = 0;
  private disposed = false;
  private snapshot: OfflineWalletSnapshot;
  private readonly timeoutMs: number;

  constructor(
    private readonly driver: MockOnlyWalletDriver,
    initial: SyntheticWalletContext,
    timeoutMs = 4500,
  ) {
    if (driver.kind !== 'rhc-w2b-p1-mock-driver')
      throw new Error('Only a synthetic fixture driver is allowed in W2B-P1');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 10000)
      throw new Error('Invalid synthetic fixture deadline');
    this.context = copySyntheticContext(initial);
    this.fingerprint = mockScope(this.context);
    this.timeoutMs = timeoutMs;
    this.snapshot = this.blank(0);
  }

  private blank(revision: number): OfflineWalletSnapshot {
    const g = evaluateSyntheticReadiness(this.context);
    const s = this.context.session;
    return Object.freeze({
      mode: 'w2b-p1-synthetic-only',
      scope: this.fingerprint,
      session: s.kind,
      rhcUserId: s.kind === 'active' ? s.rhcUserId : null,
      walletStatus: g.canRunSyntheticFixture ? 'disconnected' : 'unavailable',
      walletAddress: null,
      chain: this.context.policy.selectedChain,
      syntheticMode: null,
      mockLinkObservation: 'unknown',
      failure: null,
      reasons: g.reasons,
      revision,
      releaseLock: 'OFFLINE_REVIEW_ONLY',
      sdkLoaded: false,
      walletEnrollmentExecuted: false,
      rhcIdentityVerified: false,
      backendLinkVerified: false,
      pointsBalance: 'not_configured',
      blockchainToken: 'not_configured',
      signingEnabled: false,
      transactionsEnabled: false,
    } satisfies OfflineWalletSnapshot);
  }

  getSnapshot = (): OfflineWalletSnapshot => this.snapshot;

  subscribe = (cb: () => void): (() => void) => {
    if (this.disposed) return () => undefined;
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  };

  private emit(patch: Partial<OfflineWalletSnapshot>): void {
    if (this.disposed) return;
    this.snapshot = Object.freeze({
      ...this.snapshot, ...patch,
      mode: 'w2b-p1-synthetic-only', releaseLock: 'OFFLINE_REVIEW_ONLY',
      sdkLoaded: false, walletEnrollmentExecuted: false,
      rhcIdentityVerified: false, backendLinkVerified: false,
      pointsBalance: 'not_configured', blockchainToken: 'not_configured',
      signingEnabled: false, transactionsEnabled: false,
      revision: this.snapshot.revision + 1,
    });
    for (const cb of this.listeners) cb();
  }

  private async releaseOwned(id: string): Promise<'released' | 'rejected' | 'timed_out'> {
    if (this.current?.handleId === id || this.releaseStarted.has(id)) return 'rejected';
    this.releaseStarted.add(id);
    const cancel = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const settled = Promise.resolve().then(() =>
        this.driver.releaseFixture({ handleId: id, signal: cancel.signal }),
      ).then(() => 'released' as const, () => 'rejected' as const);
      const limit = new Promise<'timed_out'>(resolve => {
        timeout = setTimeout(() => { cancel.abort(); resolve('timed_out'); }, this.timeoutMs);
      });
      return await Promise.race([settled, limit]);
    } finally {
      if (timeout) clearTimeout(timeout);
      // Never retry an unresolved per-handle release. It may finish later.
    }
  }

  private discardLate(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    const id = (value as Partial<MockHandle>).handleId;
    if (typeof id !== 'string' || !/^fixture:[a-zA-Z0-9:_-]{1,96}$/.test(id))
      return;
    if (this.current?.handleId === id || this.usedHandles.has(id)) return;
    this.usedHandles.add(id);
    void this.releaseOwned(id);
  }

  private invalidate(): void {
    ++this.generation;
    this.abortConnect?.abort();
    this.abortConnect = null;
    const old = this.current;
    this.current = null;
    if (old) void this.releaseOwned(old.handleId);
  }

  /**
   * All session, consent, method, chain and project changes fence stale async
   * completions and synchronously hide the previous synthetic address.
   */
  setContext(raw: SyntheticWalletContext): void {
    if (this.disposed) return;
    const next = copySyntheticContext(raw);
    const fingerprint = mockScope(next);
    if (fingerprint === this.fingerprint) return;
    this.invalidate();
    this.context = next;
    this.fingerprint = fingerprint;
    this.snapshot = this.blank(this.snapshot.revision + 1);
    for (const cb of this.listeners) cb();
  }

  cancelMockConnect(): boolean {
    if (this.disposed || this.snapshot.walletStatus !== 'connecting') return false;
    ++this.generation;
    this.abortConnect?.abort();
    this.abortConnect = null;
    this.emit({ walletStatus: evaluateSyntheticReadiness(this.context).canRunSyntheticFixture
      ? 'disconnected' : 'unavailable', failure: null });
    return true;
  }

  /** Run only the injected local fake, never a real wallet provider. */
  async connectMock(): Promise<boolean> {
    const allowed = evaluateSyntheticReadiness(this.context).canRunSyntheticFixture;
    if (this.disposed || !allowed || this.current ||
      !['disconnected', 'failed'].includes(this.snapshot.walletStatus)) return false;

    const chainId = this.context.policy.selectedChain;
    const mode = this.context.policy.mode as SimulatedMode;
    if (chainId === null) return false;
    const operation = ++this.generation;
    const cancel = new AbortController();
    this.abortConnect = cancel;
    this.emit({
      walletStatus: 'connecting',
      walletAddress: null, syntheticMode: null,
      mockLinkObservation: 'unknown', failure: null,
    });

    let timedOut = false;
    const aborted = new Promise<{ kind: 'aborted' }>(resolve => {
      cancel.signal.addEventListener('abort', () => resolve({ kind: 'aborted' }), { once: true });
    });
    const work = Promise.resolve().then(async (): Promise<
      { kind: 'aborted' } | { kind: 'result'; handle: MockHandle }
    > => {
      if (cancel.signal.aborted) return { kind: 'aborted' };
      const handle = await this.driver.openFixture({ chainId, mode, signal: cancel.signal });
      return { kind: 'result', handle };
    }).then(outcome => {
      if (outcome.kind === 'result' &&
        (cancel.signal.aborted || this.disposed || operation !== this.generation)) {
        this.discardLate(outcome.handle);
        return { kind: 'orphan' as const };
      }
      return outcome;
    }, () => ({ kind: 'error' as const }));
    const timer = setTimeout(() => { timedOut = true; cancel.abort(); }, this.timeoutMs);
    try {
      const outcome = await Promise.race([work, aborted]);
      if (this.disposed || operation !== this.generation) return false;
      if (outcome.kind === 'result') {
        const handle = outcome.handle;
        if (!validHandle(handle) || handle.chainId !== chainId ||
          handle.mode !== mode || this.usedHandles.has(handle.handleId)) {
          this.discardLate(handle);
          this.emit({ walletStatus: 'failed', failure: 'MOCK_HANDLE_INVALID' });
          return false;
        }
        this.usedHandles.add(handle.handleId);
        this.current = Object.freeze({ ...handle });
        this.emit({
          walletStatus: 'connected', walletAddress: handle.address,
          syntheticMode: handle.mode, mockLinkObservation: 'unknown', failure: null,
        });
        return true;
      }
      if (outcome.kind === 'aborted' && !timedOut) return false;
      this.emit({
        walletStatus: 'failed',
        failure: timedOut ? 'MOCK_CONNECT_TIMEOUT' : 'MOCK_CONNECT_REJECTED',
      });
      return false;
    } finally {
      clearTimeout(timer);
      if (this.abortConnect === cancel) this.abortConnect = null;
    }
  }

  /** Clear the display first; release only the owned fixture handle. */
  async disconnectMock(): Promise<boolean> {
    if (this.disposed || !this.current || this.snapshot.walletStatus !== 'connected') return false;
    const owned = this.current;
    this.current = null;
    const operation = ++this.generation;
    this.emit({
      walletStatus: 'disconnecting', walletAddress: null,
      mockLinkObservation: 'unknown', syntheticMode: null, failure: null,
    });
    const released = await this.releaseOwned(owned.handleId);
    if (this.disposed || operation !== this.generation) return false;
    this.emit({
      walletStatus: released === 'released' ? 'disconnected' : 'failed',
      failure: (released === 'released' ? null : released === 'timed_out'
        ? 'MOCK_DISCONNECT_TIMEOUT' : 'MOCK_DISCONNECT_REJECTED') as MockWalletFailure,
    });
    return released === 'released';
  }

  /** This is test UI state only; never a server-verified wallet link. */
  observeMockLink(link: SyntheticLinkObservation, forFixtureHandle: string): boolean {
    if (this.disposed || !this.current || this.snapshot.walletStatus !== 'connected' ||
      forFixtureHandle !== this.current.handleId ||
      !['unknown', 'unlinked', 'pending', 'linked', 'revoked', 'conflict'].includes(link)) return false;
    this.emit({ mockLinkObservation: link, backendLinkVerified: false });
    return true;
  }

  fixtureHandleIdForTests(): string | null { return this.current?.handleId ?? null; }

  dispose(): void {
    if (this.disposed) return;
    this.invalidate();
    this.disposed = true;
    this.snapshot = Object.freeze({
      ...this.blank(this.snapshot.revision + 1),
      session: 'absent', rhcUserId: null, walletStatus: 'unavailable',
      walletAddress: null, mockLinkObservation: 'unknown',
    });
    this.listeners.clear();
  }
}
