import { AppShell, Badge, Card, SecurityStatus, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Settings" navItems={navFor('Settings')}>
      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><SecurityStatus /><Card title="Appearance"><p className="text-sm text-[var(--rhc-muted)]">The platform uses the fixed RHC Token-inspired navy and gold design system. Light and dark mode share the same layout and component hierarchy.</p><div className="mt-5 flex gap-2"><Badge tone="gold">Gold Accent</Badge><Badge tone="neutral">Dark / Light</Badge></div></Card></section>
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[['Personal Information','/profile'],['Digital Identity','/digital-id'],['Wallet','/wallet'],['Security','/security'],['Notifications','/notifications'],['Privacy','/profile']].map(([item, href]) => <Card key={item}><h3 className="mb-4 text-xl font-bold text-[var(--rhc-heading)]">{item}</h3><Web3Button href={href} variant="secondary">Open {item}</Web3Button></Card>)}</section>
    </AppShell>
  );
}
