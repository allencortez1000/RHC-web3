'use client';

import { useRuntime, isAdminAccount } from '@rhc/ui';
import { evaluateW2AReadiness, W2A_BLOCK_LABELS } from './policy';

/**
 * W2A integration surface on the customer Account page. It never loads the
 * Thirdweb SDK and never offers an enabled wallet-connect action in W2A.
 */
export function ThirdwebWalletReadiness() {
  const { hasSession, user } = useRuntime();
  const verifiedCustomerSession = Boolean(
    hasSession && user?.id && user.account_status === 'ACTIVE'
    && !isAdminAccount(user),
  );
  // No public flags can lift these governance gates in the W2A checkpoint.
  const status = evaluateW2AReadiness({
    session: verifiedCustomerSession ? 'current' : 'absent',
    selectedChainId: null,
    approvedChainIds: [],
    billingVerified: false,
    authBridgeApproved: false,
    walletLinkContractApproved: false,
  });

  return (
    <section
      aria-label="Thirdweb wallet integration readiness"
      data-w2a-state="disabled"
      data-provider-loaded="false"
      className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 sm:p-6"
    >
      <p className="text-xs font-black uppercase tracking-widest text-[var(--rhc-primary)]">
        W2A — Offline integration preparation
      </p>
      <h2 className="mt-2 text-xl font-bold text-[var(--rhc-heading)]">Thirdweb wallet</h2>
      <p role="status" aria-live="polite" className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">
        Wallet onboarding is disabled pending authorization and connected testing.
        No embedded wallet is created, connected, recovered, or linked to your RHC account.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled
          className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-4 py-2 text-sm font-semibold text-[var(--rhc-muted)] disabled:cursor-not-allowed disabled:opacity-60">
          Connect embedded wallet (unavailable)
        </button>
        <button type="button" disabled
          className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-4 py-2 text-sm font-semibold text-[var(--rhc-muted)] disabled:cursor-not-allowed disabled:opacity-60">
          Connect external wallet (unavailable)
        </button>
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--rhc-heading)]">Activation requirements</p>
      <ul className="mt-2 space-y-1.5 pl-5 text-sm leading-6 text-[var(--rhc-muted)] list-disc">
        {status.reasons.map((reason) => (
          <li key={reason}>{W2A_BLOCK_LABELS[reason]}</li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-5 text-[var(--rhc-muted)]">
        This panel does not verify identity, wallet ownership, property rights,
        RHC Points balances or token holdings. Live Thirdweb is not enabled.
      </p>
    </section>
  );
}
