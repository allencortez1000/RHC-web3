import * as React from 'react';

/**
 * Passive frontend boundary while the account-scoped Points API is unapproved.
 * Deliberately accepts no data/flags and performs no requests or mutations.
 * Disabled controls are presentation, not a substitute for server authorization.
 */
export function PointsReadOnlyPanel() {
  return (
    <div data-rhc-points-policy="read-only-unavailable" className="space-y-5">
      <section className="rhc-card-token rounded-3xl border border-[rgba(212,175,55,.24)] p-6 md:p-8" aria-labelledby="points-heading">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--rhc-primary)]">Read-only internal pilot</p>
        <h2 id="points-heading" className="rhc-page-title mt-5 max-w-4xl">Your RHC Points</h2>
        <p className="rhc-body-copy mt-4 max-w-3xl">RHC Points are centrally managed rewards. They are not cryptocurrency, a cash balance, or an automatic conversion into tokens.</p>
        <p role="status" id="points-availability" className="mt-5 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 text-sm leading-6">
          Points data is unavailable. The approved account-scoped Points service is not connected to this page yet.
        </p>
      </section>

      <section aria-label="Points summary" className="grid gap-5 md:grid-cols-2">
        <div className="rhc-card-token rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5">
          <h3 className="text-sm font-bold text-[var(--rhc-muted)]">Available Points</h3>
          <p data-points-balance className="mt-3 text-2xl font-black text-[var(--rhc-heading)]">Unavailable</p>
          <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">No approved balance has been loaded. Unavailable does not mean zero.</p>
        </div>
        <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5">
          <h3 className="text-sm font-bold text-[var(--rhc-muted)]">Data source</h3>
          <p className="mt-3 text-xl font-black text-[var(--rhc-heading)]">Integration pending</p>
          <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">No demo balance, ledger entry, or wallet balance is substituted for an approved response.</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5" aria-labelledby="points-history-heading">
          <h3 id="points-history-heading" className="text-lg font-bold text-[var(--rhc-heading)]">Points history</h3>
          <div className="mt-4 rounded-xl border border-dashed border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-5">
            <p data-points-history className="font-bold text-[var(--rhc-heading)]">History unavailable</p>
            <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">No approved history has been loaded. This is not a confirmed empty history.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5" aria-labelledby="points-wallet-heading">
          <h3 id="points-wallet-heading" className="text-lg font-bold text-[var(--rhc-heading)]">Points and wallet connection</h3>
          <p className="mt-4 text-sm leading-6 text-[var(--rhc-muted)]">Wallet connection is not required for the proposed Points view. A connected Thirdweb wallet does not authenticate an RHC account or establish an approved Points balance.</p>
          <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">The existing account sign-in boundary remains in place. Wallet linking and token functions are separate work.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5" aria-labelledby="points-restrictions-heading">
        <h3 id="points-restrictions-heading" className="text-lg font-bold text-[var(--rhc-heading)]">Pilot restrictions</h3>
        <p id="points-action-restriction" className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">Earning, adjustments and redemption are unavailable in the read-only pilot. This page submits no Points action.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled aria-describedby="points-action-restriction" className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">Earn Points unavailable</button>
          <button type="button" disabled aria-describedby="points-action-restriction" className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">Adjust Points unavailable</button>
          <button type="button" disabled aria-describedby="points-action-restriction" className="min-h-11 rounded-xl border border-[var(--rhc-border)] px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">Redeem Points unavailable</button>
        </div>
      </section>
    </div>
  );
}