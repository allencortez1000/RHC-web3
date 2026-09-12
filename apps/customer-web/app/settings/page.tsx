import { AppShell, Badge, Card, SecurityStatus } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Settings" navItems={navFor('Settings')}>
      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><SecurityStatus /><Card title="Appearance"><p className="text-sm text-slate-400">Use the theme switch in the top navigation to toggle premium dark and light modes. Your preference is stored locally.</p><div className="mt-5 flex gap-2"><Badge tone="info">Dark</Badge><Badge tone="neutral">Light</Badge></div></Card></section>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{['Personal Information','Digital Identity','Wallet','Security','Notifications','Privacy'].map((item) => <Card key={item}><h3 className="text-xl font-black text-white">{item}</h3><p className="mt-2 text-sm text-slate-400">Configured for Month 1 mock data and future secure backend integration.</p></Card>)}</section>
    </AppShell>
  );
}
