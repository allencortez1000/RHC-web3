import { AppShell, Card, TransactionTable } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Transactions" navItems={navFor('Transactions')}>
      <TransactionTable />
      <section className="mt-6 grid gap-6 md:grid-cols-3">{[['Confirmed','24 blockchain confirmations'],['Pending','Waiting for internal approval'],['Failed','No failed records in demo']].map(([title, detail]) => <Card key={title}><h3 className="text-2xl font-black text-white">{title}</h3><p className="mt-2 text-sm text-slate-400">{detail}</p></Card>)}</section>
    </AppShell>
  );
}
