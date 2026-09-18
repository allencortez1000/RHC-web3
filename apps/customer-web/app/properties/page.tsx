'use client';

import { useMemo, useState } from 'react';
import { AppShell, Badge, Card, EmptyState, PropertyAssetCard, ResourceStatus, Web3Button, useResource } from '@rhc/ui';
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

export default function Page() {
  const inventory = useResource<InventoryProperty[]>('/properties?take=200');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [assetType, setAssetType] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (inventory.data || []).filter((property) => {
      const haystack = [property.property_code, property.unit_number, property.tower, property.floor, property.project?.project_name, property.project?.project_code, String(property.metadata?.unit_type || '')].filter(Boolean).join(' ').toLowerCase();
      return (!needle || haystack.includes(needle)) && (!status || property.status === status) && (!assetType || property.asset_type === assetType);
    });
  }, [assetType, inventory.data, query, status]);
  const availableCount = filtered.filter((property) => property.status === 'AVAILABLE').length;

  return (
    <AppShell title="Property Inventory" navItems={navFor('Properties')}>
      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card title="Browse Amica Properties">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">
            Search active Month 1 demo inventory from the API. Only AVAILABLE units can enter the
            reservation workflow; blocked, sold, contracted, and held units are visible for transparency.
          </p>
          <ResourceStatus {...inventory} />
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
            <label className="text-sm font-semibold">
              Search inventory
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 w-full rounded-lg border p-3" placeholder="Property code, project, building, unit" />
            </label>
            <label className="text-sm font-semibold">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-lg border p-3">
                <option value="">All statuses</option>
                {['AVAILABLE', 'HELD', 'RESERVED', 'CONTRACTED', 'SOLD', 'BLOCKED'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Type
              <select value={assetType} onChange={(event) => setAssetType(event.target.value)} className="mt-2 w-full rounded-lg border p-3">
                <option value="">All types</option>
                {['RESIDENTIAL', 'COMMERCIAL', 'PARKING'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <Web3Button variant="secondary" onClick={() => { setQuery(''); setStatus(''); setAssetType(''); }}>Reset</Web3Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--rhc-muted)]">
            <Badge tone="gold">{filtered.length} matching</Badge>
            <Badge tone="success">{availableCount} available</Badge>
          </div>
        </Card>

        <Card title="Property Access Summary">
          <p className="text-sm leading-6 text-[var(--rhc-muted)]">
            Legal ownership records remain in RHC business systems. Month 1 property browsing and
            reservations are off-chain business workflows; tokenized ownership is not active.
          </p>
          <div className="mt-5">
            <Web3Button href="/reservations" variant="secondary">View reservations</Web3Button>
          </div>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {inventory.data && (filtered.length ? filtered.map((property) => (
          <PropertyAssetCard
            key={property.id}
            name={property.property_code}
            status={property.status}
            description={`${String(property.metadata?.unit_type || property.asset_type)} · ${property.project?.project_name || 'Project'} · ${price(property)}`}
            href={`/properties/${encodeURIComponent(property.id)}`}
          />
        )) : <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No matching properties" description="Try a different search, status, or property type filter." /></div>)}
      </section>

      <section className="mt-5">
        <Card title="My Linked Property Access">
          <LinkedProperties />
        </Card>
      </section>
    </AppShell>
  );
}
