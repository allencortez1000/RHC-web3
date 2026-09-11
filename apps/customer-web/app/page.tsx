import { Badge, Card, EmptyState, MetricCard, ThemeToggle, Web3Shell } from '@rhc/ui';

const companies = [
  ['AMICA', 'Property & Resident Services', 'ACTIVE'],
  ['RHBC', 'Construction / Project Information', 'PREPARED / COMING SOON'],
  ['AMICA WATER', 'Utility Services', 'PREPARED / COMING SOON'],
  ['AMICA MART', 'Retail & Rewards', 'PREPARED / COMING SOON'],
  ['RBAC', 'Communications / Promotions', 'PREPARED / COMING SOON'],
  ['RSSC', 'Resident / Security Services', 'PREPARED / COMING SOON'],
  ['COASTLINE', 'Commerce / Loyalty', 'PREPARED / COMING SOON'],
];

const future = ['RHC Wallet', 'RHC Points', 'Marketplace', 'Documents', 'Certificates', 'Blockchain Verification'];

const journey = ['Create account', 'Verify profile', 'Receive RHC Digital ID', 'Link Amica property'];

export default function CustomerPortal() {
  return (
    <Web3Shell>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 font-black text-cyan-100 shadow-lg shadow-cyan-950/40">R</div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">RHC Digital</p>
            <p className="text-xs text-slate-400">Identity · Property · Ecosystem</p>
          </div>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a href="#ecosystem" className="hover:text-cyan-200">Ecosystem</a>
          <a href="#future" className="hover:text-cyan-200">Month 2 Ready</a>
          <a href="/login" className="rounded-full border border-white/10 px-4 py-2 hover:border-cyan-300/50 hover:text-cyan-100">Login</a>
          <ThemeToggle />
        </nav>
        <div className="md:hidden"><ThemeToggle /></div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-10 pt-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-16">
        <div>
          <Badge tone="info">Month 1 Foundation · Mock Data Ready</Badge>
          <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl">
            RHC Digital Customer Portal
          </h1>
          <p className="mt-4 max-w-3xl text-2xl font-semibold text-cyan-100 md:text-3xl">A premium Web3-ready identity layer for the RHC ecosystem.</p>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Create an account, verify your profile, receive your RHC Digital ID, view authorized Amica Tower properties, and manage privacy preferences.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="rounded-2xl bg-cyan-300 px-6 py-3 font-bold text-slate-950 shadow-xl shadow-cyan-950/40 hover:bg-cyan-200" href="/register">Create Account</a>
            <a className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-white backdrop-blur hover:border-cyan-300/50" href="/login">Login</a>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-4">
            {journey.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                <p className="text-xs font-bold text-cyan-200">0{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-white">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="relative min-h-[520px] border-cyan-300/20 bg-slate-950/80 p-0">
          <div className="border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Digital Identity</p>
                <h2 className="mt-2 text-2xl font-bold text-white">RHC Passport</h2>
              </div>
              <Badge tone="success">Verified</Badge>
            </div>
          </div>
          <div className="p-6">
            <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/20 via-fuchsia-400/10 to-slate-950 p-6 shadow-2xl shadow-cyan-950/30">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/80">RHC Digital ID</p>
              <p className="mt-8 break-all font-mono text-3xl font-black text-white">RHC-2026-00000001</p>
              <p className="mt-8 text-sm leading-6 text-slate-300">RHC-issued customer identifier. Not a government ID, wallet address, or blockchain account.</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Project" value="AMICA-T1" detail="Amica Residences Tower 1 foundation" />
              <MetricCard label="Data Mode" value="Mock" detail="No Supabase credentials required locally" />
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-3">
        <Card title="RHC Digital ID"><p className="text-sm leading-6 text-slate-400">Server-generated customer identifier designed for future wallet and verification workflows without storing sensitive records on-chain.</p></Card>
        <Card title="My Properties"><EmptyState title="No linked properties yet" description="Authorized Amica property relationships appear here after admin verification." /></Card>
        <Card title="Security & Privacy"><p className="text-sm leading-6 text-slate-400">Manage profile, sessions, consent records, terms, marketing preferences, and future MFA readiness.</p></Card>
      </section>

      <section id="ecosystem" className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Badge tone="neutral">Governed ecosystem access</Badge>
            <h2 className="mt-3 text-3xl font-black text-white">RHC Ecosystem</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">Participating companies are presented as service boundaries. Prepared integrations are not shown as live.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map(([name, service, status]) => (
            <Card key={name}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{service}</p>
                </div>
                <Badge tone={status === 'ACTIVE' ? 'success' : 'neutral'}>{status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="future" className="mx-auto max-w-7xl px-6 pb-20 pt-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Badge tone="warning">Disabled by feature flags</Badge>
            <h2 className="mt-3 text-3xl font-black text-white">Future Web3 modules</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {future.map((item) => <Card key={item}><div className="flex items-center justify-between gap-4"><span className="font-semibold text-white">{item}</span><Badge>Coming Soon</Badge></div></Card>)}
        </div>
      </section>
    </Web3Shell>
  );
}
