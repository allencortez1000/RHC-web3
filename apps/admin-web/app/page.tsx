'use client';

import Link from 'next/link';
import {
  Badge,
  Card,
  EmptyState,
  ResourceStatus,
  Web3Button,
  usePagedResource,
  useResource,
  useRuntime,
} from '@rhc/ui';
import { AdminMetrics, AdminShell, adminNavItems, canAccessAdminRoute } from './admin-data';

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  created_at: string;
};
type CustomerWorkRow = {
  id: string;
  account_status?: string | null;
  verification_status?: string | null;
};
type ReservationWorkRow = { id: string; status?: string | null };
type IntegrationWorkRow = { id: string; status?: string | null };

type QueueItem = {
  label: string;
  href: string;
  value: string;
  detail: string;
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

function PendingWork() {
  const customers = usePagedResource<CustomerWorkRow>('/admin/customers', true);
  const reservations = usePagedResource<ReservationWorkRow>('/admin/reservations', true);
  const integrations = usePagedResource<IntegrationWorkRow>('/admin/integrations', true);
  const queues: QueueItem[] = [
    {
      label: 'Verification reviews',
      href: '/verification',
      value: loadedCount(
        customers.data,
        customers.error,
        (row) => row.verification_status === 'PENDING',
      ),
      detail: loadedDetail(customers.data, customers.error, customers.hasMore, 'Customer records'),
    },
    {
      label: 'Pending reservations',
      href: '/reservations',
      value: loadedCount(reservations.data, reservations.error, (row) => row.status === 'PENDING'),
      detail: loadedDetail(
        reservations.data,
        reservations.error,
        reservations.hasMore,
        'Reservation records',
      ),
    },
    {
      label: 'Customer account exceptions',
      href: '/customers',
      value: loadedCount(
        customers.data,
        customers.error,
        (row) => row.account_status === 'LOCKED' || row.account_status === 'DISABLED',
      ),
      detail: loadedDetail(customers.data, customers.error, customers.hasMore, 'Customer records'),
    },
    {
      label: 'Integration exceptions',
      href: '/integrations',
      value: loadedCount(
        integrations.data,
        integrations.error,
        (row) => row.status === 'ERROR' || row.status === 'SUSPENDED',
      ),
      detail: loadedDetail(
        integrations.data,
        integrations.error,
        integrations.hasMore,
        'Integration records',
      ),
    },
  ];

  return (
    <Card title="Pending Work & Exceptions">
      <p className="mb-5 text-sm leading-6 text-[var(--rhc-muted)]">
        Counts come from the permission-scoped records loaded below; they are not inferred service
        health or completion indicators.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {queues.map((queue) => (
          <Link
            key={queue.label}
            href={queue.href}
            className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4 transition hover:-translate-y-0.5 hover:border-[rgba(212,175,55,.42)] hover:bg-[var(--rhc-accent-soft)]"
          >
            <p className="text-sm font-semibold text-[var(--rhc-secondary-text)]">{queue.label}</p>
            <p className="mt-2 text-3xl font-black text-[var(--rhc-heading)]">{queue.value}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--rhc-muted)]">{queue.detail}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RecentActivity() {
  const audit = useResource<AuditRow[]>('/admin/audit-logs?take=8');
  return (
    <Card title="Recent Audit Activity">
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

export default function AdminHome() {
  const { user } = useRuntime();
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
              <Web3Button href="/verification">Open verification queue</Web3Button>
              <Web3Button href="/reservations" variant="secondary">
                Review reservations
              </Web3Button>
              <Web3Button href="/integrations" variant="secondary">
                Check integrations
              </Web3Button>
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
        <PendingWork />
        <RecentActivity />
      </section>

      <section aria-labelledby="operational-context-title" className="mt-8">
        <h2 id="operational-context-title" className="rhc-section-title mb-5">
          Operational Context
        </h2>
        <AdminMetrics />
      </section>

      <section aria-labelledby="workspaces-title" className="mt-8">
        <Card title="All Workspaces">
          <h2 id="workspaces-title" className="sr-only">
            All administrative workspaces
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {adminNavItems
              .filter(([, href]) => href !== '/' && canAccessAdminRoute(user?.permissions, href))
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
