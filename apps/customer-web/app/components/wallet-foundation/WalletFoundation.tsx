'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { scopeFingerprint, type WalletFoundationController } from './controller';
import type { WalletContext, WalletFoundationSnapshot } from './types';

export interface WalletFoundationProps {
  /** Caller owns the controller instance and passes only synthetic test doubles. */
  readonly controller: WalletFoundationController;
  readonly context: WalletContext;
}

const labels: Record<WalletFoundationSnapshot['connectionStatus'], string> = {
  unavailable: 'Wallet preview unavailable',
  disconnected: 'Wallet disconnected',
  connecting: 'Connecting a synthetic test wallet…',
  connected: 'Synthetic wallet connected (not linked to RHC)',
  disconnecting: 'Disconnecting synthetic wallet…',
  failed: 'Synthetic wallet operation failed',
};
const failures: Record<Exclude<WalletFoundationSnapshot['failure'], null>, string> = {
  CONNECT_FAILED: 'The synthetic connection failed. You may retry.',
  CONNECT_TIMEOUT: 'The synthetic connection timed out. You may retry.',
  INVALID_HANDLE: 'The synthetic adapter returned an invalid or reused handle.',
  DISCONNECT_FAILED: 'Synthetic cleanup was not confirmed. Address access remains cleared.',
  DISCONNECT_TIMEOUT: 'Synthetic cleanup timed out. Address access remains cleared.',
};

/**
 * Not mounted on any existing route. This is intentionally NOT a Thirdweb
 * ConnectButton, auth provider, live wallet or transaction interface.
 */
export function WalletFoundation({ controller, context }: WalletFoundationProps) {
  const expectedScope = scopeFingerprint(context);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const epoch = useRef({ generation: 0 });
  const connectButton = useRef<HTMLButtonElement>(null);
  const disconnectButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    controller.setContext(context);
  }, [controller, context, expectedScope]); // The controller ignores equivalent fingerprints.

  useEffect(() => {
    // Capture the same holder before cleanup, avoiding stale-ref access while
    // protecting against React StrictMode's development effect replay.
    const holder = epoch.current;
    ++holder.generation;
    return () => {
      const marker = ++holder.generation;
      queueMicrotask(() => {
        if (holder.generation === marker) controller.dispose();
      });
    };
  }, [controller]);

  // Prevent even a single render of a previous customer's address on a scope
  // transition, before React runs the setContext effect.
  const current = snapshot.scopeFingerprint === expectedScope ? snapshot : null;
  const status = current?.connectionStatus ?? 'unavailable';
  const canConnect = status === 'disconnected' || status === 'failed';
  const canCancel = status === 'connecting';
  const canDisconnect = status === 'connected';
  const restoreFocus = (destination: 'connect' | 'disconnect') => {
    if (controller.getSnapshot().scopeFingerprint !== expectedScope) return;
    (destination === 'connect' ? connectButton : disconnectButton).current?.focus();
  };

  return (
    <section
      aria-label="Synthetic offline wallet foundation"
      className="w-full min-w-0 max-w-3xl rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 text-[var(--rhc-heading)] sm:p-6"
      data-wallet-mode="synthetic-offline"
      data-wallet-status={status}
    >
      <p className="text-xs font-black uppercase tracking-widest text-[var(--rhc-primary)]">
        SYNTHETIC OFFLINE TEST — NOT A LIVE WALLET
      </p>
      <h2 className="mt-3 text-xl font-bold">RHC Wallet — offline lifecycle foundation</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">
        This isolated component exercises a test-only wallet lifecycle. No real blockchain, embedded
        wallet enrollment, token balance, transaction, signature, or RHC account linking occurs.
      </p>

      <p role="status" aria-live="polite" className="mt-5 rounded-xl border p-3 text-sm font-semibold">
        {current ? labels[status] : 'Account scope changed. Clearing the earlier synthetic wallet view…'}
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border p-3">
          <dt className="font-semibold">RHC session</dt>
          <dd className="mt-1" data-testid="wallet-session">{current?.sessionStatus ?? 'unavailable'}</dd>
        </div>
        <div className="min-w-0 rounded-xl border p-3">
          <dt className="font-semibold">Chain policy</dt>
          <dd className="mt-1" data-testid="wallet-chain">{current?.chainEligibility ?? 'not_selected'}</dd>
        </div>
        <div className="min-w-0 rounded-xl border p-3">
          <dt className="font-semibold">Synthetic wallet address</dt>
          <dd className="mt-1 break-all font-mono" data-testid="wallet-address">{current?.walletAddress ?? 'Not connected'}</dd>
        </div>
        <div className="min-w-0 rounded-xl border p-3">
          <dt className="font-semibold">RHC backend wallet link</dt>
          <dd className="mt-1" data-testid="wallet-link">
            {current?.syntheticLinkObservation ?? 'unknown'} — synthetic observation only; never verified
          </dd>
        </div>
      </dl>

      {current?.failure && (
        <p role="alert" className="mt-4 rounded-xl border p-3 text-sm">
          {failures[current.failure]}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          ref={connectButton}
          type="button"
          disabled={!canConnect}
          onClick={() => {
            void controller.connect().then((connected) => {
              queueMicrotask(() => restoreFocus(connected ? 'disconnect' : 'connect'));
            });
          }}
          className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'failed' ? 'Retry synthetic connection' : 'Connect synthetic wallet'}
        </button>
        <button
          type="button"
          disabled={!canCancel}
          onClick={() => {
            if (controller.cancelConnect()) queueMicrotask(() => restoreFocus('connect'));
          }}
          className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel connection
        </button>
        <button
          ref={disconnectButton}
          type="button"
          disabled={!canDisconnect}
          onClick={() => {
            void controller.disconnect().then(() => queueMicrotask(() => restoreFocus('connect')));
          }}
          className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Disconnect synthetic wallet
        </button>
      </div>

      <p className="mt-5 text-xs leading-5 text-[var(--rhc-muted)]">
        Wallet connection never confers RHC login, permissions, verification, property ownership,
        backend wallet linking, or financial rights. RHC Points are a separate business ledger.
        No browser-storage persistence, animations, or background polling is used.
      </p>
    </section>
  );
}
