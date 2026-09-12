import { AppShell, Badge, Card, DigitalIDCard, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="RHC Digital ID" navItems={navFor('RHC Digital ID')}>
      <section className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
        <DigitalIDCard />
        <Card title="Identity Verification">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">Your RHC Digital ID is an RHC-issued digital identity reference. It is not a government ID, wallet private key, legal title document, or production blockchain credential in this local preview.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ['Full Name', 'Juan Dela Cruz'], ['RHC ID', 'RHC-2026-00000001'], ['Membership Type', 'Customer / Buyer'], ['Account Status', 'Prepared'], ['Verification', 'Demo verification'], ['Issued', 'Sep 2026']
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-sm text-[var(--rhc-muted)]">{label}</p><p className="mt-1 font-bold text-[var(--rhc-heading)]">{value}</p></div>)}
          </div>
          <div className="mt-6 flex flex-wrap gap-3"><Web3Button>View Digital ID</Web3Button><Web3Button variant="secondary">Download QR</Web3Button><Web3Button variant="secondary">Verify Identity</Web3Button></div>
        </Card>
      </section>
      <section className="mt-5 grid gap-5 md:grid-cols-3">
        {['No private keys exposed', 'Company-scoped data sharing', 'Off-chain personal records'].map((item) => <Card key={item}><Badge tone="gold">Security Principle</Badge><h3 className="mt-4 font-bold text-[var(--rhc-heading)]">{item}</h3><p className="mt-2 text-sm text-[var(--rhc-muted)]">Designed for future blockchain verification without placing sensitive personal data on-chain.</p></Card>)}
      </section>
    </AppShell>
  );
}
