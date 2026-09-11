import { Badge, Card, EmptyState, MetricCard, Web3Shell } from '@rhc/ui';

const metrics = [
  ['Users', 'Mock directory', 'Authentication and authorization foundation'],
  ['Companies', '8 seeded', 'RHC corporate ecosystem'],
  ['Project', 'AMICA-T1', 'Amica Residences Tower 1'],
  ['Audit', 'Enabled', 'Sensitive operations tracked'],
];

export default function Page() {
  return (
    <Web3Shell variant="admin">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Badge tone="warning">Admin Dashboard</Badge>
        <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Secure operations console.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Backed by /api/v1/admin endpoints with explicit server-side permissions and audit logging for sensitive changes.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, detail]) => <MetricCard key={label} label={label} value={value} detail={detail} />)}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <Card title="Permission Boundary">
            <EmptyState title="Dashboard" description="Backed by /api/v1/admin endpoints with explicit server-side permissions and audit logging for sensitive changes." />
          </Card>
          <Card title="Operational Modules">
            <div className="grid gap-3 sm:grid-cols-2">
              {['Customers', 'RHC Digital IDs', 'Companies', 'Projects', 'Properties', 'Feature Flags', 'Integrations', 'Audit Logs'].map((module) => (
                <a key={module} href={`/${module.toLowerCase().replaceAll(' ', '-')}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-semibold text-white hover:border-cyan-300/40 hover:bg-cyan-400/10">{module}</a>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </Web3Shell>
  );
}
