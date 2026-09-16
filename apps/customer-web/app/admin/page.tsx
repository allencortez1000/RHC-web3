'use client';

import { AppShell, Badge, Card, EmptyState, MetricCard, ResourceStatus, SignOutButton, Web3Button, isAdminAccount, useResource, useRuntime } from '@rhc/ui';
import { navFor } from '../web3-nav';

type AdminMetrics = {
  totalUsers: number;
  verifiedCustomers: number;
  companies: number;
  activeProjects: number;
  totalAmicaProperties: number;
  availableProperties: number;
  reservedProperties: number;
  activeIntegrations: number;
  auditCount: number;
};
type AuditRow = { id: string; action: string; entity_type: string; created_at: string };

const modules = [
  ['Customers', 'Customer records and verification'],
  ['RHC Digital IDs', 'Identity registry and eligibility'],
  ['Companies', 'RHC company directory'],
  ['Projects', 'Amica project records'],
  ['Properties', 'Inventory and status management'],
  ['Reservations', 'Reservation workflow operations'],
  ['Audit Logs', 'Security and business activity'],
  ['System Settings', 'Month 1 configuration'],
] as const;

export default function AdminPage() {
  const { user } = useRuntime();
  const metrics = useResource<AdminMetrics>('/admin/dashboard');
  const audit = useResource<AuditRow[]>('/admin/audit-logs?take=8');

  if (!isAdminAccount(user)) {
    return (
      <AppShell title="Admin Access" navItems={navFor('Dashboard')} hideSidebar>
        <Card title="Access denied">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">
            This dashboard is available only to authorized RHC administrators and staff. Customer
            accounts remain restricted to the customer portal.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Web3Button href="/dashboard" variant="secondary">Return to Customer Dashboard</Web3Button>
            <SignOutButton />
          </div>
        </Card>
      </AppShell>
    );
  }

  const adminUser = user!;
  const role = adminUser.role || adminUser.roles?.[0] || 'Admin';

  return (
    <AppShell title="RHC Admin Dashboard" navItems={navFor('Dashboard')} hideSidebar>
      <section className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
        <Card className="rhc-card-token" title="Admin Command Center">
          <Badge tone="warning">Admin Only</Badge>
          <h2 className="mt-5 text-3xl font-black text-[var(--rhc-heading)] md:text-5xl">RHC Management Console</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--rhc-muted)]">
            You are signed in as <strong>{adminUser.email}</strong>. This same-port admin dashboard is protected
            by role checks in the UI and server-side RBAC on admin API endpoints.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Web3Button href="/dashboard" variant="secondary">Customer Dashboard</Web3Button>
            <SignOutButton />
          </div>
        </Card>
        <Card title="System Status">
          <div className="space-y-3">
            {[
              ['Application', 'Operational'],
              ['Database/API', 'Demo or connected API'],
              ['Wallet', 'Not activated - Month 2'],
              ['Token', 'Not deployed - Month 2'],
              ['Blockchain', 'Not configured - Month 2'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4 text-sm">
                <span className="text-[var(--rhc-muted)]">{label}</span>
                <strong className="text-[var(--rhc-heading)]">{value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-5">
        <ResourceStatus {...metrics} />
        {metrics.data && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Users" value={String(metrics.data.totalUsers)} detail="API/dashboard metric" />
            <MetricCard label="Verified Customers" value={String(metrics.data.verifiedCustomers)} detail="Business verified" />
            <MetricCard label="Active Projects" value={String(metrics.data.activeProjects)} detail="Project records" />
            <MetricCard label="Properties" value={String(metrics.data.totalAmicaProperties)} detail={`${metrics.data.availableProperties} available - ${metrics.data.reservedProperties} reserved`} />
            <MetricCard label="Companies" value={String(metrics.data.companies)} detail="RHC ecosystem directory" />
            <MetricCard label="Integrations" value={String(metrics.data.activeIntegrations)} detail="Active integrations" />
            <MetricCard label="Audit Events" value={String(metrics.data.auditCount)} detail="Security trail" />
            <MetricCard label="Admin Role" value={role} detail="Current session" />
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card title="Admin Modules">
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map(([title, description]) => (
              <div key={title} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                <p className="font-bold text-[var(--rhc-heading)]">{title}</p>
                <p className="mt-1 text-sm text-[var(--rhc-muted)]">{description}</p>
                <div className="mt-4">
                  <Web3Button variant="secondary" disabled>Full module coming next</Web3Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent Activity">
          <ResourceStatus {...audit} />
          {audit.data && (audit.data.length ? (
            <div className="space-y-3">
              {audit.data.map((row) => (
                <div key={row.id} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                  <p className="font-bold text-[var(--rhc-heading)]">{row.action}</p>
                  <p className="mt-1 text-sm text-[var(--rhc-muted)]">{row.entity_type} - {new Date(row.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No recent activity" description="Admin actions and audited events will appear here." />)}
        </Card>
      </section>
    </AppShell>
  );
}
