import { AppShell, BlockchainStatus, Card, HashDisplay } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Blockchain Activity" navItems={navFor('Blockchain Activity')}>
      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><BlockchainStatus /><Card title="Internal Explorer"><div className="grid gap-3 sm:grid-cols-2">{['Latest Transactions','Latest Blocks','Smart Contract Activity','Token Transfers','Digital Property Records','Identity Verification Records'].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="font-bold text-white">{item}</p><p className="mt-2"><HashDisplay hash="0x84B2...93F1" /></p></div>)}</div></Card></section>
      <Card className="mt-6" title="Month 1 Boundary"><p className="text-sm leading-6 text-slate-400">This is an internal blockchain activity UI foundation. Public blockchain deployment, token contracts, and live smart-contract verification remain out of scope for Month 1.</p></Card>
    </AppShell>
  );
}
