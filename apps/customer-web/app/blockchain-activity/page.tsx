import { AppShell, BlockchainStatus, Card } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Digital Assets & Blockchain Activity" navItems={navFor('Digital Assets')}>
      <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><BlockchainStatus /><Card title="Internal Explorer"><div className="grid gap-3 sm:grid-cols-2">{['Latest Transactions','Latest Blocks','Smart Contract Activity','Token Transfers','Digital Property Records','Identity Verification Records'].map((item) => <div key={item} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="font-bold text-[var(--rhc-heading)]">{item}</p><p className="mt-2"><span className="text-sm text-[var(--rhc-muted)]">Coming soon — Month 2</span></p></div>)}</div></Card></section>
      <Card className="mt-5" title="Month 1 Boundary"><p className="text-sm leading-6 text-[var(--rhc-muted)]">This is an internal blockchain activity UI foundation. Public blockchain deployment, token contracts, and live smart-contract verification remain out of scope for Month 1.</p></Card>
    </AppShell>
  );
}
