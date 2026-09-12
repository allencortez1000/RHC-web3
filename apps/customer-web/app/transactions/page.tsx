import { AppShell, Card, TransactionTable } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Transactions" navItems={navFor('Transactions')}>
      <TransactionTable />
      <section className="mt-5 grid gap-5 md:grid-cols-3">{[['Confirmed','Demo confirmations only'],['Pending','Waiting for internal review'],['Failed','No failed demo records']].map(([title, detail]) => <Card key={title}><h3 className="text-xl font-bold text-[var(--rhc-heading)]">{title}</h3><p className="mt-2 text-sm text-[var(--rhc-muted)]">{detail}</p></Card>)}</section>
    </AppShell>
  );
}
