import { AppShell, Badge, Card, PropertyAssetCard, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

export default function Page() {
  return (
    <AppShell title="Digital Properties" navItems={navFor('Properties')}>
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]"><PropertyAssetCard /><Card title="Property Access Summary"><p className="text-sm leading-6 text-slate-400">Only authorized customer-property relationships appear here. Ownership and legal records remain in RHC business systems, not public blockchain.</p><div className="mt-6 space-y-3">{['Buyer relationship verified', 'Digital asset record prepared', 'Resident services eligible'].map((item) => <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"><b className="text-white">{item}</b><Badge tone="success">Active</Badge></div>)}</div></Card></section>
      <section className="mt-6 grid gap-4 md:grid-cols-3">{['AMICA TOWER Unit 1205','Parking Slot P2-081','Resident Access Record'].map((item) => <Card key={item}><Badge tone="success">Verified</Badge><h3 className="mt-4 text-xl font-black text-white">{item}</h3><p className="mt-2 text-sm text-slate-400">Digital Property ID: RHC-PROP-0001205</p><div className="mt-5 flex flex-wrap gap-2"><Web3Button variant="secondary">View Property</Web3Button><Web3Button variant="secondary">Ownership Record</Web3Button></div></Card>)}</section>
    </AppShell>
  );
}
