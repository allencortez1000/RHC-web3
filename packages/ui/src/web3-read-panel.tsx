'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Web3Field, Web3ReadResult } from '@rhc/types';

const sourceLabels: Record<Web3ReadResult['source'], string> = {
  disabled: 'Blockchain preview is not enabled.',
  synthetic: 'SYNTHETIC DEMO — No live blockchain connection.',
  thirdweb_testnet: 'TESTNET PREVIEW — Development only; not the production RHC token.',
};

// The current server TTL can be configured as low as one second. Its exact
// deadline is not supplied to the browser. A longer locally claimed "fresh"
// period would be unsafe. This is display-only: never fetch or change the DTO.
const MIN_SUPPORTED_SERVER_TTL_MS = 1000;

function isRecentObservation(
  lastSuccessAt: string | null, hasData: boolean, nowMs: number,
): boolean {
  if (!hasData || !lastSuccessAt || !Number.isFinite(nowMs)) return false;
  const at = Date.parse(lastSuccessAt);
  return Number.isFinite(at) && nowMs >= at &&
    nowMs - at < MIN_SUPPORTED_SERVER_TTL_MS;
}

function useExpiredBrowserObservation(result: Web3ReadResult): boolean {
  const applicable = result.source === 'thirdweb_testnet' &&
    (result.snapshot === 'fresh' || result.snapshot === 'partial');
  const observationKey = JSON.stringify([
    result.source, result.snapshot, result.lastSuccessAt, result.observedAt,
    result.lastAttemptAt, result.chain?.id, result.contractAddress,
    result.block?.hash,
  ]);
  const hasData = result.data !== null;
  const lastSuccessAt = result.lastSuccessAt;
  // On SSR and first hydration, freshness is unverified until a client tick.
  const [checked, setChecked] = useState<{
    key: string; expired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!applicable) return;
    const recheck = () => {
      const now = Date.now();
      setChecked(previous => {
        // A system-clock rollback cannot turn the SAME expired observation
        // fresh again. Only a new response identity may reset the latch.
        const expired = (previous?.key === observationKey && previous.expired) ||
          !isRecentObservation(lastSuccessAt, hasData, now);
        if (previous?.key === observationKey && previous.expired === expired) {
          return previous;
        }
        return { key: observationKey, expired };
      });
    };
    recheck();
    // Background timers can be throttled; recheck immediately on return.
    const interval = window.setInterval(recheck, 250);
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [applicable, observationKey, lastSuccessAt, hasData]);

  return applicable && !(checked?.key === observationKey && !checked.expired);
}

function Metadata({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--rhc-border)] p-3">
      <dt className="text-xs font-bold text-[var(--rhc-muted)]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[var(--rhc-heading)] [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function TokenField<T>({ label, field, render }: {
  label: string;
  field: Web3Field<T>;
  render: (value: T) => ReactNode;
}) {
  return (
    <Metadata label={label}>
      <span className="block text-xs text-[var(--rhc-muted)]">{field.status}</span>
      {field.status === 'observed' ? render(field.value)
        : field.status === 'unsupported' ? 'Not supported by this read interface'
          : 'No observation available'}
    </Metadata>
  );
}

function SupplyValue({ raw, formatted }: { raw: string; formatted: string | null }) {
  return <><span className="block">Raw base units: {raw}</span><span className="block">Formatted: {formatted ?? 'Not available'}</span></>;
}

function testnetExplorerHref(result: Web3ReadResult): string | null {
  if (result.source !== 'thirdweb_testnet' || !result.explorerUrl) return null;
  try {
    // Origin approval belongs to the server; never construct a URL from chain metadata.
    const url = new URL(result.explorerUrl);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function Web3ReadPanel({ result }: { result: Web3ReadResult }) {
  const explorerHref = testnetExplorerHref(result);
  const browserExpired = useExpiredBrowserObservation(result);
  const displaySnapshot = browserExpired ? 'stale' : result.snapshot;
  const displayConnection = browserExpired && result.connection === 'ready'
    ? 'degraded' : result.connection;
  return (
    <section aria-label="Read-only Web3 result" className="space-y-4">
      <p className="font-bold text-[var(--rhc-heading)]">{sourceLabels[result.source]}</p>
      <p className="text-sm text-[var(--rhc-muted)]">
        This is not an official RHC token. No wallet connection, transaction, or activation action is provided.
      </p>
      <p className="text-sm text-[var(--rhc-muted)]">Contract-wide restrictions have not been verified.</p>
      <p className="text-sm text-[var(--rhc-muted)]">
        This preview does not offer token purchases, rewards, transfers or redemption. Market price is not established. RHC Points remain a separate demo ledger.
      </p>
      {result.source !== 'disabled' && result.configuration === 'disabled' && <p className="text-sm">Blockchain preview is not enabled.</p>}
      {(result.source === 'disabled' || result.configuration === 'disabled') && <p className="text-sm">No Web3 read is enabled. No token observation is available.</p>}
      {result.source === 'synthetic' && <p className="text-sm">All values and observation times below are fictional local fixtures, not blockchain evidence.</p>}
      {result.source === 'thirdweb_testnet' && <p className="text-sm">Testnet observations only; not production verification, legal approval, ownership evidence, or proof of transfer restrictions.</p>}
      {result.source === 'thirdweb_testnet' && (
        <p className="text-sm text-[var(--rhc-muted)]">
          Connection and snapshot describe the last server response, not current provider health.
          Browser freshness is downgraded conservatively as time elapses, including when returning to this tab.
          The UI never automatically contacts the provider. Reload the page to request updated status.
        </p>
      )}
      {result.snapshot === 'absent' && <p role="status">No snapshot is available. Missing observations are not zero balances or successful reads.</p>}
      {displaySnapshot === 'stale' && (
        <p role="status">
          Stale snapshot — retained observations are not a current successful read.{' '}
          {browserExpired
            ? 'Browser freshness expired or cannot be verified from the last response. '
            : ''}
          Refresh is required to obtain a current observation.
        </p>
      )}
      {result.snapshot === 'partial' && <p role="status">Partial snapshot — some token fields were not observed.</p>}
      <dl className="grid gap-3 sm:grid-cols-2">
        <Metadata label="Source">{result.source}</Metadata>
        <Metadata label="Capability">{result.capability}</Metadata>
        <Metadata label="Connection">{displayConnection}{result.source === 'thirdweb_testnet' && ' (last response; browser guard applied)'}</Metadata>
        <Metadata label="Configuration">{result.configuration}</Metadata>
        <Metadata label="Snapshot">{displaySnapshot}{result.source === 'thirdweb_testnet' && ' (browser view of last response)'}</Metadata>
        <Metadata label="Diagnostic code">{result.diagnosticCode ?? 'None reported'}</Metadata>
        {result.source === 'thirdweb_testnet' && (
          <Metadata label="Browser freshness">
            {browserExpired
              ? 'Expired or unverified locally — not a fresh blockchain read'
              : 'Within the conservative one-second freshness window of the last response'}
          </Metadata>
        )}
        <Metadata label="Restriction assessment">{result.restrictionAssessment}</Metadata>
        <Metadata label="Chain">{result.chain ? `${result.chain.name} (${result.chain.id})` : 'Not available'}</Metadata>
        <Metadata label="Contract address">{result.contractAddress ?? 'Not available'}</Metadata>
        <Metadata label="Explorer reference">
          {explorerHref ? (
            <a href={explorerHref} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="underline">
              Open testnet explorer (opens in a new tab)
            </a>
          ) : 'Not available'}
        </Metadata>
        <Metadata label="Observed at">{result.observedAt ?? 'Not observed'}</Metadata>
        <Metadata label="Last successful read">{result.lastSuccessAt ?? 'No successful read recorded'}</Metadata>
        <Metadata label="Last attempted read">{result.lastAttemptAt ?? 'No attempt recorded'}</Metadata>
      </dl>
      {result.data && displaySnapshot !== 'absent' && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-[var(--rhc-heading)]">Token field observations</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <TokenField label="Token name" field={result.data.name} render={(value) => value} />
            <TokenField label="Token symbol" field={result.data.symbol} render={(value) => value} />
            <TokenField label="Decimals" field={result.data.decimals} render={(value) => String(value)} />
            <TokenField label="Total supply" field={result.data.totalSupply} render={(value) => <SupplyValue {...value} />} />
            <TokenField label="Cap" field={result.data.cap} render={(value) => <SupplyValue {...value} />} />
            <TokenField label="Paused flag" field={result.data.paused} render={(value) => value ? 'true' : 'false'} />
          </dl>
          <p className="mt-3 text-sm text-[var(--rhc-muted)]">Total supply is a contract-wide observation, not circulating supply or a market valuation.</p>
          <p className="mt-3 text-sm text-[var(--rhc-muted)]">A paused flag or cap observation does not verify transfer restrictions or authorize any capability.</p>
        </div>
      )}
      {result.block ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Metadata label="Block number">{result.block.number}</Metadata>
          <Metadata label="Block hash">{result.block.hash ?? 'Not available'}</Metadata>
          <Metadata label="Block timestamp">{result.block.timestamp} (Unix seconds)</Metadata>
          <Metadata label="Block finality">{result.block.finality} — no finality guarantee</Metadata>
        </dl>
      ) : <p className="text-sm text-[var(--rhc-muted)]">No block observation is available.</p>}
      <div>
        <h3 className="text-sm font-bold text-[var(--rhc-heading)]">Inactive capabilities</h3>
        <ul className="mt-2 list-inside list-disc text-sm text-[var(--rhc-muted)]">
          {result.inactiveCapabilities.map((capability) => <li key={capability}>{capability.replaceAll('_', ' ')}</li>)}
        </ul>
      </div>
    </section>
  );
}
