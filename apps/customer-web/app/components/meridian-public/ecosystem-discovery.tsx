'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  AppShell,
  Badge,
  Card,
  EmptyState,
  ResourceStatus,
  Web3Button,
  errorMessage,
  usePagedResource,
  useResource,
  useRuntime,
} from '@rhc/ui';
import { navFor } from '../../web3-nav';
import { GoldenThreadDirectory } from './golden-thread-map';
import {
  buildDirectoryGraph,
  statusLabel,
  type DirectoryCompany,
  type DirectoryProject,
  type DirectoryProperty,
  type DirectoryService,
} from './ecosystem-directory';

export function EcosystemDiscovery() {
  const { dataMode } = useRuntime();
  const companies = usePagedResource<DirectoryCompany>('/companies');
  const projects = usePagedResource<DirectoryProject>('/projects');
  const properties = usePagedResource<DirectoryProperty>('/properties');
  const services = usePagedResource<DirectoryService>('/business-services');
  const demo = dataMode === 'demo';
  const graph = useMemo(
    () => buildDirectoryGraph(companies.data || [], projects.data || [], properties.data || [], services.data || []),
    [companies.data, projects.data, properties.data, services.data],
  );
  const sources = [
    { name: 'Companies', resource: companies },
    { name: 'Property projects', resource: projects },
    { name: 'Property records', resource: properties },
    { name: 'Services', resource: services },
  ];
  const incomplete = sources.some(({ resource }) => resource.loading || resource.error || resource.hasMore);

  return (
    <AppShell title="RHC Ecosystem" navItems={navFor('RHC Ecosystem')}>
      <section className="rounded-2xl border border-[var(--rhc-border)] bg-[linear-gradient(135deg,var(--rhc-surface),var(--rhc-surface-secondary))] p-6 md:p-8">
        <Badge tone={demo ? 'gold' : 'neutral'}>{demo ? 'Demo preview · synthetic directory' : 'RHC company and service directory'}</Badge>
        <p className="rhc-eyebrow mt-5">Rabino Holdings Corporation</p>
        <h2 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-[-0.045em] text-[var(--rhc-heading)] md:text-5xl">Follow the Golden Thread</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--rhc-secondary-text)]">
          Explore the recorded connections between a company, its property projects, and its listed services. Select an entry to understand the relationship and what you can do next.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
            <h3 className="font-bold text-[var(--rhc-heading)]">Company preparedness</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">An integration record describes preparation. It does not activate a partner or make every service available.</p>
          </div>
          <div className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
            <h3 className="font-bold text-[var(--rhc-heading)]">Service availability</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">Each service has its own status. Property and resident requirements still need authorization; this directory cannot grant access.</p>
          </div>
          <div className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-4">
            <h3 className="font-bold text-[var(--rhc-heading)]">{demo ? 'Demo preview only' : 'Discovery only'}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">
              {demo ? 'Even “Active” is synthetic here. No real inventory, prices, payment, or external provider connection is offered.' : 'Browsing creates no purchase, reservation, provider dispatch, or external service activation. No prices are shown here.'}
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Directory data sources" className="mt-5 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-[var(--rhc-heading)]">Directory data sources</h2>
            <p className="mt-1 text-sm text-[var(--rhc-muted)]">
              {incomplete ? 'Partial directory: searches and connections cover loaded records only.' : 'Showing loaded directory records. Refresh to check for updates.'} No substitute sample entries are added when a source is empty or unavailable.
            </p>
          </div>
          <Web3Button variant="secondary" disabled={sources.some(({ resource }) => resource.loading)} onClick={() => sources.forEach(({ resource }) => resource.refresh())}>Refresh directory</Web3Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sources.map(({ name, resource }) => (
            <div key={name} role="group" aria-label={`${name} source`} className="min-w-0 rounded-xl border border-[var(--rhc-border)] p-3 text-sm">
              <p className="font-bold text-[var(--rhc-heading)]">{name}</p>
              <p className="mt-1 text-[var(--rhc-muted)]">{resource.data?.length || 0} loaded{resource.error && resource.data ? ' · previously loaded records' : ''}</p>
              <ResourceStatus loading={resource.loading} error={resource.error} unavailable={resource.unavailable} reload={resource.reload} />
              {resource.hasMore ? <Web3Button variant="tertiary" disabled={resource.loading || !!resource.error} onClick={resource.loadMore}>Load more {name.toLowerCase()}</Web3Button> : null}
            </div>
          ))}
        </div>
      </section>

      <GoldenThreadDirectory graph={graph} demo={demo} />
      {demo ? <ServiceRequestWorkspace services={services.data || []} /> : null}

      <Card title="A governed directory" className="mt-6">
        <p className="text-sm leading-6 text-[var(--rhc-secondary-text)]">Each business remains a separate entity with its own contracts, permissions, records, and responsibilities. RHC describes connections; it does not create eligibility. Service-to-property assignments are not supplied by the current directory contract, so the map does not invent them.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Web3Button href="/marketplace" variant="secondary">Explore service concepts</Web3Button><Web3Button href="/digital-id" variant="tertiary">Understand your RHC Digital ID</Web3Button></div>
      </Card>
    </AppShell>
  );
}

type DemoServiceRequest = {
  id: string;
  reference: string;
  title: string;
  status: string;
  updated_at: string;
  events?: Array<{ status: string; at: string; note: string }>;
};

function ServiceRequestWorkspace({ services }: { services: DirectoryService[] }) {
  const requests = useResource<DemoServiceRequest[]>('/me/service-requests');
  const { request } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await request<{ request: DemoServiceRequest; receipt?: { reference?: string } }>('/me/service-requests', {
        method: 'POST',
        body: JSON.stringify({ service_id: String(form.get('service_id') || ''), title: String(form.get('title') || '').trim() }),
      });
      setMessage(`${result.request.reference} was created in the shared demo world. ${result.receipt?.reference || 'A receipt'} was added to activity history.`);
      formElement.reset();
      requests.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = 'mt-2 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rhc-primary)]';
  return (
    <section id="demo-service-requests" className="mt-7 grid scroll-mt-24 gap-5 xl:grid-cols-[.8fr_1.2fr]" aria-label="Local demo service requests">
      <Card title="Create demo service request">
        <p className="text-sm leading-6 text-[var(--rhc-muted)]">A synthetic workflow preview, separate from service availability. This creates a persistent local request visible to a scoped operator. It does not dispatch a real provider, create a bill, or activate an external integration. Use fictional details only.</p>
        <form onSubmit={submit} className="mt-4 grid gap-4">
          <label htmlFor="service-request-service" className="text-sm font-semibold text-[var(--rhc-heading)]">
            Service for demo preview
            <select id="service-request-service" aria-label="Service for demo preview" name="service_id" required disabled={busy} className={fieldClass}>
              <option value="">Choose a loaded service</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.service_name} · {statusLabel(service.status)} · demo only</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-[var(--rhc-heading)]">
            Request summary
            <input name="title" minLength={3} maxLength={160} required disabled={busy} placeholder="Describe a synthetic request" className={fieldClass} />
          </label>
          <Web3Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create local request'}</Web3Button>
        </form>
        {message ? <p role="status" className="mt-4 rounded-lg border border-[var(--rhc-success-border)] bg-[var(--rhc-success-soft)] p-3 text-sm text-[var(--rhc-success-text)]">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-lg border border-[var(--rhc-danger-border)] bg-[var(--rhc-danger-soft)] p-3 text-sm text-[var(--rhc-danger-text)]">{error}</p> : null}
      </Card>
      <Card title="Shared request history">
        <ResourceStatus loading={requests.loading} error={requests.error} unavailable={requests.unavailable} reload={requests.reload} />
        {!requests.loading && !requests.error && !requests.data?.length ? <EmptyState title="No service requests" description="A request created above will appear here and in the scoped admin workspace." /> : null}
        <div className="mt-4 grid gap-3">
          {requests.data?.map((item) => (
            <article key={item.id} className="rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-bold text-[var(--rhc-heading)]">{item.title}</p><p className="mt-1 font-mono text-xs text-[var(--rhc-muted)]">{item.reference}</p></div>
                <Badge tone={item.status === 'COMPLETED' ? 'success' : item.status === 'CANCELLED' ? 'danger' : 'gold'}>{statusLabel(item.status)}</Badge>
              </div>
              <p className="mt-3 text-xs text-[var(--rhc-muted)]">Last updated {new Date(item.updated_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })}. Synthetic status only.</p>
              {item.events?.length ? <ol className="mt-3 grid gap-2 border-l border-[var(--rhc-primary)] pl-4 text-sm text-[var(--rhc-secondary-text)]">{item.events.map((event, index) => <li key={`${event.at}-${index}`}><span className="font-semibold text-[var(--rhc-heading)]">{statusLabel(event.status)}</span> · {event.note}</li>)}</ol> : null}
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
}
