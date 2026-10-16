import * as React from "react";
import { deriveOfflineNetworkPartition } from "./partition";

/**
 * UNMOUNTED visual test component. It intentionally has no events, wallet SDK,
 * identity API, token contract or chain transport. This is NOT customer UI.
 */
export function OfflineNetworkPartitionPreview({
  scope, records,
}: Readonly<{ scope: unknown; records: unknown }>) {
  const view = deriveOfflineNetworkPartition(scope, records);
  return (
    <section
      data-w03-network-partition="synthetic-unmounted"
      data-source-trusted="false"
      data-rhc-asset-approved="false"
      aria-labelledby="offline-network-heading"
      className="w-full space-y-4 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4 sm:p-6"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--rhc-primary)]">
        Offline simulation only
      </p>
      <h2 id="offline-network-heading" className="text-xl font-bold">
        Network-scoped wallet display rehearsal
      </h2>
      <p role="status" className="text-sm leading-6" data-w03-network-notice>
        {view.notice}
      </p>
      <p className="text-sm leading-6">
        RHC Points are centrally managed and are not a chain balance. No official
        token identity, canonical supply model, L2 gas asset or bridge has been accepted.
      </p>
      {view.kind === "synthetic-review" ? (
        <div className="grid gap-3 md:grid-cols-2" data-w03-network-rows>
          {view.rows.map(row => (
            <article key={row.key}
              data-network-layer={row.layer}
              data-balance-state={row.status}
              className="rounded-xl border border-[var(--rhc-border)] p-4">
              <h3 className="font-bold">{row.layerLabel}</h3>
              <p className="mt-2 text-sm font-semibold">{row.amountLabel}</p>
              <p className="mt-2 text-sm">{row.movementLabel}</p>
              <p className="mt-2 text-xs">Only an invented offline asset is represented.</p>
            </article>
          ))}
        </div>
      ) : (
        <p data-w03-network-unavailable className="rounded-xl border p-4 text-sm">
          No trusted data available; this does not establish a zero balance.
        </p>
      )}
      <p data-w03-no-aggregate="true" className="text-sm font-semibold">
        No cross-network balance total or bridge-backed supply is claimed.
      </p>
      <p className="text-xs leading-5">
        Actions disabled: connect, link, mint, approve, transfer, bridge, redeem.
        This review does not request an account, wallet, signature, RPC, or provider data.
      </p>
    </section>
  );
}
