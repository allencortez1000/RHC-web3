import { AppShell, Badge, Card, MetricCard, TransactionTable, WalletAddress, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="RHC Wallet" navItems={navFor('RHC Wallet')}>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card title="Wallet Balance">
          <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm uppercase tracking-[0.2em] text-slate-400">Total Wallet Value</p><p className="mt-3 text-5xl font-black text-white">₱125,430.00</p><p className="mt-2 text-sm text-slate-400">Demo wallet UI only. No crypto custody or real transfer is active.</p></div><WalletAddress /></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-4">{['SEND','RECEIVE','TRANSFER','QR'].map((action) => <Web3Button key={action} variant={action === 'SEND' ? 'primary' : 'secondary'}>{action}</Web3Button>)}</div>
        </Card>
        <Card title="Connected Network"><Badge tone="success">RHC Network Connected</Badge><div className="mt-5 space-y-3">{[['Block Height','2,584,302'], ['Network Fee','Normal'], ['Latest Block','4 sec ago'], ['Wallet Status','Prepared / Demo']].map(([l,v]) => <div key={l} className="flex justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"><span className="text-slate-400">{l}</span><b className="text-white">{v}</b></div>)}</div></Card>
      </section>
      <section className="mt-6 grid gap-5 md:grid-cols-3"><MetricCard label="RHC Points" value="12,850 RHC" icon="◎" detail="Utility rewards balance" /><MetricCard label="Digital Assets" value="8 Assets" icon="◈" detail="Credentials and prepared records" /><MetricCard label="Pending" value="850 RHC" icon="⇄" detail="Awaiting confirmation" /></section>
      <section className="mt-6"><TransactionTable /></section>
    </AppShell>
  );
}
