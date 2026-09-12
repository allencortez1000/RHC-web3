import { AppShell, Badge, Card, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Administration" navItems={navFor('Administration')}>
      <Card title="Administrative Access Boundary"><Badge tone="warning">Restricted</Badge><p className="mt-4 text-sm leading-6 text-slate-400">Customer accounts do not receive administrative permissions. The full Admin Command Center remains a separate protected interface and requires server-enforced RBAC.</p><div className="mt-6"><Web3Button href="/dashboard" variant="secondary">Return to Dashboard</Web3Button></div></Card>
      <section className="mt-6 grid gap-4 md:grid-cols-3">{['No customer admin access','RBAC required','Audit protected'].map((item) => <Card key={item}><h3 className="font-black text-white">{item}</h3><p className="mt-2 text-sm text-slate-400">Least-privilege rules prevent cross-role access.</p></Card>)}</section>
    </AppShell>
  );
}
