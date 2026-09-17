'use client';

import Link from 'next/link';
import { Badge, Card, EmptyState, MetricCard, ResourceStatus, SignOutButton, ThemeToggle, Web3Button, Web3Shell, useResource } from '@rhc/ui';
import { AdminMetrics, adminNavGroups, adminNavItems } from './admin-data';

type AuditRow = { id: string; action: string; entity_type: string; entity_id?: string | null; created_at: string };
type Dashboard = { totalUsers: number; verifiedCustomers: number; companies: number; activeProjects: number; totalAmicaProperties: number; availableProperties: number; reservedProperties: number; auditCount: number };

function AdminSidebar() {
  return (
    <aside className="rhc-admin-sidebar fixed hidden h-full w-80 overflow-y-auto border-r border-[var(--rhc-border)] p-6 lg:block">
      <Link href="/" className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-[var(--rhc-accent-soft)]">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(212,175,55,.35)] bg-[var(--rhc-accent-soft)] font-black text-[var(--rhc-primary)]">RHC</div>
        <div>
          <h1 className="text-base font-black text-[var(--rhc-heading)]">Admin Command Center</h1>
          <p className="text-xs text-[var(--rhc-muted)]">Operations · RBAC · Audit</p>
        </div>
      </Link>
      <div className="mt-5 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
        <Badge tone="gold">Authenticated access</Badge>
        <p className="mt-3 text-xs leading-5 text-[var(--rhc-muted)]">Server-enforced permissions protect administrative records and actions.</p>
      </div>
      <nav aria-label="Admin navigation" className="mt-6 space-y-6">
        {adminNavGroups.map((group) => (
          <div key={group.section}>
            <p className="px-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--rhc-primary)]">{group.section}</p>
            <div className="mt-2 space-y-1">
              {group.items.map(([label, href]) => (
                <Link key={label} href={href} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${href === '/' ? 'bg-[var(--rhc-accent-soft)] text-[var(--rhc-heading)] ring-1 ring-[rgba(212,175,55,.28)]' : 'text-[var(--rhc-secondary-text)] hover:bg-[var(--rhc-surface-secondary)] hover:text-[var(--rhc-heading)]'}`}>
                  <span>{label}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${href === '/' ? 'bg-[var(--rhc-primary)]' : 'bg-transparent'}`} />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function RecentActivity() {
  const audit = useResource<AuditRow[]>('/admin/audit-logs?take=8');
  return (
    <Card title="Recent Activity">
      <ResourceStatus {...audit} />
      {audit.data && (audit.data.length ? (
        <div className="space-y-3">
          {audit.data.map((row) => (
            <div key={row.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
              <p className="font-semibold text-[var(--rhc-heading)]">{row.action}</p>
              <p className="mt-1 text-sm text-[var(--rhc-muted)]">{row.entity_type} · {new Date(row.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : <EmptyState title="No audit activity" description="Audited actions will appear here after records are changed." />)}
    </Card>
  );
}

function OperationsSnapshot() {
  const dashboard = useResource<Dashboard>('/admin/dashboard');
  return (
    <Card title="Operations Snapshot">
      <ResourceStatus {...dashboard} />
      {dashboard.data && (
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Available units" value={String(dashboard.data.availableProperties)} detail="Reservation-ready inventory" icon="AV" />
          <MetricCard label="Reserved units" value={String(dashboard.data.reservedProperties)} detail="Active pipeline" icon="RS" />
          <MetricCard label="Verified customers" value={String(dashboard.data.verifiedCustomers)} detail="Business-verified accounts" icon="ID" />
          <MetricCard label="Audit events" value={String(dashboard.data.auditCount)} detail="Governance trail" icon="AU" />
        </div>
      )}
    </Card>
  );
}

export default function AdminHome() {
  return (
    <Web3Shell variant="admin">
      <AdminSidebar />
      <section className="min-h-screen lg:pl-80">
        <header className="border-b border-[var(--rhc-border)] bg-[var(--rhc-bg)] px-5 py-5 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="rhc-eyebrow">RHC Digital Admin</p>
              <h1 className="mt-1 text-2xl font-black text-[var(--rhc-heading)] md:text-4xl">Command Center</h1>
            </div>
            <div className="flex items-center gap-3"><ThemeToggle /><SignOutButton /></div>
          </div>
          <nav aria-label="Mobile admin modules" className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto pb-1 lg:hidden">
            {adminNavItems.map(([label, href]) => <Link key={label} href={href} className="whitespace-nowrap rounded-full border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] px-3 py-2 text-xs font-bold text-[var(--rhc-secondary-text)]">{label}</Link>)}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <section className="rhc-admin-hero rounded-[2rem] border border-[rgba(212,175,55,.24)] p-6 shadow-2xl md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <Badge tone="gold">Server-enforced RBAC required</Badge>
                <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-[var(--rhc-heading)] md:text-6xl">RHC Digital Operations Control Plane</h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--rhc-secondary-text)]">Manage customer identity, Amica property operations, reservations, companies, permissions, feature controls, and audit evidence in one governed admin workspace.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Web3Button href="/customers">Review customers</Web3Button>
                  <Web3Button href="/reservations" variant="secondary">Reservation pipeline</Web3Button>
                  <Web3Button href="/audit-logs" variant="secondary">Audit trail</Web3Button>
                </div>
              </div>
              <Card className="rhc-card-token" title="System Boundary">
                <p className="text-sm leading-6 text-[var(--rhc-muted)]">Wallet, token, public blockchain, exchange, custody, staking, and tokenized ownership remain disabled. Admin feature controls do not activate regulated capabilities.</p>
              </Card>
            </div>
          </section>

          <div className="mt-8"><AdminMetrics /></div>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
            <Card title="Operational Workspaces">
              <div className="grid gap-4 md:grid-cols-2">
                {adminNavItems.filter(([, href]) => href !== '/').slice(0, 12).map(([item, href]) => (
                  <Link key={item} href={href} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4 transition hover:-translate-y-0.5 hover:border-[rgba(212,175,55,.42)] hover:bg-[var(--rhc-accent-soft)]">
                    <p className="font-semibold text-[var(--rhc-heading)]">{item}</p>
                    <p className="mt-1 text-sm text-[var(--rhc-muted)]">Open permission-guarded module</p>
                  </Link>
                ))}
              </div>
            </Card>
            <div className="space-y-6">
              <OperationsSnapshot />
              <RecentActivity />
            </div>
          </section>
        </main>
      </section>
    </Web3Shell>
  );
}
