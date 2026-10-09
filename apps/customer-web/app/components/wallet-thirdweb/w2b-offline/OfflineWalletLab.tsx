'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { W2BOfflineController } from './controller';
import { mockScope, MOCK_BLOCK_LABELS } from './mock-policy';
import type { OfflineWalletSnapshot, SyntheticWalletContext } from './types';

export interface OfflineWalletLabProps {
  /** The caller injects a local, synthetic-only controller. No real SDK here. */
  readonly controller: W2BOfflineController;
  readonly context: SyntheticWalletContext;
}

const statuses: Record<OfflineWalletSnapshot['walletStatus'], string> = {
  unavailable: 'Mock wallet unavailable',
  disconnected: 'Mock wallet disconnected',
  connecting: 'Connecting synthetic fixture…',
  connected: 'Synthetic fixture connected — not a real or RHC-linked wallet',
  disconnecting: 'Releasing synthetic fixture…',
  failed: 'Synthetic fixture operation failed',
};
const failures: Record<Exclude<OfflineWalletSnapshot['failure'], null>, string> = {
  MOCK_CONNECT_REJECTED: 'The synthetic adapter refused the connection.',
  MOCK_CONNECT_TIMEOUT: 'The synthetic adapter timed out; try the fixture again.',
  MOCK_HANDLE_INVALID: 'The synthetic adapter returned an invalid handle.',
  MOCK_DISCONNECT_REJECTED: 'Synthetic cleanup was not confirmed. Address hidden.',
  MOCK_DISCONNECT_TIMEOUT: 'Synthetic cleanup timed out. Address hidden.',
};

/**
 * Offline-only test fixture UI, intentionally NOT mounted by any production
 * route. Buttons never reach Thirdweb, Supabase, RPC or a backend API.
 */
export function OfflineWalletLab({ controller, context }: OfflineWalletLabProps) {
  const scope = mockScope(context);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const mountEpoch = useRef({ generation: 0 });
  const connectRef = useRef<HTMLButtonElement>(null);
  const disconnectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { controller.setContext(context); }, [controller, context, scope]);

  useEffect(() => {
    // React StrictMode may replay effects; never dispose the reattached owner.
    const epoch = mountEpoch.current;
    ++epoch.generation;
    return () => {
      const marker = ++epoch.generation;
      queueMicrotask(() => {
        if (epoch.generation === marker) controller.dispose();
      });
    };
  }, [controller]);

  const view = snapshot.scope === scope ? snapshot : null;
  const status = view?.walletStatus ?? 'unavailable';
  const canConnect = status === 'disconnected' || status === 'failed';
  const canCancel = status === 'connecting';
  const canDisconnect = status === 'connected';
  const focus = (which: 'connect' | 'disconnect') => {
    if (controller.getSnapshot().scope !== scope) return;
    (which === 'connect' ? connectRef : disconnectRef).current?.focus();
  };

  return (
    <section aria-label="RHC W2B-P1 synthetic wallet laboratory"
      data-w2b-mode="synthetic-only" data-w2b-status={status}
      className="w-full min-w-0 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 text-[var(--rhc-heading)] sm:p-6">
      <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--rhc-primary)]">
        OFFLINE W2B-P1 FIXTURE — NO THIRDWEB WALLET
      </p>
      <h2 className="mt-3 text-lg font-bold">Synthetic wallet lifecycle lab</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">
        Unmounted test-only UI. No embedded wallet signup, login, recovery, RPC,
        blockchain signature, transaction, customer account link or token transfer.
      </p>
      <p role="status" aria-live="polite" data-testid="w2b-status"
        className="mt-4 rounded-xl border p-3 text-sm font-semibold">
        {view ? statuses[status] : 'Account scope changed. Previous synthetic wallet hidden.'}
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border p-3">
          <dt className="font-semibold">Synthetic RHC session</dt>
          <dd data-testid="w2b-session" className="mt-1">
            {view?.session ?? 'unavailable'}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border p-3">
          <dt className="font-semibold">Synthetic chain</dt>
          <dd data-testid="w2b-chain" className="mt-1">
            {view?.chain ?? 'not selected'}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border p-3">
          <dt className="font-semibold">Fixture address</dt>
          <dd data-testid="w2b-address" className="mt-1 break-all font-mono">
            {view?.walletAddress ?? 'Not connected'}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border p-3">
          <dt className="font-semibold">RHC backend wallet link</dt>
          <dd data-testid="w2b-link" className="mt-1">
            {view?.mockLinkObservation ?? 'unknown'} — synthetic observation only; never verified
          </dd>
        </div>
      </dl>
      {view?.failure && (
        <p role="alert" data-testid="w2b-error" className="mt-4 rounded-xl border p-3 text-sm">
          {failures[view.failure]}
        </p>
      )}
      {Boolean(view?.reasons.length) && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Mock fixture prerequisites</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6">
            {view?.reasons.map(reason => (
              <li key={reason}>{MOCK_BLOCK_LABELS[reason]}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button ref={connectRef} type="button" disabled={!canConnect}
          onClick={() => {
            void controller.connectMock().then(success => {
              queueMicrotask(() => focus(success ? 'disconnect' : 'connect'));
            });
          }}
          className="min-h-11 rounded-xl border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50">
          {status === 'failed' ? 'Retry mock connection' : 'Connect mock fixture'}
        </button>
        <button type="button" disabled={!canCancel}
          onClick={() => {
            if (controller.cancelMockConnect()) queueMicrotask(() => focus('connect'));
          }}
          className="min-h-11 rounded-xl border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50">
          Cancel mock connection
        </button>
        <button ref={disconnectRef} type="button" disabled={!canDisconnect}
          onClick={() => {
            void controller.disconnectMock().then(() => {
              queueMicrotask(() => focus('connect'));
            });
          }}
          className="min-h-11 rounded-xl border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50">
          Disconnect mock fixture
        </button>
      </div>
      <p className="mt-5 text-xs leading-5 text-[var(--rhc-muted)]">
        W2A release lock: OFFLINE_REVIEW_ONLY. Provider SDK loaded: never.
        This laboratory grants no RHC permissions, Digital ID, property, RHC Points,
        crypto balance or legal rights. Do not use it with real accounts.
      </p>
    </section>
  );
}
