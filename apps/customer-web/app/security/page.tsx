import { AppShell, Card, SecurityStatus } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Security Center" navItems={navFor('Settings')}>
      <SecurityStatus />
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{['Password','Two-Factor Authentication','Login Sessions','Connected Devices','Wallet Security','Recovery Options'].map((item) => <Card key={item}><h3 className="text-xl font-black text-white">{item}</h3><p className="mt-2 text-sm text-slate-400">Prepared for secure backend enforcement and future step-up authentication.</p></Card>)}</section>
    </AppShell>
  );
}
