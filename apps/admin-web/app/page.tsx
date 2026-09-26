'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  MetricCard,
  ResourceStatus,
  SignOutButton,
  ThemeToggle,
  Web3Button,
  Web3Shell,
  useResource,
  useRuntime,
} from '@rhc/ui';
import { AdminMetrics, type AdminCapabilities, visibleModules } from './admin-data';

type AuditRow = { id: string; action: string; entity_type: string; entity_id?: string | null; created_at: string };
type Dashboard = { totalUsers: number; verifiedCustomers: number; companies: number; activeProjects: number; totalAmicaProperties: number; availableProperties: number; reservedProperties: number; activeIntegrations: number; auditCount: number };

type Module = ReturnType<typeof visibleModules>[number];

function AdminSidebar({ modules }: { modules: Module[] }) {
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
      <nav aria-label="Admin navigation" className="mt-6 space-y-1">
        {modules.map((module) => (
          <Link key={module.path} href={module.path} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--rhc-secondary-text)] transition hover:bg-[var(--rhc-surface-secondary)] hover:text-[var(--rhc-heading)]">
            <span>{module.label}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
          </Link>
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
  const capabilities = useResource<AdminCapabilities>('/admin/capabilities');
  const { navigate } = useRuntime();
  const visible = visibleModules(capabilities.data);
  const dashboard = visible.find((module) => module.path === '/');
  const firstPermitted = visible.find((module) => module.path !== '/') ?? visible[0];
  const hasDashboard = Boolean(dashboard);

  useEffect(() => {
    if (capabilities.data && !hasDashboard && firstPermitted) navigate(firstPermitted.path);
  }, [capabilities.data, firstPermitted, hasDashboard, navigate]);

  if (capabilities.loading || capabilities.error) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">Checking permissions</h1><ResourceStatus {...capabilities} /></section></Web3Shell>;
  }
  if (!visible.length) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">No administrative access</h1><div className="mt-8"><EmptyState title="No permitted modules" description="This authenticated account has no effective administrative read permission. Contact an authorized operator; no administrative data is shown here." /></div><div className="mt-6"><SignOutButton /></div></section></Web3Shell>;
  }
  if (!hasDashboard) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">Opening your permitted module</h1><p role="status" className="mt-4 text-[var(--rhc-muted)]">Dashboard access is not required. Continuing to {firstPermitted?.label || 'the first permitted module'}.</p>{firstPermitted && <Link className="mt-6 inline-block" href={firstPermitted.path}>Continue</Link>}</section></Web3Shell>;
  }

  const customerModule = visible.find((module) => module.path === '/customers');
  const reservationModule = visible.find((module) => module.path === '/reservations');
  const auditModule = visible.find((module) => module.path === '/audit-logs');

  return (
    <Web3Shell variant="admin">
      <AdminSidebar modules={visible} />
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
            {visible.map((module) => <Link key={module.path} href={module.path} className="whitespace-nowrap rounded-full border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] px-3 py-2 text-xs font-bold text-[var(--rhc-secondary-text)]">{module.label}</Link>)}
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
                  {customerModule && <Web3Button href={customerModule.path}>Review customers</Web3Button>}
                  {reservationModule && <Web3Button href={reservationModule.path} variant="secondary">Reservation pipeline</Web3Button>}
                  {auditModule && <Web3Button href={auditModule.path} variant="secondary">Audit trail</Web3Button>}
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
                {visible.filter((module) => module.path !== '/').slice(0, 12).map((module) => (
                  <Link key={module.path} href={module.path} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4 transition hover:-translate-y-0.5 hover:border-[rgba(212,175,55,.42)] hover:bg-[var(--rhc-accent-soft)]">
                    <p className="font-semibold text-[var(--rhc-heading)]">{module.label}</p>
                    <p className="mt-1 text-sm text-[var(--rhc-muted)]">Open permission-guarded module</p>
                  </Link>
                ))}
              </div>
            </Card>
            <div className="space-y-6">
              <OperationsSnapshot />
              {auditModule && <RecentActivity />}
            </div>
          </section>
        </main>
      </section>
    </Web3Shell>
  );
}
