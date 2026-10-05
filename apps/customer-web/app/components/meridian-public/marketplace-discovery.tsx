'use client';

import { useMemo, useState } from 'react';
import { Badge, Card, EmptyState, ResourceStatus, Web3Button, usePagedResource, useRuntime } from '@rhc/ui';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_SERVICES,
  type MarketplaceCategoryKey,
  type MarketplaceService,
} from './data';
import { MeridianIcon } from './meridian-icon';
import { DemoNotice, PublicShell, SectionHeading, StageBadge } from './public-shell';

type DirectoryRecord = { id: string; service_name?: string; display_name?: string; project_name?: string; description?: string | null; status?: string };

function ConnectedDirectory() {
  const [directory, setDirectory] = useState('/business-services');
  const resource = usePagedResource<DirectoryRecord>(directory, false);
  return <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">
    <Card title="Connected API directory">
      <p className="mb-4 text-sm text-[var(--rhc-muted)]">Returned business records are separate from the staged discovery concepts below. No purchase or settlement is enabled.</p>
      <label className="block text-sm font-semibold">Directory
        <select value={directory} onChange={(event) => setDirectory(event.target.value)} className="m-3 rounded-xl border p-3">
          <option value="/business-services">Services</option><option value="/companies">RHC Businesses</option><option value="/projects">Projects</option>
        </select>
      </label>
      <ResourceStatus {...resource} />
      {resource.data && !resource.loading && !resource.error && (resource.data.length ? <div className="grid gap-3 md:grid-cols-3">
        {resource.data.map((record) => <article key={record.id} className="rounded-xl border border-[var(--rhc-border)] p-4">
          <h2 className="font-bold">{record.service_name || record.display_name || record.project_name}</h2>
          <p className="mt-2 text-sm text-[var(--rhc-muted)]">{record.description || record.status || 'Returned API directory record'}</p>
        </article>)}
      </div> : <EmptyState title="No directory records" description="No records were returned for this directory. Staged concepts are not substituted for API results." />)}
    </Card>
  </section>;
}

export function MarketplaceDiscovery() {
  const { user, dataMode } = useRuntime();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MarketplaceCategoryKey>('all');
  const [readiness, setReadiness] = useState<'all' | 'demo' | 'planned'>('all');

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return MARKETPLACE_SERVICES.filter((service) => {
      const categoryMatches = category === 'all' || service.category === category;
      const readinessMatches = readiness === 'all' || service.stage === readiness;
      const searchable = [
        service.title,
        service.provider,
        service.categoryLabel,
        service.description,
        service.connection,
        service.access,
      ]
        .join(' ')
        .toLowerCase();
      return categoryMatches && readinessMatches && (!needle || searchable.includes(needle));
    });
  }, [category, query, readiness]);

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setReadiness('all');
  };

  return (
    <PublicShell current="marketplace">
      {user && dataMode === 'api' ? <ConnectedDirectory /> : null}
      <section className="relative overflow-hidden border-b border-[var(--rhc-border)] px-5 py-16 md:px-8 md:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[var(--rhc-accent-soft)] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <Badge tone="gold">Public service directory</Badge>
            <h1 className="mt-6 max-w-5xl text-[clamp(2.6rem,6vw,5.4rem)] font-extrabold leading-[.98] tracking-[-0.06em] text-[var(--rhc-heading)]">
              Useful connections, <span className="text-[var(--rhc-primary)]">clearly staged.</span>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--rhc-secondary-text)]">
              Explore how RHC places, records, and everyday services may connect. Every listing states whether it is a working demonstration or a planned concept.
            </p>
          </div>
          <DemoNotice>
            This marketplace is for discovery only. It has no checkout, payment, points redemption, transfer, crypto exchange, or blockchain settlement.
          </DemoNotice>
        </div>
      </section>

      <section className="px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 shadow-sm md:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
              <label htmlFor="marketplace-search" className="block text-sm font-bold text-[var(--rhc-heading)]">
                Search services
                <span className="relative mt-2 block">
                  <MeridianIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--rhc-muted)]" />
                  <input
                    id="marketplace-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onInput={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search property, records, utility, resident…"
                    className="w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] py-3 pl-11 pr-4 text-[var(--rhc-input-text)] outline-none"
                  />
                </span>
              </label>

              <label htmlFor="marketplace-availability" className="block text-sm font-bold text-[var(--rhc-heading)]">
                Availability
                <select
                  id="marketplace-availability"
                  aria-label="Availability"
                  value={readiness}
                  onChange={(event) => setReadiness(event.target.value as 'all' | 'demo' | 'planned')}
                  onInput={(event) => setReadiness(event.currentTarget.value as 'all' | 'demo' | 'planned')}
                  className="mt-2 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)] outline-none"
                >
                  <option value="all">All stages</option>
                  <option value="demo">Available demonstrations</option>
                  <option value="planned">Planned concepts</option>
                </select>
              </label>

              <Web3Button variant="secondary" onClick={clearFilters}>Clear filters</Web3Button>
            </div>

            <fieldset className="mt-5 border-t border-[var(--rhc-border)] pt-5">
              <legend className="sr-only">Filter services by category</legend>
              <div className="flex flex-wrap gap-2">
                {MARKETPLACE_CATEGORIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={category === item.key}
                    onClick={() => setCategory(item.key)}
                    className={`rounded-full border px-3.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--rhc-primary)] ${
                      category === item.key
                        ? 'border-[rgba(212,175,55,.5)] bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]'
                        : 'border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] text-[var(--rhc-secondary-text)] hover:text-[var(--rhc-heading)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p role="status" aria-live="polite" data-testid="marketplace-result-count" className="text-sm text-[var(--rhc-muted)]">
              Showing <span className="font-bold text-[var(--rhc-heading)]">{results.length}</span> {results.length === 1 ? 'service' : 'services'}
            </p>
            <p className="text-xs text-[var(--rhc-muted)]">Public directory · No transaction is created by browsing</p>
          </div>

          {results.length ? (
            <section aria-label="Marketplace service results" className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {results.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </section>
          ) : (
            <div className="mt-4" data-testid="marketplace-empty-state">
              <EmptyState title="No matching services" description="Try another search, category, or availability stage." />
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-[var(--rhc-border)] bg-[var(--rhc-bg-secondary)] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="A deliberate boundary"
            title="Discovery is not a transaction"
            description="RHC can explain what a service is, who may provide it, and what context it could use without pretending that unfinished financial or operational integrations are available."
            align="center"
          />
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 text-center">
              <MeridianIcon name="search" className="mx-auto h-7 w-7 text-[var(--rhc-primary)]" />
              <h2 className="mt-4 font-bold text-[var(--rhc-heading)]">Browse openly</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">Compare service purpose and readiness without signing in.</p>
            </div>
            <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 text-center">
              <MeridianIcon name="lock" className="mx-auto h-7 w-7 text-[var(--rhc-primary)]" />
              <h2 className="mt-4 font-bold text-[var(--rhc-heading)]">Continue securely</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">Authorized customer context stays inside the authenticated portal.</p>
            </div>
            <div className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 text-center">
              <MeridianIcon name="shield" className="mx-auto h-7 w-7 text-[var(--rhc-primary)]" />
              <h2 className="mt-4 font-bold text-[var(--rhc-heading)]">Know the status</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--rhc-muted)]">Planned concepts never masquerade as working integrations.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-16 md:px-8 md:pt-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center rounded-2xl border border-[rgba(212,175,55,.35)] bg-[linear-gradient(135deg,var(--rhc-surface),var(--rhc-surface-secondary))] p-7 text-center shadow-sm md:p-10">
          <Badge tone="gold">Customer portal</Badge>
          <h2 className="mt-5 text-3xl font-extrabold text-[var(--rhc-heading)] md:text-4xl">Have an RHC customer relationship?</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--rhc-secondary-text)]">Sign in to view only the demonstration records and services authorized for your account.</p>
          <div className="mt-7">
            <Web3Button href="/login">
              Request service guidance
              <MeridianIcon name="arrow" className="h-4 w-4" />
            </Web3Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function ServiceCard({ service }: { service: MarketplaceService }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] p-5 shadow-sm transition hover:-translate-y-1 hover:border-[rgba(212,175,55,.42)]">
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-[rgba(212,175,55,.3)] bg-[var(--rhc-accent-soft)] text-[var(--rhc-primary)]">
          <MeridianIcon name={service.icon} className="h-6 w-6" />
        </span>
        <StageBadge stage={service.stage} label={service.stageLabel} />
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--rhc-muted)]">{service.provider} · {service.categoryLabel}</p>
      <h2 className="mt-2 text-xl font-extrabold text-[var(--rhc-heading)]">{service.title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--rhc-muted)]">{service.description}</p>

      <div className="mt-5 rounded-xl border border-dashed border-[rgba(212,175,55,.35)] bg-[var(--rhc-accent-soft)] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--rhc-primary)]">Connection</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rhc-heading)]">{service.connection}</p>
      </div>

      <div className="mt-auto pt-5">
        <p className="border-t border-[var(--rhc-border)] pt-4 text-xs leading-5 text-[var(--rhc-muted)]">{service.access}</p>
        {service.href && service.actionLabel ? (
          <div className="mt-4">
            <Web3Button href={service.href} variant="secondary" className="w-full">{service.actionLabel}</Web3Button>
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--rhc-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--rhc-muted)]" />
            Information only
          </p>
        )}
      </div>
    </article>
  );
}
