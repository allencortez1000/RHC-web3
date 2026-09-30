'use client';

import type { ReactNode } from 'react';
import type { Web3Field, Web3ReadResult } from '@rhc/types';

const sourceLabels: Record<Web3ReadResult['source'], string> = {
  disabled: 'Blockchain preview is not enabled.',
  synthetic: 'SYNTHETIC DEMO — No live blockchain connection.',
  thirdweb_testnet: 'TESTNET PREVIEW — Development only; not the production RHC token.',
};

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
      {result.snapshot === 'absent' && <p role="status">No snapshot is available. Missing observations are not zero balances or successful reads.</p>}
      {result.snapshot === 'stale' && (
        <p role="status">
          Stale snapshot — retained observations are not a current successful read.{' '}
          {result.diagnosticCode === 'REFRESH_REQUIRED'
            ? 'Refresh is required to obtain a current observation.'
            : 'The provider cannot currently refresh this snapshot.'}
        </p>
      )}
      {result.snapshot === 'partial' && <p role="status">Partial snapshot — some token fields were not observed.</p>}
      <dl className="grid gap-3 sm:grid-cols-2">
        <Metadata label="Source">{result.source}</Metadata>
        <Metadata label="Capability">{result.capability}</Metadata>
        <Metadata label="Connection">{result.connection}</Metadata>
        <Metadata label="Configuration">{result.configuration}</Metadata>
        <Metadata label="Snapshot">{result.snapshot}</Metadata>
        <Metadata label="Diagnostic code">{result.diagnosticCode ?? 'None reported'}</Metadata>
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
      {result.data && result.snapshot !== 'absent' && (
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
          <Metadata label="Block timestamp">{result.block.timestamp ?? 'Not available'}</Metadata>
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
