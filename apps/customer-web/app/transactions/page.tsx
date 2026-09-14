import { AppShell, Card, TransactionTable } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Transactions" navItems={navFor('Transactions')}>
      <TransactionTable />
      <section className="mt-5 grid gap-5 md:grid-cols-3">{[['Confirmed','Coming soon — no ledger connected'],['Pending','Coming soon — no ledger connected'],['Failed','Coming soon — no ledger connected']].map(([title, detail]) => <Card key={title}><h3 className="text-xl font-bold text-[var(--rhc-heading)]">{title}</h3><p className="mt-2 text-sm text-[var(--rhc-muted)]">{detail}</p></Card>)}</section>
    </AppShell>
  );
}
