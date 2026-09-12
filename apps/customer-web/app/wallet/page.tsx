import { AppShell, Badge, Card, MetricCard, TransactionTable, WalletAddress, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="RHC Wallet" navItems={navFor('RHC Wallet')}>
      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card title="Institutional Wallet Overview" className="rhc-card-token">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <Badge tone="warning">Demo Wallet</Badge>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">Total Portfolio Value</p>
              <p className="rhc-value mt-2 text-3xl">Demo Mode</p>
              <p className="mt-2 text-sm text-[var(--rhc-muted)]">No crypto custody, real token balance, private keys, or live transfers are active in this local preview.</p>
            </div>
            <WalletAddress address="Not connected" />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-5">{['SEND','RECEIVE','SWAP','BUY','HISTORY'].map((action) => <Web3Button key={action} variant={action === 'HISTORY' ? 'primary' : 'secondary'}>{action}</Web3Button>)}</div>
        </Card>
        <Card title="Network & Custody Status">
          <Badge tone="warning">Awaiting Blockchain Integration</Badge>
          <div className="mt-5 space-y-3">{[['Wallet Status','Not connected'], ['Network','Development mode'], ['Private Keys','Never stored in UI'], ['Transfer Status','Disabled']].map(([l,v]) => <div key={l} className="flex justify-between rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><span className="text-[var(--rhc-muted)]">{l}</span><b className="text-[var(--rhc-heading)]">{v}</b></div>)}</div>
        </Card>
      </section>
      <section className="mt-5 grid gap-5 md:grid-cols-3"><MetricCard label="RHC Token" value="Not live" icon="◎" detail="No production token balance" /><MetricCard label="RHC Points" value="12,850" icon="PT" detail="Demo rewards ledger" /><MetricCard label="Supported Assets" value="Prepared" icon="◇" detail="Future Web3 assets" /></section>
      <section className="mt-5"><TransactionTable /></section>
    </AppShell>
  );
}
