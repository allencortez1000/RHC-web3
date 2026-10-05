'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell, Badge, Card, EmptyState, MetricCard, ResourceStatus, Web3Button, errorMessage, useResource, useRuntime } from '@rhc/ui';
import { LinkedProperties, type Property } from '../components/customer-data';
import { navFor } from '../web3-nav';

type InventoryProperty = Property & {
  metadata?: Record<string, unknown>;
  project?: { id?: string; project_code?: string; project_name?: string; company?: { company_code?: string; display_name: string } };
};

function price(property: InventoryProperty) {
  if (property.list_price == null) return 'Price on request';
  const value = Number(property.list_price);
  return `${property.currency || 'PHP'} ${Number.isFinite(value) ? value.toLocaleString() : property.list_price}`;
}

function tone(status?: string) {
  if (status === 'AVAILABLE') return 'success' as const;
  if (status === 'HELD' || status === 'RESERVED' || status === 'CONTRACTED') return 'warning' as const;
  if (status === 'BLOCKED' || status === 'SOLD') return 'danger' as const;
  return 'neutral' as const;
}

export default function Page() {
  const inventory = useResource<InventoryProperty[]>('/properties?take=200');
  const saved = useResource<Array<{ id: string; property_id: string }>>('/me/saved-properties');
  const { request, dataMode } = useRuntime();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [assetType, setAssetType] = useState(() => searchParams.get('type') || '');
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'code');
  const [savingId, setSavingId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const savedIds = useMemo(() => new Set(saved.data?.map((item) => item.property_id) || []), [saved.data]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (query.trim()) next.set('q', query.trim());
      if (status) next.set('status', status);
      if (assetType) next.set('type', assetType);
      if (sort !== 'code') next.set('sort', sort);
      router.replace(`/properties${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [assetType, query, router, sort, status]);

  async function toggleSaved(property: InventoryProperty) {
    if (savingId || dataMode !== 'demo') return;
    const isSaved = savedIds.has(property.id);
    setSavingId(property.id);
    setActionError('');
    setActionMessage('');
    try {
      await request(`/me/saved-properties/${encodeURIComponent(property.id)}`, {
        method: isSaved ? 'DELETE' : 'POST',
        body: JSON.stringify({}),
      });
      setActionMessage(`${property.property_code} ${isSaved ? 'removed from' : 'added to'} saved properties.`);
      saved.reload();
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSavingId('');
    }
  }
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...(inventory.data || [])]
      .filter((property) => {
        const haystack = [property.property_code, property.unit_number, property.tower, property.floor, property.project?.project_name, property.project?.project_code, String(property.metadata?.unit_type || '')].filter(Boolean).join(' ').toLowerCase();
        return (!needle || haystack.includes(needle)) && (!status || property.status === status) && (!assetType || property.asset_type === assetType);
      })
      .sort((a, b) => {
        if (sort === 'price') return Number(a.list_price || 0) - Number(b.list_price || 0);
        if (sort === 'area') return Number(b.area || 0) - Number(a.area || 0);
        if (sort === 'status') return String(a.status).localeCompare(String(b.status));
        return String(a.property_code).localeCompare(String(b.property_code));
      });
  }, [assetType, inventory.data, query, sort, status]);
  const availableCount = filtered.filter((property) => property.status === 'AVAILABLE').length;
  const reservedCount = filtered.filter((property) => ['HELD', 'RESERVED', 'CONTRACTED'].includes(property.status || '')).length;

  return (
    <AppShell title="Explore Properties" navItems={navFor('Properties')}>
      <section className="rhc-card-token rounded-3xl border border-[rgba(212,175,55,.24)] p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <Badge tone="gold">RHC Property Ecosystem</Badge>
            <h2 className="rhc-page-title mt-5 max-w-4xl">{dataMode === 'demo' ? 'Explore Amica demo inventory' : 'Explore Amica inventory'}</h2>
            <p className="rhc-body-copy mt-4 max-w-3xl">{dataMode === 'demo' ? 'Browse fictional property records from the RHC demo inventory.' : 'Browse available property records returned by the connected API.'} Reservations remain off-chain business workflows and do not represent legal ownership or tokenized assets.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard label="Matching records" value={String(filtered.length)} detail="Loaded inventory" icon="INV" />
            <MetricCard label="Available units" value={String(availableCount)} detail={`${reservedCount} held/reserved/contracted`} icon="AV" />
          </div>
        </div>
      </section>

      <Card className="mt-5" title="Search and Filter">
        <ResourceStatus {...inventory} />
        <div className="grid gap-3 md:grid-cols-[1fr_repeat(4,auto)] md:items-end">
          <label className="text-sm font-semibold text-[var(--rhc-heading)]">Search inventory
            <input aria-label="Search property inventory" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)]" placeholder="Property code, project, building, unit" />
          </label>
          <label className="text-sm font-semibold text-[var(--rhc-heading)]">Status
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)]">
              <option value="">All statuses</option>
              {['AVAILABLE', 'HELD', 'RESERVED', 'CONTRACTED', 'SOLD', 'BLOCKED'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-[var(--rhc-heading)]">Type
            <select value={assetType} onChange={(event) => setAssetType(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)]">
              <option value="">All types</option>
              {['RESIDENTIAL', 'COMMERCIAL', 'PARKING'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-[var(--rhc-heading)]">Sort
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--rhc-border)] bg-[var(--rhc-input)] p-3 text-[var(--rhc-input-text)]">
              <option value="code">Property code</option>
              <option value="price">Price</option>
              <option value="area">Area</option>
              <option value="status">Status</option>
            </select>
          </label>
          <Web3Button variant="secondary" onClick={() => { setQuery(''); setStatus(''); setAssetType(''); setSort('code'); }}>Reset</Web3Button>
        </div>
      </Card>

      {actionMessage ? <p role="status" className="mt-5 rounded-xl border border-[var(--rhc-success)] p-3 text-sm">{actionMessage}</p> : null}
      {actionError ? <p role="alert" className="mt-5 rounded-xl border border-[var(--rhc-danger)] p-3 text-sm">{actionError}</p> : null}

      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {inventory.data && (filtered.length ? filtered.map((property) => (
          <article key={property.id} className="group overflow-hidden rounded-3xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] shadow-sm transition hover:-translate-y-1 hover:border-[rgba(212,175,55,.42)]">
            <div className="relative h-36 bg-[linear-gradient(135deg,var(--rhc-surface-secondary),var(--rhc-accent-soft))]">
              <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(var(--rhc-border)_1px,transparent_1px),linear-gradient(90deg,var(--rhc-border)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="absolute left-4 top-4"><Badge tone={tone(property.status)}>{property.status}</Badge></div>
              <p className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--rhc-primary)]">Illustrative — not actual project imagery</p>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-black text-[var(--rhc-heading)]">{property.property_code}</h3>
              <p className="mt-1 text-sm text-[var(--rhc-muted)]">{property.project?.project_name || 'Project'} · {String(property.metadata?.unit_type || property.asset_type)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-[var(--rhc-border)] p-3"><p className="text-[var(--rhc-muted)]">Area</p><p className="font-bold text-[var(--rhc-heading)]">{property.area || '—'}</p></div>
                <div className="rounded-xl border border-[var(--rhc-border)] p-3"><p className="text-[var(--rhc-muted)]">{dataMode === 'demo' ? 'Demo price' : 'List price'}</p><p className="font-bold text-[var(--rhc-heading)]">{price(property)}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3"><Web3Button href={`/properties/${encodeURIComponent(property.id)}`}>View property</Web3Button><Web3Button disabled={dataMode !== 'demo' || Boolean(savingId)} variant="secondary" onClick={() => void toggleSaved(property)}>{dataMode !== 'demo' ? 'Saving unavailable in API mode' : savingId === property.id ? 'Updating…' : savedIds.has(property.id) ? 'Saved ✓' : 'Save property'}</Web3Button>{property.status !== 'AVAILABLE' && <Web3Button disabled variant="secondary">Reservation unavailable</Web3Button>}</div>
            </div>
          </article>
        )) : <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No matching properties" description="Try a different search, status, or property type filter." /></div>)}
      </section>

      <section className="mt-5"><Card title="My Linked Property Access"><LinkedProperties /></Card></section>
    </AppShell>
  );
}
