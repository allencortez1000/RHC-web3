import { AppShell, Badge, Card, Web3Button } from '@rhc/ui';
import { navFor } from '../web3-nav';

const items = [['Resident Services','AMICA','250 RHC','Available'],['Water Account Link','AMICA WATER','Coming Soon','Prepared'],['Retail Rewards','AMICA MART','Coming Soon','Prepared'],['Security Access','RSSC','Coming Soon','Prepared'],['Promotional Rewards','RBAC','Coming Soon','Prepared'],['Commerce Loyalty','COASTLINE','Coming Soon','Prepared']];

export default function Page() {
  return (
    <AppShell title="RHC Marketplace" navItems={navFor('Marketplace')}>
      <Card title="Marketplace Categories"><div className="flex flex-wrap gap-2">{['All','Properties','Amica','RHC Businesses','Partners','Services','Digital Assets'].map((cat) => <Badge key={cat}>{cat}</Badge>)}</div></Card>
      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map(([name,seller,price,status]) => <Card key={name} className="p-0"><div className="h-36 bg-gradient-to-br from-cyan-400/25 via-violet-500/20 to-slate-950" /><div className="p-6"><Badge tone={status === 'Available' ? 'success' : 'neutral'}>{status}</Badge><h3 className="mt-4 text-2xl font-black text-white">{name}</h3><p className="mt-2 text-sm text-slate-400">Seller: {seller}</p><p className="mt-4 text-xl font-black text-cyan-200">{price}</p><div className="mt-5 flex gap-2"><Web3Button variant="secondary">View</Web3Button><Web3Button variant="secondary">Favorite</Web3Button></div></div></Card>)}</section>
    </AppShell>
  );
}
