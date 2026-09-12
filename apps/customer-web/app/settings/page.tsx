import { AppShell, Badge, Card, SecurityStatus } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Settings" navItems={navFor('Settings')}>
      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><SecurityStatus /><Card title="Appearance"><p className="text-sm text-[var(--rhc-muted)]">The platform uses the fixed RHC Token-inspired navy and gold design system. Light and dark mode share the same layout and component hierarchy.</p><div className="mt-5 flex gap-2"><Badge tone="gold">Gold Accent</Badge><Badge tone="neutral">Dark / Light</Badge></div></Card></section>
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{['Personal Information','Digital Identity','Wallet','Security','Notifications','Privacy'].map((item) => <Card key={item}><h3 className="text-xl font-bold text-[var(--rhc-heading)]">{item}</h3><p className="mt-2 text-sm text-[var(--rhc-muted)]">Configured for Month 1 mock data and future secure backend integration.</p></Card>)}</section>
    </AppShell>
  );
}
