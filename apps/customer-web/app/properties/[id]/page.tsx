'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, Badge, Card, EmptyState, ResourceStatus, Web3Button, errorMessage, useResource, useRuntime } from '@rhc/ui';
import { navFor } from '../../web3-nav';
import type { Property, PropertyLink } from '../../components/customer-data';

type InventoryProperty = Property & { metadata?: Record<string, unknown>; project?: { id?: string; project_code?: string; project_name?: string; company?: { company_code?: string; display_name: string } } };
function value(value: unknown) { return value == null || value === '' ? 'Not provided' : String(value); }
function statusTone(status?: string) { if (status === 'AVAILABLE') return 'success' as const; if (status === 'BLOCKED' || status === 'SOLD') return 'danger' as const; if (status === 'HELD' || status === 'RESERVED' || status === 'CONTRACTED') return 'warning' as const; return 'neutral' as const; }

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const property = useResource<InventoryProperty>(`/properties/${encodeURIComponent(id)}`);
  const linkedProperties = useResource<PropertyLink[]>('/me/properties');
  const { request, dataMode } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const linkedRecord = linkedProperties.data?.find((link) => link.property.id === id)?.property;
  const record = property.data || (linkedRecord as InventoryProperty | undefined);
  const recordLoading = !record && (property.loading || linkedProperties.loading);
  const recordError = !record && property.error && linkedProperties.error
    ? `${property.error} Linked-property access also failed: ${linkedProperties.error}`
    : undefined;
  const reservable = record?.status === 'AVAILABLE';

  async function reserve() {
    if (!record || !reservable || busy) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const reservation = await request<{ id: string; reservation_number: string }>('/me/reservations', { method: 'POST', body: JSON.stringify({ property_id: record.id }) });
      setMessage(`Reservation ${reservation.reservation_number} created. This property is now temporarily held.`);
      property.reload();
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  async function copyCode() { if (!record?.property_code || !navigator.clipboard) return; await navigator.clipboard.writeText(record.property_code); setMessage('Property code copied.'); }

  return (
    <AppShell title="Property Details" navItems={navFor('Properties')}>
      <ResourceStatus
        loading={recordLoading}
        error={recordError}
        reload={() => {
          property.reload();
          linkedProperties.reload();
        }}
      />
      {record ? (
        <div className="grid gap-5">
          <section className="overflow-hidden rounded-3xl border border-[var(--rhc-border)] bg-[var(--rhc-surface)] shadow-sm">
            <div className="relative min-h-72 bg-[linear-gradient(135deg,var(--rhc-surface-secondary),var(--rhc-accent-soft))] p-6 md:p-8">
              <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(var(--rhc-border)_1px,transparent_1px),linear-gradient(90deg,var(--rhc-border)_1px,transparent_1px)] [background-size:36px_36px]" />
              <div className="relative flex min-h-56 flex-col justify-between">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge tone={statusTone(record.status)}>{record.status}</Badge>
                    <h2 className="mt-5 max-w-3xl text-4xl font-black text-[var(--rhc-heading)] md:text-6xl">{record.property_code}</h2>
                    <p className="mt-3 text-base text-[var(--rhc-secondary-text)]">{record.project?.project_name || 'Project'} · {value(record.metadata?.unit_type || record.asset_type)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2"><Web3Button href="/properties" variant="secondary">Back to inventory</Web3Button><Web3Button variant="secondary" onClick={copyCode}>Copy code</Web3Button></div>
                </div>
                <p className="mt-8 max-w-2xl text-sm leading-6 text-[var(--rhc-muted)]">{dataMode === 'demo' ? 'Illustrative property record for the local demo.' : 'Permission-scoped property record returned by the connected API.'} Legal ownership, official contracts, payments, and title records remain in authorized RHC business systems.</p>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <Card title="Property Specifications">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ['Asset type', record.asset_type], ['Project', record.project?.project_name], ['Company', record.project?.company?.display_name], ['Building / Phase', record.tower], ['Floor', record.floor], ['Unit', record.unit_number], ['Area', record.area], [dataMode === 'demo' ? 'Demo list price' : 'List price', record.list_price == null ? undefined : `${record.currency || 'PHP'} ${Number(record.list_price).toLocaleString()}`], ['Data mode', dataMode === 'demo' ? 'Synthetic demo record' : 'Connected API record'],
                ].map(([label, item]) => <div key={label} className="rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-sm text-[var(--rhc-muted)]">{label}</p><p className="mt-1 font-bold text-[var(--rhc-heading)]">{value(item)}</p></div>)}
              </div>
            </Card>

            <Card className="rhc-card-token" title="Reservation Request">
              <p className="text-sm leading-6 text-[var(--rhc-muted)]">The backend validates availability, blocks duplicate active reservations, creates a reservation record, and holds the property when successful.</p>
              <div className="mt-5 rounded-2xl border border-[var(--rhc-border)] bg-[var(--rhc-surface-secondary)] p-4"><p className="text-sm text-[var(--rhc-muted)]">Current availability</p><p className="mt-1 text-xl font-black text-[var(--rhc-heading)]">{reservable ? 'Available for demo reservation' : 'Not available for reservation'}</p></div>
              <div className="mt-5 flex flex-wrap gap-3"><Web3Button disabled={!reservable || busy} onClick={reserve}>{busy ? 'Creating…' : 'Reserve demo unit'}</Web3Button><Web3Button href="/reservations" variant="secondary">View reservations</Web3Button></div>
              {!reservable && <p className="mt-3 text-sm text-[var(--rhc-muted)]">Only AVAILABLE properties can enter the reservation workflow.</p>}
              {message && <p role="status" className="mt-4 rounded-xl border border-[rgba(34,197,94,.35)] bg-[rgba(34,197,94,.1)] p-3 text-sm">{message}</p>}
              {error && <p role="alert" className="mt-4 rounded-xl border border-[rgba(239,68,68,.35)] bg-[rgba(239,68,68,.1)] p-3 text-sm">{error}</p>}
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            {[
              ['Reservation', reservable ? 'Available' : 'Unavailable', 'Creates a temporary business hold after backend confirmation.'],
              ['Payments', 'Recorded separately', 'Payment records are business entries, not a payment processor.'],
              ['Future Web3', 'Not activated', 'No tokenized ownership, wallet custody, or blockchain settlement is active.'],
            ].map(([title, state, detail]) => <Card key={title} title={title}><Badge tone={state === 'Available' ? 'success' : state === 'Not activated' ? 'warning' : 'info'}>{state}</Badge><p className="mt-4 text-sm leading-6 text-[var(--rhc-muted)]">{detail}</p></Card>)}
          </section>
        </div>
      ) : !recordLoading && !recordError ? <EmptyState title="Property not found" description="This property is unavailable or you do not have access." /> : null}
    </AppShell>
  );
}
