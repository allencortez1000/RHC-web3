'use client';

import { AppShell, Badge, Card, EmptyState, MetricCard, ResourceStatus, Web3Button, useResource } from '@rhc/ui';
import { navFor } from '../web3-nav';
import { DirectoryCards, IdentityCard, Notifications, fullName, type Me, type PropertyLink } from '../components/customer-data';

type Reservation = { id: string; reservation_number: string; status: string; created_at: string; expires_at?: string; property?: { property_code?: string; project?: { project_name?: string } } };
type DemoRecords = {
  payments: Array<{ status: string; amount: number }>;
  documents: Array<{ id: string; status: string }>;
  certificates: Array<{ id: string; status: string }>;
  rewards: { balance: number; earned: number; redeemed: number; entries: Array<{ id: string; date: string; source: string; points: number; reason: string }> };
  milestones: Array<{ id: string; title: string; status: string; date: string }>;
};

const journey = [
  { title: 'Reservation', description: 'Request submitted and reviewed by RHC sales.' },
  { title: 'Contract', description: 'Customer documents and agreement records prepared.' },
  { title: 'Payments', description: 'Posted payment records are visible in the portal.' },
  { title: 'Construction', description: 'Project progress updates are tracked by milestone.' },
  { title: 'Certificate', description: 'Eligible certificates appear after business review.' },
  { title: 'Turnover', description: 'Final turnover remains pending until all checks pass.' },
];

export default function Page() {
  const me = useResource<Me>('/me');
  const properties = useResource<PropertyLink[]>('/me/properties');
  const reservations = useResource<Reservation[]>('/me/reservations');
  const records = useResource<DemoRecords>('/me/demo-records');
  const customerName = me.data ? fullName(me.data) : 'RHC Customer';
  const activeReservations = reservations.data?.filter((item) => ['PENDING', 'CONFIRMED'].includes(item.status)).length ?? 0;
  const linkedProperties = properties.data?.length ?? 0;
  const rewardsBalance = records.data?.rewards.balance ?? 0;
  const postedPayments = records.data?.payments.filter((item) => item.status === 'POSTED').reduce((sum, item) => sum + item.amount, 0) ?? 0;

  return (
    <AppShell title="My RHC Dashboard" navItems={navFor('Dashboard')}>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="rhc-card-token rhc-dashboard-hero p-6 md:p-8">
          <Badge tone="gold">My RHC</Badge>
          <h2 className="rhc-page-title mt-5 max-w-4xl">Welcome back, {customerName}</h2>
          <p className="rhc-body-copy mt-4 max-w-3xl">
            Manage your RHC identity, property journey, payment records, documents, rewards, and ecosystem services from one secure account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Web3Button href="/properties">Explore properties</Web3Button>
            <Web3Button href="/digital-id" variant="secondary">View Digital ID</Web3Button>
            <Web3Button href="/documents" variant="secondary">Open documents</Web3Button>
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--rhc-muted)]">
            Demo environment. Records are fictional and no real customer transaction, payment, wallet, token, or blockchain action is processed.
          </p>
        </Card>
        <IdentityCard />
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="RHC Digital ID" value={me.data?.profile?.rhc_id || 'Pending'} detail={me.data?.user?.verification_status || 'Verification status'} icon="ID" />
        <MetricCard label="Linked properties" value={String(linkedProperties)} detail="Authorized customer records" icon="⌂" />
        <MetricCard label="Active reservations" value={String(activeReservations)} detail="Pending or confirmed" icon="RS" />
        <MetricCard label="RHC Rewards" value={rewardsBalance.toLocaleString()} detail="Demo points, not crypto or cash" icon="★" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card title="Property Journey">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">Track the customer journey from reservation to turnover. Each step is backed by business records and does not imply legal ownership by itself.</p>
          <div className="rhc-journey-timeline mt-5 space-y-3">
            {journey.map((step, index) => (
              <div key={step.title} className="rhc-journey-row flex gap-4 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                <div className="flex flex-col items-center">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgba(212,175,55,.35)] bg-[var(--rhc-accent-soft)] text-xs font-black text-[var(--rhc-primary)]">{index + 1}</span>
                  {index < journey.length - 1 ? <span className="mt-3 h-full min-h-7 w-px bg-[var(--rhc-border)]" /> : null}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[var(--rhc-heading)]">{step.title}</h3>
                    <Badge tone={index < 5 ? 'success' : 'warning'}>{index < 5 ? 'Active' : 'Pending'}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--rhc-muted)]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="My Property">
          <ResourceStatus {...properties} />
          {properties.data && (properties.data.length ? (
            <div className="grid gap-3">
              {properties.data.slice(0, 2).map((link) => (
                <div key={link.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--rhc-heading)]">{link.property?.property_code || 'Demo property'}</p>
                      <p className="mt-1 text-sm text-[var(--rhc-muted)]">{link.property?.project?.project_name || 'RHC property record'} · {link.relationship_type}</p>
                    </div>
                    <Badge tone="gold">{link.status}</Badge>
                  </div>
                </div>
              ))}
              <Web3Button href="/my-properties" variant="secondary">View property lifecycle</Web3Button>
            </div>
          ) : <EmptyState title="No linked properties yet" description="Explore the demo inventory to begin your property journey." />)}
        </Card>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1fr_1fr]">
        <Card title="Records Requiring Attention">
          <ResourceStatus {...records} />
          {records.data && (
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Posted payments" value={`₱${postedPayments.toLocaleString()}`} detail="Demo records only" icon="₱" />
              <MetricCard label="Documents" value={String(records.data.documents.length)} detail="Sample records" icon="DOC" />
              <MetricCard label="Certificates" value={String(records.data.certificates.length)} detail="Verification credentials" icon="CRT" />
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Web3Button href="/payment-records" variant="secondary">View payments</Web3Button>
            <Web3Button href="/documents" variant="secondary">View documents</Web3Button>
            <Web3Button href="/certificates" variant="secondary">View certificates</Web3Button>
          </div>
        </Card>
        <Card title="Recent Activity">
          <ResourceStatus {...records} />
          {records.data && (
            <div className="space-y-3">
              {records.data.rewards.entries.slice(0, 3).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                  <p className="font-bold text-[var(--rhc-heading)]">{entry.reason}</p>
                  <p className="mt-1 text-sm text-[var(--rhc-muted)]">{entry.source} · {entry.date} · {entry.points > 0 ? '+' : ''}{entry.points.toLocaleString()} points</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[.95fr_1.05fr]">
        <Card title="Notifications"><Notifications /></Card>
        <Card title="RHC Ecosystem Services">
          <p className="mb-4 text-sm leading-6 text-[var(--rhc-muted)]">Participating RHC businesses and services appear here as demo directory records. No external service integration is live.</p>
          <DirectoryCards path="/business-services" />
          <div className="mt-5 flex flex-wrap gap-3">
            <Web3Button href="/ecosystem" variant="secondary">Open ecosystem</Web3Button>
            <Web3Button href="/marketplace" variant="secondary">Open marketplace</Web3Button>
          </div>
        </Card>
      </section>

      <section className="mt-5">
        <Card title="Future Web3 Infrastructure">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {['Wallet not activated', 'Token not deployed', 'Blockchain not connected', 'Digital assets not tokenized'].map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
                <Badge tone="warning">Future</Badge>
                <p className="mt-3 text-sm font-bold text-[var(--rhc-heading)]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-5"><Web3Button href="/future-technology" variant="secondary">View future technology roadmap</Web3Button></div>
        </Card>
      </section>
    </AppShell>
  );
}
