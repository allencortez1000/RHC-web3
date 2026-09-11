import { Badge, Card, MetricCard, ThemeToggle, Web3Shell } from '@rhc/ui';

const modules = ['Dashboard','Customers','RHC Digital IDs','Companies','Projects','Properties','Amica Tower Inventory','Business Services','Users','Roles','Permissions','Integrations','Feature Flags','Audit Logs','System Settings'];
const cards = [
  ['Total users', 'Seeded/demo data only', 'Mock identity directory'],
  ['Verified customers', 'Live API metric', 'Verification-ready architecture'],
  ['Companies', '8 seeded companies', 'No ninth company invented'],
  ['Active projects', 'AMICA-T1 seeded', 'Unlimited future projects'],
  ['Amica properties', 'Inventory foundation', 'Residential, commercial, parking'],
  ['Available properties', 'Filtered by status', 'Permission-guarded changes'],
  ['Reserved properties', '0 unless seeded/created', 'Audit-ready flow'],
  ['Security/audit', 'Immutable audit view', 'Sensitive changes tracked'],
];

export default function AdminHome() {
  return (
    <Web3Shell variant="admin">
      <aside className="fixed hidden h-full w-80 border-r border-white/10 bg-slate-950/75 p-6 backdrop-blur-xl lg:block">
        <a href="/" className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-fuchsia-300/30 bg-fuchsia-400/10 font-black text-fuchsia-100 shadow-lg shadow-fuchsia-950/40">R</div>
          <div>
            <h1 className="text-lg font-black text-white">RHC Command Center</h1>
            <p className="text-xs text-slate-400">RBAC · Audit · Operations</p>
          </div>
        </a>
        <div className="mt-6 flex justify-start">
          <ThemeToggle />
        </div>
        <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
          <Badge tone="info">Mock Mode</Badge>
          <p className="mt-3 text-sm leading-6 text-slate-300">Local system runs with governed mock data and no external credentials.</p>
        </div>
        <nav className="mt-6 space-y-1">
          {modules.map((m) => (
            <a className="group flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-cyan-100" href={`/${m.toLowerCase().replaceAll(' ', '-')}`} key={m}>
              <span>{m}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/0 group-hover:bg-cyan-300" />
            </a>
          ))}
        </nav>
      </aside>

      <section className="lg:pl-80">
        <div className="border-b border-white/10 bg-slate-950/50 px-6 py-8 backdrop-blur-xl md:px-10">
          <div className="mb-6 flex justify-end lg:hidden"><ThemeToggle /></div>
          <div className="mx-auto max-w-7xl">
            <Badge tone="warning">Server-enforced RBAC required</Badge>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">Admin Command Center</h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Operational foundation for identity, companies, Amica Tower inventory, integrations, feature flags, and audit.</p>
              </div>
              <Card className="border-fuchsia-300/20 bg-fuchsia-400/10">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100">Security posture</p>
                <p className="mt-3 text-2xl font-black text-white">Least Privilege</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Company-scoped permissions with audit visibility for sensitive actions.</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl p-6 md:p-10">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {cards.map(([title, value, detail]) => <MetricCard key={title} label={title} value={value} detail={detail} />)}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card title="Month 1 Control Plane">
              <div className="grid gap-3 sm:grid-cols-2">
                {['Identity', 'Companies', 'Projects', 'Properties', 'Services', 'Feature Flags', 'Integrations', 'Audit Archive'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="font-semibold text-white">{item}</p>
                    <p className="mt-1 text-sm text-slate-400">Permission guarded</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Future Web3 Boundary">
              <p className="text-sm leading-6 text-slate-400">Wallet, token, marketplace, and blockchain modules remain disabled in Month 1. This control plane keeps RHC business records authoritative and prepares governed extension points for Month 2.</p>
              <div className="mt-5 space-y-3">
                {['ENABLE_WALLET=false', 'ENABLE_TOKEN=false', 'ENABLE_BLOCKCHAIN=false'].map((flag) => <div key={flag} className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 font-mono text-sm text-amber-100">{flag}</div>)}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </Web3Shell>
  );
}
