import { AppShell, Badge, Card, DigitalIDCard, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="RHC Digital ID" navItems={navFor('RHC Digital ID')}>
      <section className="grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
        <DigitalIDCard />
        <Card title="Identity Verification">
          <p className="text-sm leading-6 text-slate-400">Your RHC Digital ID is an RHC-issued digital identity reference. It is not a government ID, wallet private key, or legal title document.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ['Full Name', 'Juan Dela Cruz'], ['RHC ID', 'RHC-2026-00000001'], ['Membership Type', 'Customer / Buyer'], ['Account Status', 'Active'], ['Verification', 'Blockchain Verified'], ['Issued', 'Sep 2026']
            ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-1 font-bold text-white">{value}</p></div>)}
          </div>
          <div className="mt-6 flex flex-wrap gap-3"><Web3Button>View Digital ID</Web3Button><Web3Button variant="secondary">Download QR</Web3Button><Web3Button variant="secondary">Verify Identity</Web3Button></div>
        </Card>
      </section>
      <section className="mt-6 grid gap-6 md:grid-cols-3">
        {['No private keys exposed', 'Company-scoped data sharing', 'Off-chain personal records'].map((item) => <Card key={item}><Badge tone="success">Secure</Badge><h3 className="mt-4 font-black text-white">{item}</h3><p className="mt-2 text-sm text-slate-400">Designed for future blockchain verification without placing sensitive personal data on-chain.</p></Card>)}
      </section>
    </AppShell>
  );
}
