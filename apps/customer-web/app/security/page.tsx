import { AppShell, Card, SecurityStatus, SignOutButton, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';
import { ConsentPreferences } from '../components/consent-preferences';

export default function Page() {
  return (
    <AppShell title="Security Center" navItems={navFor('Security')}>
      <SecurityStatus />
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Card title="Password"><Web3Button href="/reset-password" variant="secondary">Change password</Web3Button></Card><Card title="Login Sessions"><SignOutButton /></Card><Card title="Recovery Options"><Web3Button href="/forgot-password" variant="secondary">Recover by email</Web3Button></Card>{['Two-Factor Authentication','Connected Devices','Wallet Security'].map((item) => <Card key={item}><h3 className="text-xl font-bold text-[var(--rhc-heading)]">{item}</h3><p className="mt-2 text-sm text-[var(--rhc-muted)]">Coming soon — Month 2.</p><div className="mt-4"><Web3Button variant="secondary">Coming soon</Web3Button></div></Card>)}</section>
      <ConsentPreferences />
    </AppShell>
  );
}
