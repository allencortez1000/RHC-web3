import { AppShell, Badge, Card, WalletAddress } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="User Profile" navItems={navFor('Users')}>
      <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Card className="rhc-card-token"><div className="rhc-token-mini grid h-24 w-24 place-items-center rounded-full text-3xl font-extrabold">J</div><h2 className="mt-5 text-2xl font-bold text-[var(--rhc-heading)]">Juan Dela Cruz</h2><p className="mt-2 text-[var(--rhc-muted)]">RHC-2026-00000001</p><div className="mt-4"><WalletAddress address="Not connected" /></div></Card><Card title="Profile Information"><div className="grid gap-3 sm:grid-cols-2">{[['Email','customer@rhc.local'],['Mobile','+63 900 000 0000'],['Verification','Demo prepared'],['Account','Prepared'],['Privacy','Accepted'],['Marketing','Opted out']].map(([l,v]) => <div key={l} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-sm text-[var(--rhc-muted)]">{l}</p><p className="mt-1 font-bold text-[var(--rhc-heading)]">{v}</p></div>)}</div></Card></section>
      <section className="mt-5 grid gap-4 md:grid-cols-3">{['Digital Identity','Wallet','Security'].map((item) => <Card key={item}><Badge tone="gold">Profile</Badge><h3 className="mt-4 font-bold text-[var(--rhc-heading)]">{item}</h3><p className="mt-2 text-sm text-[var(--rhc-muted)]">Customer-managed account section prepared for secure backend integration.</p></Card>)}</section>
    </AppShell>
  );
}
