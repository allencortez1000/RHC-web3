import { Badge, Card, MetricCard, Web3Shell } from '@rhc/ui';

const modules = [
  ['RHC ID', 'Verified identity foundation', 'Active'],
  ['My Properties', 'Authorized Amica relationships', 'Ready'],
  ['RHC Points', 'Feature-flagged for Month 2', 'Coming Soon'],
  ['Wallet', 'Disabled until approved Web3 phase', 'Coming Soon'],
];

export default function Page() {
  return (
    <Web3Shell>
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Badge tone="info">Customer Dashboard</Badge>
        <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Your RHC digital command deck.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Dashboard is connected to the Month 1 API contract and designed for validation, error, loading, and empty states.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <MetricCard label="RHC Digital ID" value="RHC-2026-00000001" detail="Server-issued identity reference" />
          <MetricCard label="Account" value="Verified" detail="Mock verification state" />
          <MetricCard label="Project" value="AMICA-T1" detail="Amica Residences Tower 1" />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {modules.map(([title, detail, status]) => (
            <Card key={title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
                </div>
                <Badge tone={status === 'Active' || status === 'Ready' ? 'success' : 'neutral'}>{status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </Web3Shell>
  );
}
