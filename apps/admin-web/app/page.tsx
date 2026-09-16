'use client';

import Link from 'next/link';
import { Badge, Card, EmptyState, ResourceStatus, SignOutButton, ThemeToggle, Web3Shell, useResource } from '@rhc/ui';
import { AdminMetrics, modules } from './admin-data';
type AuditRow = { id: string; action: string; entity_type: string; entity_id?: string | null; created_at: string };

function RecentActivity() {
  const audit = useResource<AuditRow[]>('/admin/audit-logs?take=8');
  return (
    <Card title="Recent Activity">
      <ResourceStatus {...audit} />
      {audit.data && (audit.data.length ? (
        <div className="space-y-3">
          {audit.data.map((row) => (
            <div key={row.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-semibold text-white">{row.action}</p>
              <p className="mt-1 text-sm text-slate-400">{row.entity_type} · {new Date(row.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : <EmptyState title="No audit activity" description="Audited actions will appear here after records are changed." />)}
    </Card>
  );
}

export default function AdminHome() {
  return (
    <Web3Shell variant="admin">
      <aside className="fixed hidden h-full w-80 border-r border-white/10 bg-slate-950/75 p-6 backdrop-blur-xl lg:block">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-fuchsia-300/30 bg-fuchsia-400/10 font-black text-fuchsia-100 shadow-lg shadow-fuchsia-950/40">R</div>
          <div>
            <h1 className="text-lg font-black text-white">RHC Command Center</h1>
            <p className="text-xs text-slate-400">RBAC · Audit · Operations</p>
          </div>
        </Link>
        <div className="mt-6 flex justify-start gap-3">
          <ThemeToggle /><SignOutButton />
        </div>
        <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
          <Badge tone="info">Authenticated access</Badge>
          <p className="mt-3 text-sm leading-6 text-slate-300">Records are loaded from the API with your authenticated account and server-enforced permissions.</p>
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
          <div className="mb-6 flex justify-end gap-3 lg:hidden"><ThemeToggle /><SignOutButton /></div><nav aria-label="Mobile admin modules" className="mb-5 flex gap-4 overflow-x-auto lg:hidden">{modules.map((label) => <a className="whitespace-nowrap" key={label} href={`/${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</a>)}</nav>
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
          <AdminMetrics />

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card title="Month 1 Control Plane">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Customers', '/customers'],
                  ['Digital IDs', '/rhc-digital-ids'],
                  ['Companies', '/companies'],
                  ['Projects', '/projects'],
                  ['Properties', '/properties'],
                  ['Reservations', '/reservations'],
                  ['Feature Flags', '/feature-flags'],
                  ['Audit Archive', '/audit-logs'],
                ].map(([item, href]) => (
                  <a key={item} href={href} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]">
                    <p className="font-semibold text-white">{item}</p>
                    <p className="mt-1 text-sm text-slate-400">Open permission-guarded module</p>
                  </a>
                ))}
              </div>
            </Card>
            <div className="space-y-6">
              <Card title="Future Web3 Boundary">
                <p className="text-sm leading-6 text-slate-400">Wallet, token, marketplace transactions, and blockchain modules remain disabled in Month 1. This control plane keeps RHC business records authoritative and prepares governed extension points for Month 2.</p>
                <div className="mt-5 space-y-3">
                  {['Wallet actions: not activated — Month 2', 'Token actions: not deployed — Month 2', 'Blockchain actions: not configured — Month 2'].map((flag) => <div key={flag} className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 font-mono text-sm text-amber-100">{flag}</div>)}
                </div>
              </Card>
              <RecentActivity />
            </div>
          </div>
        </div>
      </section>
    </Web3Shell>
  );
}
