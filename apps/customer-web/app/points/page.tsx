import { AppShell, Card, MetricCard, TokenBalance, TokenCard, TransactionTable, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="RHC Points" navItems={navFor('RHC Points')}>
      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><TokenCard /><Card title="Points Balance"><TokenBalance /><p className="mt-4 text-sm leading-6 text-slate-400">The utility token powering the RHC digital ecosystem. Real transfer, sale, staking, or exchange features are disabled in Month 1.</p><div className="mt-6 flex flex-wrap gap-3"><Web3Button>Earn</Web3Button><Web3Button variant="secondary">Transfer</Web3Button><Web3Button variant="secondary">Redeem</Web3Button></div></Card></section>
      <section className="mt-6 grid gap-5 md:grid-cols-4"><MetricCard label="Current Value" value="Demo" detail="No market price active" /><MetricCard label="Total Earned" value="14,200" detail="Mock rewards ledger" /><MetricCard label="Total Spent" value="1,350" detail="Mock redemptions" /><MetricCard label="Pending Rewards" value="850" detail="Awaiting rules engine" /></section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><Card title="Token Information"><div className="grid gap-3 sm:grid-cols-2">{[['Token Name','RHC Points'],['Symbol','RHC'],['Network','Prepared RHC Network'],['Contract Address','Not deployed'],['Total Supply','Disabled'],['Token Status','Feature-flagged']].map(([l,v]) => <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm text-slate-400">{l}</p><p className="mt-1 font-bold text-white">{v}</p></div>)}</div></Card><TransactionTable /></section>
    </AppShell>
  );
}
