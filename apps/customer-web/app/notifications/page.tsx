import { AppShell, Badge, Card } from '@rhc/ui';
import { navFor } from '../web3-nav';

const notifications = [['RHC Points received','850 RHC reward entry added to mock ledger.','Confirmed'],['Transaction confirmed','Digital ID verification transaction completed.','Transaction'],['Property ownership verified','Amica Tower Unit 1205 linked to your RHC ID.','Property'],['Wallet login detected','New local mock session opened.','Security'],['New ecosystem announcement','RHC Marketplace UI foundation is prepared.','Ecosystem']];

export default function Page() {
  return (
    <AppShell title="Notifications" navItems={navFor('Notifications')}>
      <section className="grid gap-4">{notifications.map(([title, detail, type]) => <Card key={title}><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-black text-white">{title}</h3><p className="mt-2 text-sm text-slate-400">{detail}</p></div><Badge tone="info">{type}</Badge></div></Card>)}</section>
    </AppShell>
  );
}
