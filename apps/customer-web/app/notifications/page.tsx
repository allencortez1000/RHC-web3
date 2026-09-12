import { AppShell, Badge, Card } from '@rhc/ui';
import { navFor } from '../web3-nav';

const notifications = [['RHC Points received','850 RHC Points reward entry added to demo ledger.','Rewards'],['Identity status updated','Digital ID verification state prepared for future backend verification.','Identity'],['Property record prepared','Amica Tower Unit 1205 linked in development data.','Property'],['Wallet page opened','Local preview session viewed wallet interface.','Security'],['Marketplace foundation','RHC Marketplace UI foundation is prepared.','Ecosystem']];

export default function Page() {
  return (
    <AppShell title="Notifications" navItems={navFor('Notifications')}>
      <section className="grid gap-4">{notifications.map(([title, detail, type]) => <Card key={title}><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-[var(--rhc-heading)]">{title}</h3><p className="mt-2 text-sm text-[var(--rhc-muted)]">{detail}</p></div><Badge tone="gold">{type}</Badge></div></Card>)}</section>
    </AppShell>
  );
}
