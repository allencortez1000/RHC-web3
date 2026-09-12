import { AppShell, Badge, Card, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

const items = [
  ['Resident Services','AMICA','RHC Points / supported payment methods','Available'],
  ['Water Account Link','AMICA WATER','Coming Soon','Prepared'],
  ['Retail Rewards','AMICA MART','Coming Soon','Prepared'],
  ['Security Access','RSSC','Coming Soon','Prepared'],
  ['Promotional Rewards','RHC Businesses','Coming Soon','Prepared'],
  ['Commerce Loyalty','Partners','Coming Soon','Prepared'],
];

export default function Page() {
  return (
    <AppShell title="RHC Marketplace" navItems={navFor('RHC Marketplace')}>
      <Card title="Marketplace Categories" className="rhc-card-token"><div className="flex flex-wrap gap-2">{['Properties','Amica','RHC Businesses','Partners','Digital Assets','Services'].map((cat) => <Badge key={cat} tone="gold">{cat}</Badge>)}</div><p className="rhc-body-copy mt-4">A premium RHC ecosystem marketplace prepared for properties, resident services, business utilities, partner services, RHC Points, and future RHC Token utility.</p></Card>
      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map(([name,seller,price,status]) => <Card key={name} className="p-0"><div className="rhc-market-strip h-28" /><div className="p-6"><Badge tone={status === 'Available' ? 'success' : 'neutral'}>{status}</Badge><h3 className="mt-4 text-xl font-bold text-[var(--rhc-heading)]">{name}</h3><p className="mt-2 text-sm text-[var(--rhc-muted)]">Provider: {seller}</p><p className="mt-4 font-bold text-[var(--rhc-primary)]">{price}</p><div className="mt-5 flex gap-2"><Web3Button variant="secondary">View</Web3Button><Web3Button variant="tertiary">Favorite</Web3Button></div></div></Card>)}</section>
    </AppShell>
  );
}
