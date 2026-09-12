import { AppShell, Badge, Card, WalletAddress } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="User Profile" navItems={navFor('Settings')}>
      <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><Card><div className="grid h-28 w-28 place-items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-4xl font-black text-cyan-100">J</div><h2 className="mt-5 text-3xl font-black text-white">Juan Dela Cruz</h2><p className="mt-2 text-slate-400">RHC-2026-00000001</p><div className="mt-4"><WalletAddress /></div></Card><Card title="Profile Information"><div className="grid gap-3 sm:grid-cols-2">{[['Email','customer@rhc.local'],['Mobile','+63 900 000 0000'],['Verification','Verified'],['Account','Active'],['Privacy','Accepted'],['Marketing','Opted out']].map(([l,v]) => <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm text-slate-400">{l}</p><p className="mt-1 font-bold text-white">{v}</p></div>)}</div></Card></section>
      <section className="mt-6 grid gap-4 md:grid-cols-3">{['Digital Identity','Wallet','Security'].map((item) => <Card key={item}><Badge tone="info">Profile</Badge><h3 className="mt-4 font-black text-white">{item}</h3><p className="mt-2 text-sm text-slate-400">Customer-managed account section.</p></Card>)}</section>
    </AppShell>
  );
}
