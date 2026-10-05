'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  ResourceStatus,
  Web3Button,
  Web3Shell,
  SignOutButton,
  MetricCard,
  usePagedResource,
  useResource,
  useRuntime,
} from '@rhc/ui';
import { AdminMetrics, AdminShell, adminNavItems, canAccessAdminRoute, useAdminCapabilities, visibleModules, type AdminCapabilities } from './admin-data';

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  created_at: string;
};
function loadedCount<T>(rows: T[] | undefined, error: string | undefined, match: (row: T) => boolean) {
  if (error) return 'Unavailable';
  if (!rows) return '…';
  return String(rows.filter(match).length);
}

function loadedDetail(
  rows: unknown[] | undefined,
  error: string | undefined,
  hasMore: boolean,
  resource: string,
) {
  if (error) return `${resource} could not be loaded.`;
  if (!rows) return `Loading ${resource.toLowerCase()}…`;
  return `${rows.length} permission-scoped records loaded${hasMore ? '; more are available' : ''}.`;
}

function WorkQueue({ label, href, path, match }: { label: string; href: string; path: string; match: (row: Record<string, unknown>) => boolean }) {
  const resource = usePagedResource<{ id: string; [key: string]: unknown }>(path, true);
  return <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
    <Link href={href} className="text-sm font-semibold">{label}</Link>
    <p className="mt-2 text-3xl font-black">{loadedCount(resource.data, resource.error, match)}</p>
    <p className="mt-2 text-xs text-[var(--rhc-muted)]">{loadedDetail(resource.data, resource.error, resource.hasMore, label)}</p>
    <ResourceStatus {...resource} />
  </div>;
}

function PendingWork({ capabilities }: { capabilities: AdminCapabilities }) {
  return <Card title="Pending Work & Exceptions">
    <p className="mb-5 text-sm text-[var(--rhc-muted)]">Counts reflect loaded permission-scoped records, not inferred service health or complete totals.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {canAccessAdminRoute(capabilities, '/customers') && <>
        <WorkQueue label="Verification reviews" href="/verification" path="/admin/customers" match={(row) => row.verification_status === 'PENDING'} />
        <WorkQueue label="Customer account exceptions" href="/customers" path="/admin/customers" match={(row) => row.account_status === 'LOCKED' || row.account_status === 'DISABLED'} />
      </>}
      {canAccessAdminRoute(capabilities, '/reservations') && <WorkQueue label="Pending reservations" href="/reservations" path="/admin/reservations" match={(row) => row.status === 'PENDING'} />}
      {canAccessAdminRoute(capabilities, '/integrations') && <WorkQueue label="Integration exceptions" href="/integrations" path="/admin/integrations" match={(row) => row.status === 'ERROR' || row.status === 'SUSPENDED'} />}
    </div>
  </Card>;
}

function RecentActivity() {
  const audit = useResource<AuditRow[]>('/admin/audit-logs?take=8');
  return (
    <Card title="Recent Activity">
      <ResourceStatus {...audit} />
      {audit.data &&
        (audit.data.length ? (
          <div className="space-y-3">
            {audit.data.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"
              >
                <p className="font-semibold text-[var(--rhc-heading)]">{row.action}</p>
                <p className="mt-1 text-sm text-[var(--rhc-muted)]">
                  {row.entity_type} · {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No audit activity"
            description="No audit events were returned for your permitted scope."
          />
        ))}
    </Card>
  );
}

type Dashboard = { availableProperties: number; reservedProperties: number; verifiedCustomers: number; auditCount: number };
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
  const capabilities = useAdminCapabilities();
  const { navigate } = useRuntime();
  const visible = visibleModules(capabilities.data);
  const dashboard = visible.find((module) => module.path === '/');
  const firstPermitted = visible.find((module) => module.path !== '/') ?? visible[0];
  const hasDashboard = Boolean(dashboard);

  useEffect(() => {
    if (!capabilities.loading && !capabilities.error && capabilities.data && !hasDashboard && firstPermitted) navigate(firstPermitted.path);
  }, [capabilities.data, capabilities.loading, capabilities.error, firstPermitted, hasDashboard, navigate]);

  if (capabilities.loading || capabilities.error) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">Checking permissions</h1><ResourceStatus {...capabilities} /></section></Web3Shell>;
  }
  if (!visible.length) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">No administrative access</h1><div className="mt-8"><EmptyState title="No permitted modules" description="This authenticated account has no effective administrative read permission. Contact an authorized operator; no administrative data is shown here." /></div><div className="mt-6"><SignOutButton /></div></section></Web3Shell>;
  }
  if (!hasDashboard) {
    return <Web3Shell variant="admin"><section className="mx-auto max-w-3xl px-6 py-10"><Badge tone="warning">Admin access</Badge><h1 className="rhc-page-title mt-5">Opening your permitted module</h1><p role="status" className="mt-4 text-[var(--rhc-muted)]">Dashboard access is not required. Continuing to {firstPermitted?.label || 'the first permitted module'}.</p>{firstPermitted && <Link className="mt-6 inline-block" href={firstPermitted.path}>Continue</Link>}</section></Web3Shell>;
  }

  return (
    <AdminShell title="Command Center" activeHref="/">
      <section className="rhc-admin-hero rounded-[2rem] border border-[rgba(212,175,55,.24)] p-6 shadow-2xl md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <Badge tone="gold">Permission-scoped operations</Badge>
            <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-[var(--rhc-heading)] md:text-5xl">
              Prioritize pending decisions and operational exceptions.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--rhc-secondary-text)]">
              Review the current queues, open the governed workspace, and verify the API result
              before treating any administrative action as complete.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {canAccessAdminRoute(capabilities.data, '/verification') && <Web3Button href="/verification">Open verification queue</Web3Button>}
              {canAccessAdminRoute(capabilities.data, '/reservations') && <Web3Button href="/reservations" variant="secondary">
                Review reservations
              </Web3Button>}
              {canAccessAdminRoute(capabilities.data, '/integrations') && <Web3Button href="/integrations" variant="secondary">
                Check integrations
              </Web3Button>}
            </div>
          </div>
          <Card className="rhc-card-token" title="Operator Boundary">
            <p className="text-sm leading-6 text-[var(--rhc-muted)]">
              The interface reports returned records and API responses only. Permissions, audit
              writes, and state transitions remain server enforced.
            </p>
          </Card>
        </div>
      </section>

      <section aria-label="Current work queues" className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <PendingWork capabilities={capabilities.data!} />
        {canAccessAdminRoute(capabilities.data, '/audit-logs') && <RecentActivity />}
      </section>

      <section aria-labelledby="operational-context-title" className="mt-8">
        <h2 id="operational-context-title" className="rhc-section-title mb-5">
          Operational Context
        </h2>
        <AdminMetrics />
        <OperationsSnapshot />
      </section>

      <section aria-labelledby="workspaces-title" className="mt-8">
        <Card title="Operational Workspaces">
          <h2 id="workspaces-title" className="sr-only">
            All administrative workspaces
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {adminNavItems
              .filter(([, href]) => href !== '/' && (visible.some((module) => module.path === href) || capabilities.data?.modules?.some((module) => module.path === href && module.usable)))
              .sort(([, left], [, right]) => {
                const rank = (href: string) => { const index = visible.findIndex((module) => module.path === href); return index < 0 ? visible.length : index; };
                return rank(left) - rank(right);
              })
              .map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4 transition hover:-translate-y-0.5 hover:border-[rgba(212,175,55,.42)] hover:bg-[var(--rhc-accent-soft)]"
                >
                  <p className="font-semibold text-[var(--rhc-heading)]">{label}</p>
                  <p className="mt-1 text-sm text-[var(--rhc-muted)]">
                    Open permission-guarded workspace
                  </p>
                </Link>
              ))}
          </div>
        </Card>
      </section>
    </AdminShell>
  );
}
